import type { ClientSession, Model, Types } from "mongoose";
import type {
  IOrder,
  IOrderItem,
  OrderDocument,
  PaymentType,
} from "../../../DB/model/Order.Model.js";
import type { ICartItem } from "../../../DB/model/Cart.Model.js";
import type { CouponDocument } from "../../../DB/model/Coupon.Model.js";
import type { UserDocument } from "../../../DB/model/User.model.js";
import { AppError } from "../../core/AppError.js";
import { BaseService } from "../../core/BaseService.js";
import type { CheckoutSession, PaymentEvent } from "../../core/contracts.js";
import type { Id } from "../../types/common.js";
import type { CartService } from "../cart/cart.service.js";
import type { CouponService } from "../coupon/coupon.service.js";
import type { ProductService } from "../product/product.service.js";
import type { CheckoutService } from "./checkout.service.js";

export interface CreateOrderInput {
  address: string;
  phone: string[];
  couponName?: string;
  note?: string;
  paymentType: PaymentType;
}

export interface CreateOrderResult {
  order: OrderDocument;
  session?: CheckoutSession;
  // True when an earlier request with the same idempotency key already created the order
  replayed: boolean;
}

const isDuplicateKeyError = (err: unknown) =>
  (err as { code?: number } | null)?.code === 11000;

export type WebhookOutcome = "placed" | "rejected" | "ignored";

type CartItemDocument = Types.Subdocument & ICartItem;

export interface OrderServiceDeps {
  model: Model<IOrder>;
  carts: CartService;
  coupons: CouponService;
  products: ProductService;
  checkout: CheckoutService;
}

// Orders own their collection only; stock, coupons and carts change through their own services
export class OrderService extends BaseService<IOrder> {
  private readonly carts: CartService;
  private readonly coupons: CouponService;
  private readonly products: ProductService;
  private readonly checkout: CheckoutService;

  constructor({ model, carts, coupons, products, checkout }: OrderServiceDeps) {
    super(model);
    this.carts = carts;
    this.coupons = coupons;
    this.products = products;
    this.checkout = checkout;
  }

  async #priceCartItems(
    cartItems: CartItemDocument[]
  ): Promise<{ items: IOrderItem[]; subtotal: number }> {
    const items: IOrderItem[] = [];
    let subtotal = 0;
    for (const cartItem of cartItems) {
      const product = await this.products.findPurchasable(cartItem.productId, cartItem.quantity);
      const item: IOrderItem = {
        ...(cartItem.toObject() as ICartItem),
        name: product.name,
        unitPrice: product.finalPrice,
        finalPrice: product.finalPrice * cartItem.quantity,
      };
      items.push(item);
      subtotal += item.finalPrice;
    }
    return { items, subtotal };
  }

  // Gives back what an unfinished order took: its stock and the user's coupon use
  async #releaseResources(order: OrderDocument, session: ClientSession): Promise<void> {
    await this.products.releaseStock(order.products, session);
    if (order.couponId) {
      await this.coupons.setUsage(order.couponId, order.userId, false, session);
    }
  }

  #replay(order: OrderDocument): CreateOrderResult {
    return { order, session: order.checkoutSession ?? undefined, replayed: true };
  }

  async create(
    user: UserDocument,
    { address, phone, couponName, note, paymentType }: CreateOrderInput,
    baseUrl: string,
    idempotencyKey?: string
  ): Promise<CreateOrderResult> {
    const userId = user._id;

    // Checked before the cart, which the first request already emptied
    if (idempotencyKey) {
      const existing = await this.model.findOne({ userId, idempotencyKey });
      if (existing) return this.#replay(existing);
    }

    const cart = await this.carts.getByUser(userId);
    if (!cart || !cart.products?.length) {
      throw new AppError("Empty Cart", 400);
    }

    const coupon: CouponDocument | undefined = await this.coupons.findValid(couponName);
    const { items, subtotal } = await this.#priceCartItems(cart.products);
    const finalPrice = coupon
      ? subtotal - (subtotal * coupon.amount) / 100
      : subtotal;

    // All writes succeed together or none do
    let order: OrderDocument;
    try {
      order = await this.transaction(async (session) => {
        await this.products.reserveStock(items, session);
        const [created] = await this.model.create(
          [
            {
              userId,
              address,
              note,
              phone,
              products: items,
              couponId: coupon?._id,
              subtotal,
              finalPrice,
              paymentType,
              status: paymentType === "card" ? "waitPayment" : "placed",
              idempotencyKey,
            },
          ],
          { session }
        );
        if (coupon) {
          await this.coupons.setUsage(coupon._id, userId, true, session);
        }
        await this.carts.pullProducts(
          userId,
          items.map((item) => item.productId),
          session
        );
        return created;
      });
    } catch (err) {
      // A concurrent request with the same key won the race; its transaction committed, ours rolled back
      if (idempotencyKey && isDuplicateKeyError(err)) {
        const existing = await this.model.findOne({ userId, idempotencyKey });
        if (existing) return this.#replay(existing);
      }
      throw err;
    }

    if (order.paymentType !== "card") {
      return { order, replayed: false };
    }

    try {
      const session = await this.checkout.createSession(order, coupon, user.email, baseUrl);
      // Stored so a retried request can hand back the same payment link
      await this.model.updateOne({ _id: order._id }, { checkoutSession: session });
      order.checkoutSession = session;
      return { order, session, replayed: false };
    } catch {
      // The order can never be paid, so undo it rather than leave stock reserved
      await this.transaction(async (session) => {
        await this.model.updateOne({ _id: order._id }, { status: "rejected" }, { session });
        await this.#releaseResources(order, session);
      });
      throw new AppError("Payment session creation failed", 502);
    }
  }

  async applyPaymentEvent(event: PaymentEvent): Promise<WebhookOutcome> {
    if (event.type === "ignored") return "ignored";

    if (event.type === "paid") {
      await this.model.updateOne(
        { _id: event.orderId, status: "waitPayment" },
        { status: "placed" }
      );
      return "placed";
    }

    await this.transaction(async (session) => {
      // Only an order still waiting for payment is rejected, so a replayed event is a no-op
      const order = await this.model.findOneAndUpdate(
        { _id: event.orderId, status: "waitPayment" },
        { status: "rejected" },
        { session }
      );
      if (order) await this.#releaseResources(order, session);
    });
    return "rejected";
  }

  async cancel(orderId: Id, userId: Types.ObjectId, reason: string): Promise<OrderDocument> {
    const order = await this.findOrFail(
      { _id: orderId, userId },
      "In-Valid OrderId",
      400
    );
    if (
      (order.status != "placed" && order.paymentType == "cash") ||
      (order.status != "waitPayment" && order.paymentType == "card")
    ) {
      throw new AppError(
        `Cannot cancel your order after it been changed to ${order.status}`,
        400
      );
    }

    await this.transaction(async (session) => {
      // Matching on the status read above stops a concurrent cancel from releasing stock twice
      const { modifiedCount } = await this.model.updateOne(
        { _id: orderId, userId, status: order.status },
        { status: "canceled", updatedBy: userId, reason },
        { session }
      );
      if (!modifiedCount) {
        throw new AppError("Order status changed, please retry", 409);
      }
      await this.#releaseResources(order, session);
    });
    return order;
  }

  async markDelivered(orderId: Id, userId: Types.ObjectId): Promise<OrderDocument | null> {
    const order = await this.findOrFail({ _id: orderId }, "Invalid order", 400);
    if (
      ["waitPayment", "canceled", "rejected", "delivered"].includes(order.status)
    ) {
      throw new AppError(
        "Cannot update your order after it has been changed",
        400
      );
    }
    return this.model.findByIdAndUpdate(
      orderId,
      { status: "delivered", updatedBy: userId },
      { new: true }
    );
  }

  // Used by reviews: a user may only review what was delivered to them
  async hasDelivered(userId: Types.ObjectId, productId: Id) {
    return this.model.findOne({
      userId,
      "products.productId": productId,
      status: "delivered",
    });
  }
}

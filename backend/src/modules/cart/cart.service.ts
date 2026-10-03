import type { ClientSession, Model, Types } from "mongoose";
import type { CartDocument, ICart } from "../../db/models/Cart.Model.js";
import { AppError } from "../../core/AppError.js";
import { BaseService } from "../../core/BaseService.js";
import type { Id } from "../../types/common.js";
import type { ProductService } from "../product/product.service.js";

export interface AddToCartInput {
  productId: string;
  quantity: number;
}

export interface AddToCartResult {
  created: boolean;
  cart: CartDocument;
}

const isDuplicateKeyError = (err: unknown) =>
  (err as { code?: number } | null)?.code === 11000;

export class CartService extends BaseService<ICart> {
  constructor(
    model: Model<ICart>,
    private readonly products: ProductService
  ) {
    super(model);
  }

  getByUser(userId: Types.ObjectId) {
    return this.model.findOne({ userId });
  }

  async addProduct(
    userId: Types.ObjectId,
    { productId, quantity }: AddToCartInput
  ): Promise<AddToCartResult> {
    await this.products.findPurchasable(productId, quantity);
    return this.#upsertItem(userId, productId, quantity, true);
  }

  // Atomic updates only, so concurrent adds can neither lose an item nor create a second cart
  async #upsertItem(
    userId: Types.ObjectId,
    productId: string,
    quantity: number,
    retryOnConflict: boolean
  ): Promise<AddToCartResult> {
    // Already in the cart: set its quantity
    const updated = await this.model.findOneAndUpdate(
      { userId, "products.productId": productId },
      { $set: { "products.$.quantity": quantity } },
      { new: true }
    );
    if (updated) return { created: false, cart: updated };

    // Not in the cart: append it, creating the cart if the user has none
    try {
      const result = await this.model.findOneAndUpdate(
        { userId, "products.productId": { $ne: productId } },
        { $push: { products: { productId, quantity } } },
        { new: true, upsert: true, rawResult: true }
      );
      return { created: Boolean(result.lastErrorObject?.upserted), cart: result.value! };
    } catch (err) {
      // A concurrent request added the same product (the upsert then hits the unique userId): retry as an update
      if (retryOnConflict && isDuplicateKeyError(err)) {
        return this.#upsertItem(userId, productId, quantity, false);
      }
      throw err;
    }
  }

  async removeProducts(userId: Types.ObjectId, productIds: string | string[]): Promise<CartDocument> {
    if (!productIds || !productIds.length) {
      throw new AppError("No product IDs provided", 400);
    }
    const cart = await this.model.findOneAndUpdate(
      { userId },
      { $pull: { products: { productId: { $in: productIds } } } },
      { new: true }
    );
    if (!cart) {
      throw new AppError("Cart not found", 404);
    }
    return cart;
  }

  // Used by checkout: drops ordered items inside the order's transaction
  async pullProducts(userId: Types.ObjectId, productIds: Id[], session?: ClientSession): Promise<void> {
    await this.model.updateOne(
      { userId },
      { $pull: { products: { productId: { $in: productIds } } } },
      { session }
    );
  }

  clear(userId: Types.ObjectId) {
    return this.model.findOneAndUpdate({ userId }, { products: [] }, { new: true });
  }
}

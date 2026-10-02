import type { ClientSession, Model, Types } from "mongoose";
import type { CartDocument, ICart } from "../../../DB/model/Cart.Model.js";
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

    const cart = await this.getByUser(userId);
    if (!cart) {
      const newCart = await this.model.create({
        userId,
        products: [{ productId, quantity }],
      });
      return { created: true, cart: newCart };
    }

    const item = cart.products.find((p) => p.productId.toString() == productId);
    if (item) {
      item.quantity = quantity;
    } else {
      cart.products.push({ productId, quantity });
    }
    await cart.save();
    return { created: false, cart };
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
      throw new AppError("Failed to update cart", 500);
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
    return this.model.updateOne({ userId }, { products: [] });
  }
}

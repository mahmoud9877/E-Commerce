import type { Model, Types } from "mongoose";
import type { IUser } from "../../db/models/User.model.js";
import type { ProductService } from "../product/product.service.js";

// Owns the user's wishlist; products are only read through ProductService
export class WishlistService {
  constructor(
    private readonly users: Model<IUser>,
    private readonly products: ProductService
  ) {}

  async add(userId: Types.ObjectId, productId: string): Promise<void> {
    await this.products.findActive(productId);
    await this.users.updateOne(
      { _id: userId },
      { $addToSet: { wishList: productId } }
    );
  }

  async list(userId: Types.ObjectId) {
    const user = await this.users.findById(userId).select("wishList");
    return this.products.findActiveMany(user?.wishList ?? []);
  }

  async remove(userId: Types.ObjectId, productId: string): Promise<void> {
    await this.users.updateOne(
      { _id: userId },
      { $pull: { wishList: productId } }
    );
  }
}

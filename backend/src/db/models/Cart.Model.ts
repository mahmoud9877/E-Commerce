import mongoose, { HydratedDocument, Model, Schema, Types, model } from "mongoose";

export interface ICartItem {
  productId: Types.ObjectId;
  quantity: number;
}

export interface ICart {
  userId: Types.ObjectId;
  products: Types.DocumentArray<ICartItem>;
}

export type CartDocument = HydratedDocument<ICart>;

const cartSchema = new Schema<ICart>(
  {
    // One cart per user; also makes concurrent first "add to cart" calls safe
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, unique: true },
    products: [
      {
        productId: { type: Schema.Types.ObjectId, ref: "Product", required: true },
        quantity: { type: Number, default: 1, required: true },
      },
    ],
  },
  {
    timestamps: true,
  }
);

const cartModel =
  (mongoose.models.Cart as Model<ICart> | undefined) ||
  model<ICart>("Cart", cartSchema);

export default cartModel;

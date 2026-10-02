import mongoose, { HydratedDocument, Model, Schema, Types, model } from "mongoose";

export interface ICartItem {
  productId: Types.ObjectId;
  quantity: number;
}

export interface ICart {
  userId: Types.ObjectId;
  products: Types.DocumentArray<ICartItem>;
  isDeleted: boolean;
}

export type CartDocument = HydratedDocument<ICart>;

const cartSchema = new Schema<ICart>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    products: [
      {
        productId: { type: Schema.Types.ObjectId, ref: "Product", required: true },
        quantity: { type: Number, default: 1, required: true },
      },
    ],
    isDeleted: { type: Boolean, default: false },
  },
  {
    timestamps: true,
  }
);

const cartModel =
  (mongoose.models.Cart as Model<ICart> | undefined) ||
  model<ICart>("Cart", cartSchema);

export default cartModel;

import mongoose, { model, Schema, Types } from "mongoose";

const cartSchema = new Schema(
  {
    userId: { type: Types.ObjectId, ref: "User", required: true },
    products: [
      {
        productId: { type: Types.ObjectId, ref: "Product", required: true },
        quantity: { type: Number, default: 1, required: true },
      },
    ],
    isDeleted: { type: Boolean, default: false },
  },
  {
    timestamps: true,
  }
);

const cartModel = mongoose.models.Cart || model("Cart", cartSchema);

export default cartModel;

import mongoose, { model, Schema, Types } from "mongoose";

const orderSchema = new Schema(
  {
    userId: { type: Types.ObjectId, ref: "User", required: true, unique: true },
    updatedBy: { type: Types.ObjectId, ref: "User" },
    address: { type: String, required: true },
    phone: { type: [String], required: true },
    note: { type: String },
    products: [
      {
        name: { type: String, required: true },
        productId: { type: Types.ObjectId, ref: "Product", required: true },
        quantity: { type: Number, required: true, default: 1 },
        unitPrice: { type: Number, required: true, default: 1 },
        finalPrice: { type: Number, required: true, default: 1 },
      },
    ],
    couponId: { type: Types.ObjectId, ref: "Coupon" },
    subtotal: { type: Number, required: true, default: 1 },
    finalPrice: { type: Number, required: true, default: 1 },
    paymentType: {
      type: String,
      default: "cash",
      enum: ["cash", "card"],
      required: true,
    },
    status: {
      type: String,
      default: "placed",
      enum: [
        "waitPayment",
        "placed",
        "canceled",
        "rejected",
        "onWay",
        "delivered",
      ],
    },
    reason: String,
    isDeleted: { type: Boolean, default: false },
  },
  {
    timestamps: true,
  }
);

const orderModel = mongoose.models.Order || model("Order", orderSchema);

export default orderModel;

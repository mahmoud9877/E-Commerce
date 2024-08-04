import mongoose, { model, Schema, Types } from "mongoose";

const reviewSchema = new Schema(
  {
    comment: {
      type: String,
      required: true,
      trim: true,
    },
    rating: { type: Number, min: 1, max: 5, required: true },
    createBy: { type: Types.ObjectId, ref: "User", required: true },
    productId: { type: Types.ObjectId, ref: "Product", required: true },
    orderId: { type: Types.ObjectId, ref: "Order", required: true },
    isDeleted: { type: Boolean, default: false },
  },
  {
    timestamps: true,
  }
);

const reviewModel = mongoose.models.Review || model("Review", reviewSchema);

export default reviewModel;

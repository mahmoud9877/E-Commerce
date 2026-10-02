import mongoose, { Model, Schema, Types, model } from "mongoose";

export interface IReview {
  comment: string;
  rating: number;
  createBy: Types.ObjectId;
  productId: Types.ObjectId;
  orderId: Types.ObjectId;
  isDeleted: boolean;
}

const reviewSchema = new Schema<IReview>(
  {
    comment: {
      type: String,
      required: true,
      trim: true,
    },
    rating: { type: Number, min: 1, max: 5, required: true },
    createBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    productId: { type: Schema.Types.ObjectId, ref: "Product", required: true },
    orderId: { type: Schema.Types.ObjectId, ref: "Order", required: true },
    isDeleted: { type: Boolean, default: false },
  },
  {
    timestamps: true,
  }
);

const reviewModel =
  (mongoose.models.Review as Model<IReview> | undefined) ||
  model<IReview>("Review", reviewSchema);

export default reviewModel;

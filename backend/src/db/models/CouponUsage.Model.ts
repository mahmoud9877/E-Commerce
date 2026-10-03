import mongoose, { Model, Schema, Types, model } from "mongoose";

// One row per (coupon, user): a user can apply each coupon once.
// A separate collection instead of an array on the coupon, so it never hits the document size limit.
export interface ICouponUsage {
  couponId: Types.ObjectId;
  userId: Types.ObjectId;
  orderId: Types.ObjectId;
}

const couponUsageSchema = new Schema<ICouponUsage>(
  {
    couponId: { type: Schema.Types.ObjectId, ref: "Coupon", required: true },
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    orderId: { type: Schema.Types.ObjectId, ref: "Order", required: true },
  },
  { timestamps: true }
);

couponUsageSchema.index({ couponId: 1, userId: 1 }, { unique: true });

const couponUsageModel =
  (mongoose.models.CouponUsage as Model<ICouponUsage> | undefined) ||
  model<ICouponUsage>("CouponUsage", couponUsageSchema);

export default couponUsageModel;

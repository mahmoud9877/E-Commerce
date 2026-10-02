import mongoose, { HydratedDocument, Model, Schema, Types, model } from "mongoose";
import type { ImageAsset } from "../../src/types/common.js";

export interface ICoupon {
  name: string;
  amount: number;
  image?: ImageAsset;
  expire: Date;
  usedBy: Types.ObjectId[];
  createBy?: Types.ObjectId;
  updateBy?: Types.ObjectId;
  isDeleted: boolean;
}

export type CouponDocument = HydratedDocument<ICoupon>;

const couponSchema = new Schema<ICoupon>(
  {
    name: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    amount: { type: Number, default: 1 },
    image: { type: Object },
    expire: { type: Date, required: true },
    usedBy: [{ type: Schema.Types.ObjectId, ref: "User" }],
    createBy: { type: Schema.Types.ObjectId, ref: "User", required: false },
    updateBy: { type: Schema.Types.ObjectId, ref: "User" },
    isDeleted: { type: Boolean, default: false },
  },
  {
    timestamps: true,
  }
);

const couponModel =
  (mongoose.models.Coupon as Model<ICoupon> | undefined) ||
  model<ICoupon>("Coupon", couponSchema);

export default couponModel;

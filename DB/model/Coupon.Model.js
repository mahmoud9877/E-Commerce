import mongoose, { model, Schema, Types } from "mongoose";

const couponSchema = new Schema(
  {
    name: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lower: true,
    },
    amount: { type: Number, default: 1 },
    image: { type: Object },
    expire: { type: Date, required: true },
    usedBy: [{ type: Types.ObjectId, ref: "User" }],
    createBy: { type: Types.ObjectId, ref: "User", required: false },
    updateBy: { type: Types.ObjectId, ref: "User" },
    isDeleted: { type: Boolean, default: false },
  },
  {
    timestamps: true,
  }
);

const couponModel = mongoose.models.Coupon || model("Coupon", couponSchema);

export default couponModel;

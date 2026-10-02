import mongoose, { Model, Schema, Types, model } from "mongoose";
import type { ImageAsset } from "../../src/types/common.js";

export interface IBrand {
  name: string;
  image?: ImageAsset;
  createBy: Types.ObjectId;
  updateBy?: Types.ObjectId;
  isDeleted: boolean;
}

const brandSchema = new Schema<IBrand>(
  {
    name: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    image: { type: Object, required: true },
    createBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    updateBy: { type: Schema.Types.ObjectId, ref: "User" },
    isDeleted: { type: Boolean, default: false },
  },
  {
    timestamps: true,
  }
);

const brandModel =
  (mongoose.models.Brand as Model<IBrand> | undefined) ||
  model<IBrand>("Brand", brandSchema);

export default brandModel;

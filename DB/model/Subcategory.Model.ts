import mongoose, { Model, Schema, Types, model } from "mongoose";
import type { ImageAsset } from "../../src/types/common.js";

export interface ISubcategory {
  name: string;
  slug: string;
  image: ImageAsset;
  categoryId: Types.ObjectId;
  createBy?: Types.ObjectId;
  updateBy?: Types.ObjectId;
  isDeleted: boolean;
}

const subcategorySchema = new Schema<ISubcategory>(
  {
    name: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    slug: { type: String, required: true },
    image: { type: Object, required: true },
    categoryId: {
      type: Schema.Types.ObjectId,
      ref: "Category",
      required: true,
    },
    createBy: { type: Schema.Types.ObjectId, ref: "User", required: false },
    updateBy: { type: Schema.Types.ObjectId, ref: "User" },
    isDeleted: { type: Boolean, default: false },
  },
  {
    timestamps: true,
  }
);

const subcategoryModel =
  (mongoose.models.Subcategory as Model<ISubcategory> | undefined) ||
  model<ISubcategory>("Subcategory", subcategorySchema);

export default subcategoryModel;

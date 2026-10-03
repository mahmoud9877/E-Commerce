import mongoose, { Model, Schema, Types, model } from "mongoose";
import type { ImageAsset } from "../../types/common.js";

export interface ISubcategory {
  name: string;
  slug: string;
  image: ImageAsset;
  categoryId: Types.ObjectId;
  createBy?: Types.ObjectId;
  updateBy?: Types.ObjectId;
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
  },
  {
    timestamps: true,
  }
);

subcategorySchema.index({ categoryId: 1 });

const subcategoryModel =
  (mongoose.models.Subcategory as Model<ISubcategory> | undefined) ||
  model<ISubcategory>("Subcategory", subcategorySchema);

export default subcategoryModel;

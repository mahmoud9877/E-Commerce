import mongoose, { Model, Schema, Types, model } from "mongoose";
import type { ImageAsset } from "../../src/types/common.js";

export interface ICategory {
  name: string;
  slug: string;
  image: ImageAsset;
  createBy?: Types.ObjectId | string;
  updateBy?: Types.ObjectId | string;
  isDeleted: boolean;
}

const categorySchema = new Schema<ICategory>(
  {
    name: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
    },
    slug: { type: String, required: true },
    image: { type: Object, required: true },
    createBy: { type: Schema.Types.ObjectId, ref: "User", required: false },
    updateBy: { type: Schema.Types.ObjectId, ref: "User", required: false },
    isDeleted: { type: Boolean, default: false },
  },
  {
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
    timestamps: true,
  }
);

categorySchema.virtual("subcategory", {
  localField: "_id",
  foreignField: "categoryId",
  ref: "Subcategory",
});

const categoryModel =
  (mongoose.models.Category as Model<ICategory> | undefined) ||
  model<ICategory>("Category", categorySchema);

export default categoryModel;

import mongoose, { Model, Schema, Types, model } from "mongoose";
import type { ImageAsset } from "../../types/common.js";

export interface IProduct {
  customId: string;
  name: string;
  slug: string;
  description?: string;
  size?: ("s" | "m" | "lg" | "xl")[];
  colors?: string[];
  stock: number;
  price: number;
  discount: number;
  finalPrice: number;
  mainImage: ImageAsset;
  subImages?: ImageAsset[];
  categoryId: Types.ObjectId;
  subcategoryId: Types.ObjectId;
  brandId: Types.ObjectId;
  createBy: Types.ObjectId;
  updateBy?: Types.ObjectId;
  isDeleted: boolean;
}

const productSchema = new Schema<IProduct>(
  {
    customId: { type: String, required: true },
    name: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
    },
    slug: { type: String, required: true, trim: true, lowercase: true },
    description: { type: String, trim: true },
    size: { type: [String], enum: ["s", "m", "lg", "xl"] },
    colors: [String],
    stock: { type: Number, required: true, default: 1 },
    price: { type: Number, required: true, default: 1 },
    discount: { type: Number, default: 0 },
    finalPrice: { type: Number, required: true, default: 1 },
    mainImage: { type: Object, required: true },
    subImages: { type: [Object] },
    categoryId: { type: Schema.Types.ObjectId, ref: "Category", required: true },
    subcategoryId: { type: Schema.Types.ObjectId, ref: "Subcategory", required: true },
    brandId: { type: Schema.Types.ObjectId, ref: "Brand", required: true },
    createBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    updateBy: { type: Schema.Types.ObjectId, ref: "User" },
    isDeleted: { type: Boolean, default: false },
  },
  {
    timestamps: true,
  }
);

// Serve the catalog filters and price sorting
productSchema.index({ categoryId: 1 });
productSchema.index({ subcategoryId: 1 });
productSchema.index({ brandId: 1 });
productSchema.index({ finalPrice: 1 });

const productModel =
  (mongoose.models.Product as Model<IProduct> | undefined) ||
  model<IProduct>("Product", productSchema);

export default productModel;

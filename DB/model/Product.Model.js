import mongoose, { model, Schema, Types } from "mongoose";

const productSchema = new Schema(
  {
    customId: { type: String, required: true },
    name: {
      type: String,
      required: true,
      trim: true,
      lowercase: true, // corrected option
    },
    slug: { type: String, required: true, trim: true, lowercase: true },
    description: { type: String, trim: true },

    size: { type: [String], enum: ["s", "m", "lg", "xl"] }, // corrected enum values

    colors: [String],
    stock: { type: Number, required: true, default: 1 },
    price: { type: Number, required: true, default: 1 },
    discount: { type: Number, default: 0 }, // ensure discount is not negative
    finalPrice: { type: Number, required: true, default: 1 },

    mainImage: { type: Object, required: true },
    subImages: { type: [Object] }, // ensure ObjectId is from Types
    categoryId: {
      type: Types.ObjectId,
      ref: "Category",
      required: true,
    },
    subcategoryId: {
      type: Types.ObjectId,
      ref: "Subcategory",
      required: true,
    },
    brandId: {
      type: Types.ObjectId,
      ref: "Brand",
      required: true,
    },
    wishUser: [{ type: Types.ObjectId, ref: "User" }],
    createBy: { type: Types.ObjectId, ref: "User", required: true },
    updateBy: { type: Types.ObjectId, ref: "User" },
    isDeleted: { type: Boolean, default: false },
  },
  {
    timestamps: true,
  }
);

const productModel = mongoose.models.Product || model("Product", productSchema);

export default productModel;

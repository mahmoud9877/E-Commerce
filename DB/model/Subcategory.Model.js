import mongoose, { model, Schema, Types } from "mongoose";

const subcategorySchema = new Schema(
  {
    name: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lower: true, // corrected option
    },
    slug: { type: String, required: true },
    image: { type: Object, required: true },
    categoryId: {
      type: Types.ObjectId,
      ref: "Category",
      trim: true,
      required: true,
    },
    createBy: { type: Types.ObjectId, ref: "User", required: false },
    updateBy: { type: Types.ObjectId, ref: "User" },
    isDeleted: { type: Boolean, default: false },
  },
  {
    timestamps: true,
  }
);

const subcategoryModel =
  mongoose.models.Subcategory || model("Subcategory", subcategorySchema);

export default subcategoryModel;

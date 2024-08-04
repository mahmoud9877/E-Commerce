import mongoose, { model, Schema, Types } from "mongoose";

const categorySchema = new Schema(
  {
    name: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true, // corrected to 'lowercase'
    },
    slug: { type: String, required: true },
    image: { type: Object, required: true }, // Ensure this is provided
    createBy: { type: Types.ObjectId, ref: "User", required: false },
    updateBy: { type: Types.ObjectId, ref: "User", required: false },
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
  mongoose.models.Category || model("Category", categorySchema);

export default categoryModel;

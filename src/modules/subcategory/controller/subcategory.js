import slugify from "slugify";
import cloudinary from "../../../utils/cloudinary.js";
import { asyncHandler } from "../../../utils/errorHandling.js";
import subcategoryModel from "../../../../DB/model/Subcategory.Model.js";
import categoryModel from "../../../../DB/model/Category.Model.js";

export const getSubcategories = asyncHandler(async (req, res, next) => {
  const subcategoryList = await subcategoryModel.find({
    isDeleted: false,
  });
  return res.status(201).json({ message: "Done", subcategoryList });
});

export const createSubcategory = asyncHandler(async (req, res, next) => {
  const { categoryId } = req.params;

  const category = await categoryModel.findById(categoryId);
  if (!category) {
    return res.status(400).json({ message: "Invalid category ID" });
  }
  const name = req.body.name.toLowerCase();
  if (await subcategoryModel.findOne({ name })) {
    return res.status(400).json({ message: "Duplicated subcategory name" });
  }
  if (!req.file) {
    return res.status(400).json({ message: "Image file is required" });
  }
  const { secure_url, public_id } = await cloudinary.uploader.upload(
    req.file.path,
    { folder: `${process.env.APP_NAME}/category/${categoryId}` }
  );
  const subcategory = await subcategoryModel.create({
    name,
    slug: slugify(name),
    image: { secure_url, public_id },
    categoryId,
  });
  return res
    .status(201)
    .json({ message: "Subcategory created successfully", subcategory });
});

export const updateSubcategory = asyncHandler(async (req, res, next) => {
  const { categoryId, subcategoryId } = req.params;

  // Find the subcategory
  const subcategory = await subcategoryModel.findOne({
    _id: subcategoryId,
    categoryId,
  });

  if (!subcategory) {
    return res.status(400).json({ message: "Invalid subcategory ID" });
  }

  // Handle name update
  if (req.body.name) {
    req.body.name = req.body.name.toLowerCase();

    if (req.body.name === subcategory.name) {
      return res
        .status(400)
        .json({ message: "Cannot update to the same subcategory name" });
    }

    if (await subcategoryModel.findOne({ name: req.body.name })) {
      return next(
        new Error(`Duplicated subcategory name ${req.body.name}`, {
          cause: 409,
        })
      );
    }

    req.body.slug = slugify(req.body.name);
  }

  // Handle image update
  if (req.file) {
    try {
      const { secure_url, public_id } = await cloudinary.uploader.upload(
        req.file.path,
        {
          folder: `${process.env.APP_NAME}/category/${categoryId}`,
        }
      );

      if (subcategory.image && subcategory.image.public_id) {
        await cloudinary.uploader.destroy(subcategory.image.public_id);
      }

      req.body.image = { secure_url, public_id };
    } catch (error) {
      return next(
        new Error("Error uploading or deleting image", { cause: 500 })
      );
    }
  }

  // Update the subcategory
  const updatedSubcategory = await subcategoryModel.findByIdAndUpdate(
    subcategoryId,
    req.body,
    { new: true }
  );

  if (!updatedSubcategory) {
    return res.status(400).json({ message: "Failed to update subcategory" });
  }

  return res.status(200).json({
    message: "Subcategory updated successfully",
    subcategory: updatedSubcategory,
  });
});

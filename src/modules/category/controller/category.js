import slugify from "slugify";
import categoryModel from "../../../../DB/model/Category.Model.js";
import cloudinary from "../../../utils/cloudinary.js";
import { asyncHandler } from "../../../utils/errorHandling.js";

export const getCategories = asyncHandler(async (req, res, next) => {
  const categoryList = await categoryModel
    .find({
      isDeleted: false,
    })
    .populate([{ path: "subcategory" }]);
  return res.status(201).json({ message: "Done", categoryList });
});

export const createCategory = asyncHandler(async (req, res, next) => {
  const name = req.body.name.toLowerCase();
  if (await categoryModel.findOne({ name })) {
    return next(new Error(`Duplicated category name ${name}`, { cause: 409 }));
  }

  if (!req.file) {
    return next(new Error("Image file is required", { cause: 400 }));
  }
  const { secure_url, public_id } = await cloudinary.uploader.upload(
    req.file.path,
    {
      folder: `${process.env.APP_NAME}/category`,
    }
  );

  const category = await categoryModel.create({
    name,
    slug: slugify(name),
    image: { secure_url, public_id },
    createBy: req.user._id, // Ensure this matches your schema field
  });

  return res.status(201).json({ message: "Done", category });
});

export const updateCategory = asyncHandler(async (req, res, next) => {
  const { categoryId } = req.params;
  const { name } = req.body;

  // Check if the category exists
  const category = await categoryModel.findById(categoryId);
  if (!category) {
    return res.status(400).json({ message: "Invalid Category Id" });
  }

  // Handle name change
  if (name) {
    req.body.name = name.toLowerCase();

    if (req.body.name === category.name) {
      return res
        .status(400)
        .json({ message: "Cannot update to the same category name" });
    }

    const duplicateCategory = await categoryModel.findOne({
      name: req.body.name,
    });
    if (duplicateCategory) {
      return next(
        new Error(`Duplicated category name ${req.body.name}`, { cause: 409 })
      );
    }

    category.slug = slugify(req.body.name);
    category.name = req.body.name;
  }

  // Handle image update
  if (req.file) {
    const { secure_url, public_id } = await cloudinary.uploader.upload(
      req.file.path,
      {
        folder: `${process.env.APP_NAME}/category`,
      }
    );

    if (category.image && category.image.public_id) {
      await cloudinary.uploader.destroy(category.image.public_id);
    }
    category.image = { secure_url, public_id };
  }
  category.updateBy = req.user.id;
  // Update category
  const updatedCategory = await categoryModel.findByIdAndUpdate(
    categoryId,
    category,
    { new: true }
  );
  await updatedCategory.save();

  // Send response
  return res.status(200).json({
    message: "Category updated successfully",
    updatedCategory,
  });
});

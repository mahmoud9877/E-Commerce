import { asyncHandler } from "../../../utils/errorHandling.js";
import {
  pushDataToExcel,
  updateExcelSheet,
} from "../../../utils/PushDataToExcel.js";
import subcategoryModel from "../../../../DB/model/Subcategory.Model.js";
import brandModel from "../../../../DB/model/Brand.Model.js";
import cloudinary from "../../../utils/cloudinary.js";
import productModel from "../../../../DB/model/Product.Model.js";
import slugify from "slugify";
import { nanoid } from "nanoid";
import userModel from "../../../../DB/model/User.model.js";
import ApiFeatures from "../../../utils/apiFeatures.js";

export const getProducts = asyncHandler(async (req, res, next) => {
  const apiFeature = new ApiFeatures(productModel.find(), req.query)
    .paginate()
    .filter()
    .sort()
    .select()
    .search();
  const productList = await apiFeature.mongooseQuery;
  return res.status(200).json({ message: "Done", productList });
});

export const createProduct = asyncHandler(async (req, res, next) => {
  const { name, price, discount, categoryId, subcategoryId, brandId } =
    req.body;

  // Check subcategory and category IDs
  const subcategory = await subcategoryModel.findOne({
    _id: subcategoryId,
    categoryId,
  });
  if (!subcategory) {
    return res.status(400).json({ message: "Invalid category or subcategory" });
  }

  // Check brand ID
  const brand = await brandModel.findById(brandId);
  if (!brand) {
    return res.status(400).json({ message: "Invalid brand" });
  }

  // Create slug
  req.body.slug = slugify(name, {
    replacement: "-",
    trim: true,
    lower: true,
  });

  // Calculate final price
  req.body.finalPrice = price - price * (discount / 100);
  req.body.customId = nanoid();

  // Upload main image
  const { secure_url, public_id } = await cloudinary.uploader.upload(
    req.files?.mainImage[0].path,
    {
      folder: `${process.env.APP_NAME}/product/${req.body.customId}`,
    }
  );
  req.body.mainImage = { secure_url, public_id };

  // Upload sub images if any
  if (req.files?.subImages?.length) {
    req.body.subImages = [];
    for (const file of req.files.subImages) {
      const { secure_url, public_id } = await cloudinary.uploader.upload(
        file.path,
        {
          folder: `${process.env.APP_NAME}/product/${req.body.customId}/subImages`,
        }
      );
      req.body.subImages.push({ secure_url, public_id });
    }
  }

  // Set createBy field
  req.body.createBy = req.user._id;

  return res
    .status(201)
    .json({ message: "Product created successfully", product });
});

export const updateProduct = asyncHandler(async (req, res, next) => {
  const { productId } = req.params;
  const product = await productModel.findById(productId);
  if (!product) {
    return res.status(404).json({ message: "Can Not find Product" });
  }
  const { name, price, discount, categoryId, subcategoryId, brandId } =
    req.body;

  // Check subcategory and category IDs
  if (!categoryId && subcategoryId) {
    if (!(await subcategoryModel.findOne({ _id: subcategoryId, categoryId }))) {
      return next(new Error("In-Valid category or subcategory"));
    }
  }
  if (brandId) {
    if (!(await brandModel.findById(brandId))) {
      return next(new Error("In-Valid brand"));
    }
  }

  if (name) {
    // Create slug
    req.body.slug = slugify(name, {
      replacement: "-",
      trim: true,
      lower: true,
    });
  }

  // Calculate final price
  if (price && discount) {
    req.body.finalPrice = price - price * (discount / 100);
  } else if (price) {
    req.body.finalPrice = price - price * (product.discount / 100);
  } else if (discount) {
    req.body.finalPrice = product.price - product.price * (discount / 100);
  }

  if (req.files?.mainImage?.length) {
    const { secure_url, public_id } = await cloudinary.uploader.upload(
      req.files?.mainImage[0].path,
      {
        folder: `${process.env.APP_NAME}/product/${req.body.customId}/mainImage`,
      }
    );
    req.body.mainImage = { secure_url, public_id };
    await cloudinary.uploader.destroy(product.mainImage.public_id);
  }

  // Upload sub images if any
  if (req.files?.subImages?.length) {
    req.body.subImages = [];
    for (const file of req.files.subImages) {
      const { secure_url, public_id } = await cloudinary.uploader.upload(
        file.path,
        {
          folder: `${process.env.APP_NAME}/product/${req.body.customId}/subImages`,
        }
      );
      req.body.subImages.push({ secure_url, public_id });
    }
  }
  // Set updateBy field
  req.body.updateBy = req.user._id;

  const updatedProduct = await productModel.findByIdAndUpdate(
    productId,
    req.body,
    { new: true }
  );

  const filePath = "./Ecommerce.xlsx";
  updateExcelSheet(filePath, productId, req.body);

  // updated product
  return res
    .status(201)
    .json({ message: "Product updated successfully", updatedProduct });
});

export const wishList = asyncHandler(async (req, res, next) => {
  const { productId } = req.params;
  if (!(await productModel.findOne({ _id: productId, isDeleted: false }))) {
    return next(new Error("In-Valid Product", { cause: 404 }));
  }
  await userModel.updateOne(
    { _id: req.user._id },
    { $addToSet: { wishList: productId } }
  );
  return res.status(200).json({ message: "Done" });
});

export const deleteFromWishList = asyncHandler(async (req, res, next) => {
  const { productId } = req.params;
  await userModel.updateOne(
    { _id: req.user._id },
    { $pull: { wishList: productId } }
  );
  return res.json({ message: "Done" });
});

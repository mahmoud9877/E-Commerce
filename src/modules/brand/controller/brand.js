import slugify from "slugify";
import brandModel from "../../../../DB/model/Brand.Model.js";
import cloudinary from "../../../utils/cloudinary.js";
import { asyncHandler } from "../../../utils/errorHandling.js";

export const getBrand = asyncHandler(async (req, res, next) => {
  const brandList = await brandModel.find({});
  return res.status(201).json({ message: "Done", brandList });
});

export const createBrand = asyncHandler(async (req, res, next) => {
  req.body.name = req.body.name.toLowerCase();
  if (await brandModel.findOne({ name: req.body.name })) {
    return next(
      new Error(`Duplicated coupon name ${req.body.name}`, { cause: 409 })
    );
  }
  if (req.file) {
    const { secure_url, public_id } = await cloudinary.uploader.upload(
      req.file.path,
      {
        folder: `${process.env.APP_NAME}/brand`,
      }
    );

    req.body.image = { secure_url, public_id };
  }
  req.body.createBy = req.user._id;
  const brand = await brandModel.create(req.body);
  return res.status(201).json({ message: "Done", brand });
});

export const updateBrand = asyncHandler(async (req, res, next) => {
  const { brandId } = req.params;
  const brand = await brandModel.findById(brandId);
  if (!brand) {
    return res.status(400).json({ message: `In-Valid brand Id` });
  }

  if (req.body.name) {
    req.body.name = req.body.name.toLowerCase();
    if (req.body.name == brand.name) {
      return res
        .status(400)
        .json({ message: "Cannot update to the same brand name" });
    }
    if (await brandModel.findOne({ name: req.body.name })) {
      return next(
        new Error(`Duplicated brand name ${req.body.name}`, { cause: 409 })
      );
    }
  }
  if (req.file) {
    const { secure_url, public_id } = await cloudinary.uploader.upload(
      req.file.path,
      {
        folder: `${process.env.APP_NAME}/brand`,
      }
    );
    if (coupon.image?.public_id) {
      await cloudinary.uploader.destroy(coupon.image?.public_id);
    }
    req.body.image = { secure_url, public_id };
  }
  const updateBrand = await brandModel.updateOne({ _id: brandId }, req.body);
  return res.status(201).json({
    message: "brand updated successfully",
    updateBrand,
  });
});

export const deleteBrand = asyncHandler(async (req, res, next) => {
  const { brandId } = req.body;
  if (!brandId) {
    return res.status(400).json({ message: "brandId is required" });
  }
  const brand = await brandModel.findById(brandId);
  if (!brand) {
    return res.status(404).json({ message: "Brand not found" });
  }
  await brandModel.deleteOne({ _id: brandId });
  return res.status(200).json({ message: "Brand deleted successfully" });
});

import slugify from "slugify";
import couponModel from "../../../../DB/model/Coupon.Model.js";
import cloudinary from "../../../utils/cloudinary.js";
import { asyncHandler } from "../../../utils/errorHandling.js";

export const getCoupon = asyncHandler(async (req, res, next) => {
  const couponList = await couponModel.find({
    isDeleted: false,
  });

  return res.status(201).json({ message: "Done", couponList });
});

export const createCoupon = asyncHandler(async (req, res, next) => {
  req.body.name = req.body.name.toLowerCase();
  if (await couponModel.findOne({ name: req.body.name })) {
    return next(
      new Error(`Duplicated coupon name ${req.body.name}`, { cause: 409 })
    );
  }

  if (req.file) {
    const { secure_url, public_id } = await cloudinary.uploader.upload(
      req.file.path,
      {
        folder: `${process.env.APP_NAME}/coupon`,
      }
    );
    req.body.image = { secure_url, public_id };
  }
  req.body.createdBy = req.user._id;
  const coupon = await couponModel.create(req.body);
  return res.status(201).json({ message: "Done", coupon });
});

export const updateCoupon = asyncHandler(async (req, res, next) => {
  const { couponId } = req.params;
  const coupon = await couponModel.findById(couponId);
  if (!coupon) {
    return res.status(400).json({ message: `In-Valid coupon Id` });
  }

  if (req.body.name) {
    req.body.name = req.body.name.toLowerCase();
    if (req.body.name == coupon.name) {
      return res
        .status(400)
        .json({ message: "Cannot update to the same coupon name" });
    }
    if (await couponModel.findOne({ name: req.body.name })) {
      return next(
        new Error(`Duplicated category name ${req.body.name}`, { cause: 409 })
      );
    }
  }
  if (req.file) {
    const { secure_url, public_id } = await cloudinary.uploader.upload(
      req.file.path,
      {
        folder: `${process.env.APP_NAME}/coupon`,
      }
    );
    if (coupon.image?.public_id) {
      await cloudinary.uploader.destroy(coupon.image.public_id);
    }
    req.body.image = { secure_url, public_id };
  }
  const updateCoupon = await couponModel.updateOne({ _id: couponId }, req.body);

  return res.status(201).json({
    message: "coupon updated successfully",
    updateCoupon,
  });
});

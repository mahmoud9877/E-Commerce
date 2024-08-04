import orderModel from "../../../../DB/model/Order.Model.js";
import reviewModel from "../../../../DB/model/Review.Model.js";
import { asyncHandler } from "../../../utils/errorHandling.js";

export const createReview = asyncHandler(async (req, res, next) => {
  const { productId } = req.params;
  const { comment, rating } = req.body;
  const order = await orderModel.findOne({
    userId: req.user._id,
    "products.productId": productId,
    status: "delivered",
  });
  if (!order) {
    return next(
      new Error("cannot review product before you get it", { cause: 400 })
    );
  }
  if (await review.findOne({ productId, createBy: req.user._id })) {
    new Error("cannot review the same product twice", { cause: 400 });
  }
  await reviewModel.create({
    orderId: order._id,
    productId,
    createBy: req.user._id,
    comment,
    rating,
  });
  return res.status(200).json({ message: "Done" });
});

export const updateReview = asyncHandler(async (req, res, next) => {
  const { productId, reviewId } = req.params;
  await reviewModel.updateOne(
    { _id: reviewId, productId, createBy: req.user._id },
    req.body
  );
  return res.status(200).json({ message: "Done" });
});

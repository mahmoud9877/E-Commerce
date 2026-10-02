import joi from "joi";
import { generalFields } from "../../middleware/validation.js";

const reviewFields = {
  productId: generalFields.id,
  comment: joi.string().min(1).max(500),
  rating: joi.number().positive().min(1).max(5),
};

export const createReview = joi
  .object(reviewFields)
  .fork(["comment", "rating"], (field) => field.required())
  .required();

export const updateReview = joi
  .object({ reviewId: generalFields.id, ...reviewFields })
  .required();

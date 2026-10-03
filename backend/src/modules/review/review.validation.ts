import joi from "joi";
import { generalFields } from "../../middleware/validation.js";

const reviewFields = {
  productId: generalFields.id,
  comment: joi.string().min(1).max(500),
  rating: joi.number().positive().min(1).max(5),
};

export const listReviews = joi
  .object({
    productId: generalFields.id,
    page: joi.number().integer().min(1),
    size: joi.number().integer().min(1).max(100),
  })
  .required();

export const createReview = joi
  .object(reviewFields)
  .fork(["comment", "rating"], (field) => field.required())
  .required();

export const updateReview = joi
  .object({ reviewId: generalFields.id, ...reviewFields })
  .required();

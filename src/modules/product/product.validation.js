import joi from "joi";
import { generalFields } from "../../middleware/validation.js";

export const createProduct = joi
  .object({
    productId: generalFields.id,
    comment: joi.string().min(1).max(500).required(),
    rating: joi.number().positive().required().min(1).max(5),
  })
  .required();

export const updateProduct = joi
  .object({
    productId: generalFields.id,
    reviewId: generalFields.id,
    comment: joi.string().min(1).max(500),
    rating: joi.number().positive().min(1).max(5),
  })
  .required();

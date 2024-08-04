import joi from "joi";
import { generalFields } from "../../middleware/validation.js";

export const createCoupon = joi
  .object({
    name: joi.string().min(2).max(25).required(),
    amount: joi.number().positive().min(1).max(100).required(),
    expire: joi.date().required().greater(Date.now()),
    file: generalFields.file,
  })
  .required();

export const updateCoupon = joi
  .object({
    couponId: generalFields.id,
    name: joi.string().min(2).max(25),
    amount: joi.number().positive().min(1).max(100),
    expire: joi.date().greater(Date.now()),
    file: generalFields.file,
  })
  .required();

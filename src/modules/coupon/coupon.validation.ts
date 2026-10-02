import joi from "joi";
import { generalFields } from "../../middleware/validation.js";

const couponFields = {
  name: joi.string().min(2).max(25),
  amount: joi.number().positive().min(1).max(100),
  // "now" is resolved on every validation, not once at startup
  expire: joi.date().greater("now"),
  file: generalFields.file,
};

export const createCoupon = joi
  .object(couponFields)
  .fork(["name", "amount", "expire"], (field) => field.required())
  .required();

export const updateCoupon = joi
  .object({ couponId: generalFields.id, ...couponFields })
  .required();

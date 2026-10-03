import joi from "joi";
import { generalFields } from "../../middleware/validation.js";

const brandFields = {
  name: joi.string().min(2).max(25),
  file: generalFields.file,
};

export const createBrand = joi
  .object(brandFields)
  .fork(["name"], (field) => field.required())
  .required();

export const updateBrand = joi
  .object({ brandId: generalFields.id, ...brandFields })
  .required();

export const deleteBrand = joi
  .object({ brandId: generalFields.id })
  .required();

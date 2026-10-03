import Joi from "joi";
import { generalFields } from "../../middleware/validation.js";

const subcategoryFields = {
  categoryId: generalFields.id,
  name: Joi.string().min(3).max(30),
  description: Joi.string().optional(),
  file: generalFields.file,
};

export const createSubcategory = Joi.object(subcategoryFields).fork(
  ["name"],
  (field) => field.required()
);

export const updateSubcategory = Joi.object({
  subcategoryId: generalFields.id,
  ...subcategoryFields,
});

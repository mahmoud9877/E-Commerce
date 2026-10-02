import Joi from "joi";
import { generalFields } from "../../middleware/validation.js";

export const createCategory = Joi.object({
  name: Joi.string().min(3).max(30).required(),
  description: Joi.string().optional(),
  file: generalFields.file,
});

export const updateCategory = Joi.object({
  categoryId: generalFields.id,
  name: Joi.string().min(3).max(30),
  description: Joi.string(),
  file: generalFields.file,
});

export const deleteCategory = Joi.object({
  categoryId: generalFields.id,
});

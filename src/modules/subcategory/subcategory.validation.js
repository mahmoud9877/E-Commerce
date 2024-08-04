import Joi from "joi";
import categoryModel from "../../../DB/model/Category.Model.js";
import { generalFields } from "../../middleware/validation.js";
import subcategoryModel from "../../../DB/model/Subcategory.Model.js";

export const createSubcategory = Joi.object({
  name: Joi.string().min(3).max(30).required(),
  categoryId: generalFields.id,
  description: Joi.string().optional(),
  image: Joi.string().optional(), // Assuming image is passed as a string path or URL
});

export const updateSubcategory = Joi.object({
  categoryId: generalFields.id,
  subcategoryId: generalFields.id,
  name: Joi.string().min(3).max(30).optional(),
  description: Joi.string().optional(),
  image: Joi.string().optional(), // Assuming image is passed as a string path or URL
});

import Joi from "joi";

export const createCategory = Joi.object({
  name: Joi.string().min(3).max(30).required(),
  description: Joi.string().optional(),
  image: Joi.string().optional(), // Assuming image is passed as a string path or URL
});

export const updateCategory = Joi.object({
  name: Joi.string().min(3).max(30).optional(),
  description: Joi.string().optional(),
  image: Joi.string().optional(), // Assuming image is passed as a string path or URL
});

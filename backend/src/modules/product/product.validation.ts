import joi from "joi";
import { generalFields } from "../../middleware/validation.js";

const SIZES = ["s", "m", "lg", "xl"];

// Multipart forms send a single value as a string and repeated values as an array
const oneOrMany = (item: joi.Schema) => joi.alternatives(joi.array().items(item), item);

const productFields = {
  name: joi.string().min(2).max(150),
  description: joi.string().max(15000),
  size: oneOrMany(joi.string().valid(...SIZES)),
  colors: oneOrMany(joi.string()),
  stock: joi.number().integer().min(0),
  price: joi.number().positive(),
  discount: joi.number().min(0).max(100),
  categoryId: generalFields.id.optional(),
  subcategoryId: generalFields.id.optional(),
  brandId: generalFields.id.optional(),
};

const productImages = (mainImageRequired: boolean) =>
  joi.object({
    mainImage: joi
      .array()
      .items(generalFields.file)
      .length(1)
      .presence(mainImageRequired ? "required" : "optional"),
    subImages: joi.array().items(generalFields.file).max(5),
  });

export const createProduct = joi
  .object({ ...productFields, files: productImages(true).required() })
  .fork(
    ["name", "price", "stock", "categoryId", "subcategoryId", "brandId"],
    (field) => field.required()
  )
  .required();

export const updateProduct = joi
  .object({
    productId: generalFields.id,
    ...productFields,
    files: productImages(false),
  })
  .required();

export const productById = joi
  .object({ productId: generalFields.id })
  .required();

export const wishlist = joi
  .object({ productId: generalFields.id })
  .required();

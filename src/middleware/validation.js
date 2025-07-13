import joi from "joi";
import { Types } from "mongoose";

// ✅ Custom validator for MongoDB ObjectId
const validateObjectId = (value, helper) => {
  return Types.ObjectId.isValid(value)
    ? value
    : helper.message("Invalid ObjectId");
};

// ✅ General reusable field definitions
export const generalFields = {
  email: joi
    .string()
    .email({
      minDomainSegments: 2,
      maxDomainSegments: 4,
      tlds: { allow: ["com", "net"] },
    })
    .required()
    .messages({
      "string.email": "Email must be a valid email address",
      "any.required": "Email is required",
    }),

  password: joi
    .string()
    .pattern(new RegExp(/^(?=.*\d)(?=.*[a-z])(?=.*[A-Z]).{8,}$/))
    .required()
    .messages({
      "string.pattern.base":
        "Password must include at least 1 lowercase, 1 uppercase, 1 number and be at least 8 characters",
      "any.required": "Password is required",
    }),

  cPassword: joi
    .string()
    .required()
    .valid(joi.ref("password"))
    .messages({
      "any.only": "Confirm Password must match Password",
      "any.required": "Confirm Password is required",
    }),

  id: joi
    .string()
    .custom(validateObjectId)
    .required()
    .messages({
      "any.required": "ID is required",
      "string.base": "ID must be a string",
    }),

  file: joi.object({
    size: joi.number().positive().required(),
    path: joi.string().required(),
    filename: joi.string().required(),
    destination: joi.string().required(),
    mimetype: joi.string().required(),
    encoding: joi.string().required(),
    originalname: joi.string().required(),
    fieldname: joi.string().required(),
  }),
};

// ✅ Centralized validation middleware
export const validation = (schema) => {
  return (req, res, next) => {
    const inputsData = {
      ...req.body,
      ...req.params,
      ...req.query,
      ...(req.file && { file: req.file }),
      ...(req.files && { files: req.files }),
    };

    const validationResult = schema.validate(inputsData, { abortEarly: false });

    if (validationResult.error) {
      return res.status(400).json({
        message: "Validation Error",
        errors: validationResult.error.details.map((err) => ({
          field: err.path.join("."),
          message: err.message,
        })),
      });
    }

    return next();
  };
};

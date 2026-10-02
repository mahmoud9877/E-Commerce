import joi, { type CustomHelpers, type LanguageMessages, type Schema } from "joi";
import type { RequestHandler } from "express";
import { Types } from "mongoose";
import { AppError } from "../core/AppError.js";

export class Validator {
  static #objectId(value: string, helper: CustomHelpers) {
    return Types.ObjectId.isValid(value)
      ? value
      : helper.message("Invalid ObjectId" as unknown as LanguageMessages);
  }

  // Reusable field definitions shared by the module schemas
  static readonly generalFields = {
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
      .custom(Validator.#objectId)
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

  static validate(schema: Schema): RequestHandler {
    return (req, res, next) => {
      const inputsData = {
        ...req.body,
        ...req.params,
        ...req.query,
        ...(req.file && { file: req.file }),
        ...(req.files && { files: req.files }),
      };

      const { error } = schema.validate(inputsData, { abortEarly: false });
      if (error) {
        const errors = error.details.map((err) => ({
          field: err.path.join("."),
          message: err.message,
        }));
        return next(new AppError("Validation Error", 400, errors));
      }

      next();
    };
  }
}

export const generalFields = Validator.generalFields;

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

  // Validates body, query and route params as one object (so module schemas stay flat),
  // then writes the converted values back to where each field came from. Handlers therefore
  // read exactly what was validated, e.g. numbers instead of multipart strings.
  static validate(schema: Schema): RequestHandler {
    return (req, res, next) => {
      const sources = {
        body: (req.body ?? {}) as Record<string, unknown>,
        query: req.query as Record<string, unknown>,
        params: req.params as Record<string, unknown>,
      };
      const inputsData: Record<string, unknown> = {};
      const origin: Record<string, keyof typeof sources> = {};
      for (const [name, source] of Object.entries(sources) as [keyof typeof sources, Record<string, unknown>][]) {
        for (const [key, value] of Object.entries(source)) {
          // Otherwise e.g. ?productId=<valid> could pass validation for an invalid :productId
          if (key in inputsData) {
            return next(new AppError(`"${key}" must be sent only once`, 400));
          }
          inputsData[key] = value;
          origin[key] = name;
        }
      }
      if (req.file) inputsData.file = req.file;
      if (req.files) inputsData.files = req.files;

      const { error, value } = schema.validate(inputsData, { abortEarly: false });
      if (error) {
        const errors = error.details.map((err) => ({
          field: err.path.join("."),
          message: err.message,
        }));
        return next(new AppError("Validation Error", 400, errors));
      }

      for (const [key, converted] of Object.entries(value as Record<string, unknown>)) {
        if (key === "file" || key === "files") continue;
        // Fields added by schema defaults land in the body
        const target = sources[origin[key] ?? "body"];
        target[key] = converted;
      }
      if (!req.body) req.body = sources.body;

      next();
    };
  }
}

export const generalFields = Validator.generalFields;

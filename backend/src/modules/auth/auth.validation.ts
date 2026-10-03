import joi from "joi";
import { generalFields } from "../../middleware/validation.js";
export const signup = joi
  .object({
    userName: joi.string().min(2).max(25).required(),
    email: generalFields.email,
    password: generalFields.password,
    cPassword: generalFields.cPassword,
  })
  .required();

export const token = joi
  .object({
    token: joi.string().required(),
  })
  .required();

export const login = joi
  .object({
    email: generalFields.email,
    // Not the signup complexity rule: older passwords that predate it must still log in
    password: joi.string().max(128).required(),
  })
  .required();

export const sendCode = joi
  .object({
    email: generalFields.email,
  })
  .required();

export const forgetPassword = joi
  .object({
    email: generalFields.email,
    password: generalFields.password,
    cPassword: generalFields.cPassword,
    code: joi
      .string()
      .pattern(new RegExp(/^\d{6}$/))
      .required(),
  })
  .required();

export const refreshToken = joi
  .object({
    refreshToken: joi.string().max(200).required(),
  })
  .required();

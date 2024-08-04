import joi from "joi";
import { generalFields } from "../../middleware/validation.js";

// Define the validation schema
export const createOrder = joi
  .object({
    address: joi.string().min(10).max(1000).required(),
    phone: joi
      .array()
      .items(
        joi
          .string()
          .pattern(/^(010|011|012|015)[0-9]{8}$/)
          .required() // Egyptian phone number pattern
      )
      .min(1)
      .max(3)
      .required(),
    couponName: joi.string().optional(),
    note: joi.string().optional(),
    paymentType: joi.string().valid("cash", "card").required(),
    products: joi.array().items(
      joi
        .object({
          productId: generalFields.id,
          quantity: joi.number().positive().integer().min(1).required(),
        })
        .required()
    ),
  })
  .required();

export const cancelOrder = joi.object({
  orderId: generalFields.id,
  reason: joi.string().min(2).max(5000).required(),
});

export const deliveredOrder = joi.object({
  orderId: generalFields.id,
});

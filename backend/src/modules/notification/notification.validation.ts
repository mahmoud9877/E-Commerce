import joi from "joi";
import { generalFields } from "../../middleware/validation.js";

export const listNotifications = joi.object({
  page: joi.number().integer().min(1),
  size: joi.number().integer().min(1).max(100),
  unread: joi.string().valid("true", "false"),
});

export const markRead = joi
  .object({ notificationId: generalFields.id })
  .required();

import { roles } from "../../middleware/auth.js";

export const endpoint = {
  create: [roles.Admin],
  cancel: [roles.Admin],
  delivered: [roles.Admin],
};

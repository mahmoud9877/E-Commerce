import { roles } from "../../middleware/auth.js";
export const endpoint = {
  addToCart: [roles.Admin],
  deleteFromCart: [roles.Admin],
};

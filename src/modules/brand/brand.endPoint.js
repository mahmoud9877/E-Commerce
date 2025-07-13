import { roles } from "../../middleware/auth.js";
export const endpoint = {
  Admin: [roles.Admin],
  User: [roles.User],
};

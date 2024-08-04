import userModel from "../../DB/model/User.model.js";
import { verifyToken } from "../utils/GenerateAndVerifyToken.js";
import { asyncHandler } from "../utils/errorHandling.js";

export const roles = {
  Admin: "Admin",
  User: "User",
};

// Authentication middleware
export const auth = (accessRoles = []) => {
  return asyncHandler(async (req, res, next) => {
    const { authorization } = req.headers;

    // Check if authorization header starts with the correct bearer key
    if (!authorization?.startsWith(process.env.BEARER_KEY)) {
      return next(new Error("Invalid bearer key", { cause: 400 }));
    }

    // Extract the token from the authorization header
    const token = authorization.split(process.env.BEARER_KEY)[1];
    if (!token) {
      return next(new Error("Missing Token", { cause: 404 }));
    }

    // Verify the token
    const decoded = verifyToken({ token });
    if (!decoded?.id) {
      return next(new Error("Invalid payload token", { cause: 404 }));
    }

    // Find the user by ID and select specific fields
    const user = await userModel
      .findById(decoded.id)
      .select("userName email image role status");
    if (!user) {
      return next(new Error("Not registered account", { cause: 401 }));
    }
    if (!accessRoles.includes(user.role)) {
      return next(new Error("Not authorized account", { cause: 401 }));
    }

    // Attach user to the request object
    req.user = user;
    return next();
  });
};

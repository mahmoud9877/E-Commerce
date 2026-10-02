import type { UserDocument } from "../../DB/model/User.model.js";

declare global {
  namespace Express {
    interface Request {
      // Set by AuthMiddleware on authenticated routes
      user?: UserDocument;
    }
  }
}

export {};

import type { UserDocument } from "../db/models/User.model.js";

declare global {
  namespace Express {
    interface Request {
      // Set by AuthMiddleware on authenticated routes
      user?: UserDocument;
      // Correlates a request with its log lines; echoed back as X-Request-Id
      id?: string;
      // Exact bytes of a JSON body, kept for webhook signature verification
      rawBody?: Buffer;
    }
  }
}

export {};

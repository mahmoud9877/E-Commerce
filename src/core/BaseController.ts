import type { NextFunction, Request, Response } from "express";
import type { UserDocument } from "../../DB/model/User.model.js";
import { AppError } from "./AppError.js";
import { ErrorHandler } from "./ErrorHandler.js";

type Handler = (req: Request, res: Response, next: NextFunction) => unknown;

export abstract class BaseController {
  constructor() {
    // Bind every handler to the instance and route async errors to the error middleware
    const self = this as unknown as Record<string, unknown>;
    const proto = Object.getPrototypeOf(this) as object;
    for (const key of Object.getOwnPropertyNames(proto)) {
      const member = self[key];
      if (key === "constructor" || typeof member !== "function") continue;
      self[key] = ErrorHandler.asyncHandler((member as Handler).bind(this));
    }
  }

  protected static baseUrl(req: Request): string {
    return `${req.protocol}://${req.headers.host}`;
  }

  // Only valid on routes guarded by AuthMiddleware
  protected static currentUser(req: Request): UserDocument {
    if (!req.user) {
      throw new AppError("Not registered account", 401);
    }
    return req.user;
  }
}

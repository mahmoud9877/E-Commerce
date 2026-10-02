import type { RequestHandler } from "express";
import type { Model } from "mongoose";
import type { IUser, Role } from "../../DB/model/User.model.js";
import { AppError } from "../core/AppError.js";
import type { IAuthenticator, ITokenService } from "../core/contracts.js";
import { Env } from "../core/Env.js";
import { ErrorHandler } from "../core/ErrorHandler.js";

export class AuthMiddleware implements IAuthenticator {
  constructor(
    private readonly users: Model<IUser>,
    private readonly tokens: ITokenService
  ) {}

  authenticate(accessRoles: readonly Role[] = []): RequestHandler {
    return ErrorHandler.asyncHandler(async (req, res, next) => {
      const bearerKey = Env.get("BEARER_KEY");
      const { authorization } = req.headers;
      if (!authorization?.startsWith(bearerKey)) {
        throw new AppError("Invalid bearer key", 401);
      }

      const token = authorization.split(bearerKey)[1];
      if (!token) {
        throw new AppError("Missing Token", 401);
      }

      let decoded: Partial<{ id: string }>;
      try {
        decoded = this.tokens.verify<{ id: string }>(token);
      } catch {
        throw new AppError("Invalid or expired token", 401);
      }
      if (!decoded?.id) {
        throw new AppError("Invalid payload token", 401);
      }

      const user = await this.users
        .findById(decoded.id)
        .select("userName email image role status");
      if (!user) {
        throw new AppError("Not registered account", 401);
      }
      if (!accessRoles.includes(user.role)) {
        throw new AppError("Not authorized account", 403);
      }

      req.user = user;
      return next();
    });
  }
}

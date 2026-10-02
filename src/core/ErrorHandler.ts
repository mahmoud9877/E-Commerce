import type { NextFunction, Request, RequestHandler, Response } from "express";
import { Env } from "./Env.js";

type AsyncRequestHandler = (
  req: Request,
  res: Response,
  next: NextFunction
) => unknown;

type HttpError = Error & { statusCode?: unknown; cause?: unknown; errors?: unknown };

export class ErrorHandler {
  static asyncHandler(fn: AsyncRequestHandler): RequestHandler {
    return (req, res, next) => {
      Promise.resolve(fn(req, res, next)).catch(next);
    };
  }

  static #statusOf(err: HttpError): number {
    if (Number.isInteger(err.statusCode)) return err.statusCode as number;
    if (Number.isInteger(err.cause)) return err.cause as number;
    return 500;
  }

  // Express identifies error middleware by its 4-argument signature
  static globalHandler(
    err: HttpError,
    req: Request,
    res: Response,
    next: NextFunction
  ): Response {
    const status = ErrorHandler.#statusOf(err);
    const body = { message: err.message, ...(err.errors ? { errors: err.errors } : {}) };
    if (Env.isDev()) {
      return res.status(status).json({ ...body, err, stack: err.stack });
    }
    return res.status(status).json(body);
  }
}

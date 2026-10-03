import type { NextFunction, Request, RequestHandler, Response } from "express";
import mongoose from "mongoose";
import multer from "multer";
import { AppError, type FieldError } from "./AppError.js";
import { Env } from "./Env.js";

type AsyncRequestHandler = (
  req: Request,
  res: Response,
  next: NextFunction
) => unknown;

interface Normalized {
  status: number;
  message: string;
  errors?: FieldError[];
}

const isDuplicateKey = (err: unknown): err is { code: number; keyValue?: Record<string, unknown> } =>
  (err as { code?: unknown } | null)?.code === 11000;

export class ErrorHandler {
  static asyncHandler(fn: AsyncRequestHandler): RequestHandler {
    return (req, res, next) => {
      Promise.resolve(fn(req, res, next)).catch(next);
    };
  }

  // Turns every known error type into a client-facing status and message
  static #normalize(err: unknown): Normalized {
    if (err instanceof AppError) {
      return { status: err.statusCode, message: err.message, errors: err.errors };
    }
    if (err instanceof mongoose.Error.CastError) {
      return { status: 400, message: `Invalid ${err.path}` };
    }
    if (err instanceof mongoose.Error.ValidationError) {
      const errors = Object.values(err.errors).map((e) => ({ field: e.path, message: e.message }));
      return { status: 400, message: "Validation Error", errors };
    }
    if (isDuplicateKey(err)) {
      const fields = Object.keys(err.keyValue ?? {}).join(", ") || "value";
      return { status: 409, message: `Duplicate ${fields}` };
    }
    if (err instanceof multer.MulterError) {
      const status = err.code === "LIMIT_FILE_SIZE" ? 413 : 400;
      return { status, message: err.message };
    }
    // body-parser errors (malformed JSON, payload too large) carry an HTTP status and safe message
    const httpStatus = (err as { status?: unknown; expose?: unknown } | null)?.status;
    if (
      Number.isInteger(httpStatus) &&
      (httpStatus as number) >= 400 &&
      (httpStatus as number) < 500 &&
      (err as { expose?: unknown }).expose
    ) {
      return { status: httpStatus as number, message: (err as Error).message };
    }
    return { status: 500, message: "Internal server error" };
  }

  // Express identifies error middleware by its 4-argument signature
  static globalHandler(
    err: unknown,
    req: Request,
    res: Response,
    next: NextFunction
  ): Response | void {
    if (res.headersSent) return next(err);
    const { status, message, errors } = ErrorHandler.#normalize(err);
    if (status >= 500) {
      console.error(`[${req.id ?? "-"}] ${req.method} ${req.originalUrl} failed:`, err);
    }
    const body = { message, ...(errors ? { errors } : {}), requestId: req.id };
    if (Env.isDev()) {
      const error = err as Error;
      return res.status(status).json({ ...body, detail: error?.message, stack: error?.stack });
    }
    return res.status(status).json(body);
  }
}

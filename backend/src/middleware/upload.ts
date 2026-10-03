import { unlink } from "fs/promises";
import type { Request, RequestHandler } from "express";
import multer, { type Field } from "multer";
import { AppError } from "../core/AppError.js";

const MAX_FILE_SIZE = 5 * 1024 * 1024;
const MAX_FILES = 6;

// Every path multer wrote for this request (single file or keyed fields)
function uploadedPaths(req: Request): string[] {
  const files = req.files
    ? Array.isArray(req.files)
      ? req.files
      : Object.values(req.files).flat()
    : [];
  return [...(req.file ? [req.file] : []), ...files].map((file) => file.path);
}

export class FileUpload {
  static readonly validation = {
    image: ["image/jpeg", "image/png", "image/gif"],
  };

  static create(allowedMimeTypes: string[] = []) {
    return multer({
      // OS temp dir; the files only live until the response is sent (see #withCleanup)
      storage: multer.diskStorage({}),
      limits: { fileSize: MAX_FILE_SIZE, files: MAX_FILES },
      fileFilter(req, file, cb) {
        if (allowedMimeTypes.includes(file.mimetype)) {
          cb(null, true);
        } else {
          cb(new AppError("In-valid file format", 400));
        }
      },
    });
  }

  // Deletes the temp files once the response finishes or the client disconnects
  static #withCleanup(handler: RequestHandler): RequestHandler {
    return (req, res, next) => {
      res.once("close", () => {
        for (const path of uploadedPaths(req)) {
          unlink(path).catch(() => undefined);
        }
      });
      handler(req, res, next);
    };
  }

  // Single image upload under the "image" form field
  static singleImage(): RequestHandler {
    return FileUpload.#withCleanup(FileUpload.create(FileUpload.validation.image).single("image"));
  }

  static imageFields(fields: readonly Field[]): RequestHandler {
    return FileUpload.#withCleanup(FileUpload.create(FileUpload.validation.image).fields(fields));
  }
}

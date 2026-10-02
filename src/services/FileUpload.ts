import type { RequestHandler } from "express";
import multer, { type Multer } from "multer";
import { AppError } from "../core/AppError.js";

export class FileUpload {
  static readonly validation = {
    image: ["image/jpeg", "image/png", "image/gif"],
  };

  static create(allowedMimeTypes: string[] = []): Multer {
    return multer({
      storage: multer.diskStorage({}),
      fileFilter(req, file, cb) {
        if (allowedMimeTypes.includes(file.mimetype)) {
          cb(null, true);
        } else {
          cb(new AppError("In-valid file format", 400));
        }
      },
    });
  }

  static image(): Multer {
    return FileUpload.create(FileUpload.validation.image);
  }

  // Single image upload under the "image" form field
  static singleImage(): RequestHandler {
    return FileUpload.image().single("image");
  }
}

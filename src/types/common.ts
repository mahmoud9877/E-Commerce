import type { Types } from "mongoose";

export type Id = string | Types.ObjectId;

export interface ImageAsset {
  secure_url: string;
  public_id: string;
}

export type UploadedFile = Express.Multer.File;
export type UploadedFiles = Record<string, Express.Multer.File[] | undefined>;

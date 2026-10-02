import cloudinary from "cloudinary";
import { Env } from "../core/Env.js";
import type { IImageStorage } from "../core/contracts.js";
import type { ImageAsset } from "../types/common.js";

export class ImageService implements IImageStorage {
  #configured = false;

  get client(): typeof cloudinary.v2 {
    if (!this.#configured) {
      cloudinary.v2.config({
        api_key: Env.get("API_KEY"),
        api_secret: Env.get("API_SECRET"),
        cloud_name: Env.get("CLOUD_NAME"),
        secure: true,
      });
      this.#configured = true;
    }
    return cloudinary.v2;
  }

  async upload(filePath: string, folder: string): Promise<ImageAsset> {
    const { secure_url, public_id } = await this.client.uploader.upload(
      filePath,
      { folder: `${process.env.APP_NAME}/${folder}` }
    );
    return { secure_url, public_id };
  }

  async destroy(publicId?: string): Promise<void> {
    if (publicId) await this.client.uploader.destroy(publicId);
  }

  // Uploads the new image, then removes the old one
  async replace(filePath: string, folder: string, oldPublicId?: string): Promise<ImageAsset> {
    const image = await this.upload(filePath, folder);
    await this.destroy(oldPublicId);
    return image;
  }
}


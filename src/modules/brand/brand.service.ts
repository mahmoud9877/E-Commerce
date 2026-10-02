import type { ParsedQs } from "qs";
import type { Model, Types } from "mongoose";
import type { IBrand } from "../../../DB/model/Brand.Model.js";
import { AppError } from "../../core/AppError.js";
import { BaseService } from "../../core/BaseService.js";
import type { IImageStorage } from "../../core/contracts.js";
import type { Id, UploadedFile } from "../../types/common.js";

export interface BrandInput {
  name?: string;
}

export class BrandService extends BaseService<IBrand> {
  constructor(
    model: Model<IBrand>,
    private readonly images: IImageStorage
  ) {
    super(model);
  }

  list(query: ParsedQs) {
    return this.paginate({}, query);
  }

  async create(data: BrandInput & { name: string }, file: UploadedFile | undefined, userId: Types.ObjectId) {
    const name = await this.uniqueName(data.name, "brand");

    const brand: Partial<IBrand> = { ...data, name, createBy: userId };
    if (file) {
      brand.image = await this.images.upload(file.path, "brand");
    }
    return this.model.create(brand);
  }

  async update(brandId: Id, data: BrandInput, file: UploadedFile | undefined) {
    const brand = await this.findOrFail({ _id: brandId }, "In-Valid brand Id", 400);
    const changes: Partial<IBrand> = { ...data };

    if (changes.name) {
      changes.name = await this.uniqueName(changes.name, "brand", brand.name);
    }
    if (file) {
      changes.image = await this.images.replace(
        file.path,
        "brand",
        brand.image?.public_id
      );
    }
    return this.model.updateOne({ _id: brandId }, changes);
  }

  async delete(brandId: Id | undefined): Promise<void> {
    if (!brandId) {
      throw new AppError("brandId is required", 400);
    }
    await this.findOrFail({ _id: brandId }, "Brand not found");
    await this.model.deleteOne({ _id: brandId });
  }
}

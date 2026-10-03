import type { ParsedQs } from "qs";
import type { Model, Types } from "mongoose";
import type { IBrand } from "../../db/models/Brand.Model.js";
import type { IProduct } from "../../db/models/Product.Model.js";
import { AppError } from "../../core/AppError.js";
import { BaseService } from "../../core/BaseService.js";
import type { IImageStorage } from "../../core/contracts.js";
import { uniqueName } from "../../core/uniqueName.js";
import type { Id, UploadedFile } from "../../types/common.js";

export interface BrandInput {
  name?: string;
}

export class BrandService extends BaseService<IBrand> {
  constructor(
    model: Model<IBrand>,
    private readonly images: IImageStorage,
    // Only read, to refuse deleting a brand that products still use
    private readonly products: Model<IProduct>
  ) {
    super(model);
  }

  list(query: ParsedQs) {
    return this.paginate({}, query);
  }

  async create(data: BrandInput & { name: string }, file: UploadedFile | undefined, userId: Types.ObjectId) {
    const name = await uniqueName(this.model, data.name, "brand");

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
      changes.name = await uniqueName(this.model, changes.name, "brand", brand.name);
    }
    if (file) {
      changes.image = await this.images.replace(
        file.path,
        "brand",
        brand.image?.public_id
      );
    }
    return this.model.findByIdAndUpdate(brandId, changes, { new: true });
  }

  // Hard delete; refused while products still point at the brand
  async delete(brandId: Id | undefined): Promise<void> {
    if (!brandId) {
      throw new AppError("brandId is required", 400);
    }
    const brand = await this.findOrFail({ _id: brandId }, "Brand not found");
    if (await this.products.exists({ brandId })) {
      throw new AppError("Delete or move the products of this brand first", 409);
    }
    await this.model.deleteOne({ _id: brandId });
    await this.images.destroy(brand.image?.public_id).catch(() => undefined);
  }
}

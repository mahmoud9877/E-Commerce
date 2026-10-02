import type { ParsedQs } from "qs";
import type { Model } from "mongoose";
import type { ISubcategory } from "../../../DB/model/Subcategory.Model.js";
import type { ICategory } from "../../../DB/model/Category.Model.js";
import { AppError } from "../../core/AppError.js";
import { BaseService } from "../../core/BaseService.js";
import type { IImageStorage } from "../../core/contracts.js";
import type { Id, UploadedFile } from "../../types/common.js";
import { toSlug } from "../../utils/slug.js";

export interface SubcategoryInput {
  name?: string;
}

export class SubcategoryService extends BaseService<ISubcategory> {
  constructor(
    model: Model<ISubcategory>,
    private readonly categories: Model<ICategory>,
    private readonly images: IImageStorage
  ) {
    super(model);
  }

  list(query: ParsedQs) {
    return this.paginate({ isDeleted: false }, query);
  }

  async create(categoryId: string, { name }: { name: string }, file: UploadedFile | undefined) {
    if (!(await this.categories.findById(categoryId))) {
      throw new AppError("Invalid category ID", 400);
    }
    name = await this.uniqueName(name, "subcategory");
    if (!file) {
      throw new AppError("Image file is required", 400);
    }

    return this.model.create({
      name,
      slug: toSlug(name),
      image: await this.images.upload(file.path, `category/${categoryId}`),
      categoryId,
    });
  }

  async update(
    categoryId: string,
    subcategoryId: Id,
    data: SubcategoryInput,
    file: UploadedFile | undefined
  ) {
    const subcategory = await this.findOrFail(
      { _id: subcategoryId, categoryId },
      "Invalid subcategory ID",
      400
    );
    const changes: Partial<ISubcategory> = { ...data };

    if (changes.name) {
      changes.name = await this.uniqueName(changes.name, "subcategory", subcategory.name);
      changes.slug = toSlug(changes.name);
    }

    if (file) {
      try {
        changes.image = await this.images.replace(
          file.path,
          `category/${categoryId}`,
          subcategory.image?.public_id
        );
      } catch {
        throw new AppError("Error uploading or deleting image", 500);
      }
    }

    const updated = await this.model.findByIdAndUpdate(subcategoryId, changes, {
      new: true,
    });
    if (!updated) {
      throw new AppError("Failed to update subcategory", 400);
    }
    return updated;
  }
}

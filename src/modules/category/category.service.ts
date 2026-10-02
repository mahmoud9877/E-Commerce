import type { ParsedQs } from "qs";
import type { Model, Types } from "mongoose";
import type { ICategory } from "../../../DB/model/Category.Model.js";
import { AppError } from "../../core/AppError.js";
import { BaseService } from "../../core/BaseService.js";
import type { IImageStorage } from "../../core/contracts.js";
import type { Id, UploadedFile } from "../../types/common.js";
import { toSlug } from "../../utils/slug.js";

export interface CategoryInput {
  name?: string;
}

export class CategoryService extends BaseService<ICategory> {
  constructor(
    model: Model<ICategory>,
    private readonly images: IImageStorage
  ) {
    super(model);
  }

  list(query: ParsedQs) {
    return this.paginate({ isDeleted: false }, query, [{ path: "subcategory" }]);
  }

  async create({ name }: { name: string }, file: UploadedFile | undefined, userId: Types.ObjectId) {
    name = await this.uniqueName(name, "category");
    if (!file) {
      throw new AppError("Image file is required", 400);
    }

    return this.model.create({
      name,
      slug: toSlug(name),
      image: await this.images.upload(file.path, "category"),
      createBy: userId,
    });
  }

  async update(
    categoryId: Id,
    { name }: CategoryInput,
    file: UploadedFile | undefined,
    userId: string
  ) {
    const category = await this.findOrFail(
      { _id: categoryId },
      "Invalid Category Id",
      400
    );

    if (name) {
      category.name = await this.uniqueName(name, "category", category.name);
      category.slug = toSlug(category.name);
    }

    if (file) {
      category.image = await this.images.replace(
        file.path,
        "category",
        category.image?.public_id
      );
    }

    category.updateBy = userId;
    return category.save();
  }

  async delete(categoryId: Id | undefined): Promise<void> {
    if (!categoryId) {
      throw new AppError("Category Is Required", 404);
    }
    await this.findOrFail({ _id: categoryId }, "Category Not Found");
    await this.model.deleteOne({ _id: categoryId });
  }
}

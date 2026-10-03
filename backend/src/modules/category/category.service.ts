import type { ParsedQs } from "qs";
import type { Model, Types } from "mongoose";
import type { ICategory } from "../../db/models/Category.Model.js";
import type { IProduct } from "../../db/models/Product.Model.js";
import type { ISubcategory } from "../../db/models/Subcategory.Model.js";
import { AppError } from "../../core/AppError.js";
import { BaseService } from "../../core/BaseService.js";
import type { IImageStorage } from "../../core/contracts.js";
import { uniqueName } from "../../core/uniqueName.js";
import type { Id, UploadedFile } from "../../types/common.js";
import { toSlug } from "../../utils/slug.js";

export interface CategoryInput {
  name?: string;
}

export interface CategoryServiceDeps {
  model: Model<ICategory>;
  // Only read, to refuse deleting a category that is still in use
  subcategories: Model<ISubcategory>;
  products: Model<IProduct>;
  images: IImageStorage;
}

export class CategoryService extends BaseService<ICategory> {
  private readonly subcategories: Model<ISubcategory>;
  private readonly products: Model<IProduct>;
  private readonly images: IImageStorage;

  constructor({ model, subcategories, products, images }: CategoryServiceDeps) {
    super(model);
    this.subcategories = subcategories;
    this.products = products;
    this.images = images;
  }

  list(query: ParsedQs) {
    return this.paginate({}, query, [{ path: "subcategory" }]);
  }

  async create({ name }: { name: string }, file: UploadedFile | undefined, userId: Types.ObjectId) {
    name = await uniqueName(this.model, name, "category");
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
    userId: Types.ObjectId
  ) {
    const category = await this.findOrFail(
      { _id: categoryId },
      "Invalid Category Id",
      400
    );

    if (name) {
      category.name = await uniqueName(this.model, name, "category", category.name);
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

  // Hard delete; refused while subcategories or products still point at the category
  async delete(categoryId: Id | undefined): Promise<void> {
    if (!categoryId) {
      throw new AppError("Category Is Required", 400);
    }
    const category = await this.findOrFail({ _id: categoryId }, "Category Not Found");
    if (await this.subcategories.exists({ categoryId })) {
      throw new AppError("Delete or move the subcategories of this category first", 409);
    }
    if (await this.products.exists({ categoryId })) {
      throw new AppError("Delete or move the products of this category first", 409);
    }
    await this.model.deleteOne({ _id: categoryId });
    // Best effort: a leftover image is harmless, failing the request after the row is gone is not
    await this.images.destroy(category.image?.public_id).catch(() => undefined);
  }
}

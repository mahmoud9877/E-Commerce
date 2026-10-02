import { nanoid } from "nanoid";
import type { ClientSession, HydratedDocument, Model, Types } from "mongoose";
import type { ParsedQs } from "qs";
import type { IProduct } from "../../../DB/model/Product.Model.js";
import type { ISubcategory } from "../../../DB/model/Subcategory.Model.js";
import type { IBrand } from "../../../DB/model/Brand.Model.js";
import { AppError } from "../../core/AppError.js";
import { BaseService } from "../../core/BaseService.js";
import type { IImageStorage } from "../../core/contracts.js";
import ApiFeatures from "../../utils/apiFeatures.js";
import { getPageParams, pageMeta, type Paginated } from "../../utils/pagination.js";
import { toSlug } from "../../utils/slug.js";
import type { Id, ImageAsset, UploadedFile, UploadedFiles } from "../../types/common.js";

// Multipart form fields arrive as strings; arithmetic below coerces them like the original code
export interface ProductInput {
  name?: string;
  price?: number;
  discount?: number;
  categoryId?: string;
  subcategoryId?: string;
  brandId?: string;
}

export interface ProductServiceDeps {
  model: Model<IProduct>;
  subcategories: Model<ISubcategory>;
  brands: Model<IBrand>;
  images: IImageStorage;
}

export interface StockItem {
  productId: Types.ObjectId | string;
  quantity: number;
}

export class ProductService extends BaseService<IProduct> {
  private readonly subcategories: Model<ISubcategory>;
  private readonly brands: Model<IBrand>;
  private readonly images: IImageStorage;

  constructor({ model, subcategories, brands, images }: ProductServiceDeps) {
    super(model);
    this.subcategories = subcategories;
    this.brands = brands;
    this.images = images;
  }

  static #finalPrice(price: number, discount: number): number {
    return price - price * (discount / 100);
  }

  async #uploadSubImages(files: UploadedFile[], folder: string): Promise<ImageAsset[]> {
    const subImages: ImageAsset[] = [];
    for (const file of files) {
      subImages.push(await this.images.upload(file.path, folder));
    }
    return subImages;
  }

  async list(query: ParsedQs): Promise<Paginated<HydratedDocument<IProduct>>> {
    const params = getPageParams(query);
    const features = new ApiFeatures(this.model.find(), query)
      .filter()
      .search()
      .sort()
      .select()
      .paginate();
    const [data, total] = await Promise.all([
      features.mongooseQuery,
      this.model.countDocuments(features.mongooseQuery.getFilter()),
    ]);
    return { data, pagination: pageMeta(params, total) };
  }

  async create(
    data: ProductInput & { name: string; price: number },
    files: UploadedFiles | undefined,
    userId: Types.ObjectId
  ) {
    const { name, price, discount = 0, categoryId, subcategoryId, brandId } = data;

    if (!(await this.subcategories.findOne({ _id: subcategoryId, categoryId }))) {
      throw new AppError("Invalid category or subcategory", 400);
    }
    if (!(await this.brands.findById(brandId))) {
      throw new AppError("Invalid brand", 400);
    }
    const mainImageFile = files?.mainImage?.[0];
    if (!mainImageFile) {
      throw new AppError("Main image is required", 400);
    }

    const customId = nanoid();
    const folder = `product/${customId}`;
    const subImageFiles = files?.subImages;

    return this.model.create({
      ...data,
      slug: toSlug(name),
      finalPrice: ProductService.#finalPrice(price, discount),
      customId,
      createBy: userId,
      mainImage: await this.images.upload(mainImageFile.path, folder),
      ...(subImageFiles?.length && {
        subImages: await this.#uploadSubImages(subImageFiles, `${folder}/subImages`),
      }),
    });
  }

  async update(
    productId: Id,
    data: ProductInput,
    files: UploadedFiles | undefined,
    userId: Types.ObjectId
  ) {
    const product = await this.findOrFail({ _id: productId }, "Can Not find Product");
    const { name, price, discount, categoryId, subcategoryId, brandId } = data;
    const changes: Omit<Partial<IProduct>, keyof ProductInput> & ProductInput = {
      ...data,
      updateBy: userId,
    };

    // Kept from the original: only checked when categoryId is absent
    if (!categoryId && subcategoryId) {
      if (!(await this.subcategories.findOne({ _id: subcategoryId, categoryId }))) {
        throw new AppError("In-Valid category or subcategory", 400);
      }
    }
    if (brandId && !(await this.brands.findById(brandId))) {
      throw new AppError("In-Valid brand", 400);
    }

    if (name) {
      changes.slug = toSlug(name);
    }
    if (price || discount) {
      changes.finalPrice = ProductService.#finalPrice(
        price || product.price,
        discount || product.discount
      );
    }

    const folder = `product/${product.customId}`;
    const mainImageFile = files?.mainImage?.[0];
    if (mainImageFile) {
      changes.mainImage = await this.images.replace(
        mainImageFile.path,
        `${folder}/mainImage`,
        product.mainImage?.public_id
      );
    }
    const subImageFiles = files?.subImages;
    if (subImageFiles?.length) {
      changes.subImages = await this.#uploadSubImages(subImageFiles, `${folder}/subImages`);
    }

    return this.model.findByIdAndUpdate(productId, changes, { new: true });
  }

  findActive(productId: Id) {
    return this.findOrFail({ _id: productId, isDeleted: false }, "In-Valid Product");
  }

  // A product that is not deleted and has at least `quantity` in stock
  async findPurchasable(productId: Id, quantity: number) {
    const product = await this.model.findOne({
      _id: productId,
      stock: { $gte: quantity },
      isDeleted: false,
    });
    if (!product) {
      throw new AppError(`Product ${productId.toString()} is unavailable or out of stock`, 400);
    }
    return product;
  }

  // Decrements stock only where enough is left, so concurrent orders cannot oversell
  async reserveStock(items: StockItem[], session?: ClientSession): Promise<void> {
    for (const { productId, quantity } of items) {
      const { modifiedCount } = await this.model.updateOne(
        { _id: productId, stock: { $gte: quantity }, isDeleted: false },
        { $inc: { stock: -quantity } },
        { session }
      );
      if (!modifiedCount) {
        throw new AppError(`Product ${productId.toString()} is out of stock`, 400);
      }
    }
  }

  async releaseStock(items: StockItem[], session?: ClientSession): Promise<void> {
    for (const { productId, quantity } of items) {
      await this.model.updateOne(
        { _id: productId },
        { $inc: { stock: quantity } },
        { session }
      );
    }
  }
}

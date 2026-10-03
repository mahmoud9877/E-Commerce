import { nanoid } from "nanoid";
import type { ClientSession, Model, Types } from "mongoose";
import type { ParsedQs } from "qs";
import type { IProduct } from "../../db/models/Product.Model.js";
import type { ISubcategory } from "../../db/models/Subcategory.Model.js";
import type { IBrand } from "../../db/models/Brand.Model.js";
import { AppError } from "../../core/AppError.js";
import { BaseService } from "../../core/BaseService.js";
import type { IImageStorage } from "../../core/contracts.js";
import { parseListQuery, type ListSpec } from "../../utils/listQuery.js";
import { toSlug } from "../../utils/slug.js";
import type { Id, ImageAsset, UploadedFile, UploadedFiles } from "../../types/common.js";

// Validated and converted by the route's Joi schema (numbers are numbers, even from multipart)
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

// What the public catalog may filter, sort and return; everything else in the query is ignored
const LIST_SPEC: ListSpec = {
  filters: {
    categoryId: "id",
    subcategoryId: "id",
    brandId: "id",
    price: "number",
    finalPrice: "number",
    discount: "number",
    stock: "number",
    size: "string",
    colors: "string",
    slug: "string",
  },
  sortable: ["name", "price", "finalPrice", "discount", "stock", "createdAt"],
  selectable: [
    "customId", "name", "slug", "description", "size", "colors", "stock", "price", "discount",
    "finalPrice", "mainImage", "subImages", "categoryId", "subcategoryId", "brandId",
    "createdAt", "updatedAt",
  ],
  searchable: ["name", "description"],
};

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

  list(query: ParsedQs) {
    // "size" is both the page size (?size=20) and the product-size filter (?size=m): a number is
    // the page size, anything else filters by size
    const filterQuery = /^\d+$/.test(String(query.size)) ? { ...query, size: undefined } : query;
    const { filter, sort, select } = parseListQuery(filterQuery, LIST_SPEC);
    // Applied after the user's filter so it can never be overridden
    return this.paginate({ ...filter, isDeleted: false }, query, [], select, sort);
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

    // Whichever of the two changes, the resulting pair must still belong together
    if (categoryId || subcategoryId) {
      const pair = {
        _id: subcategoryId ?? product.subcategoryId,
        categoryId: categoryId ?? product.categoryId,
      };
      if (!(await this.subcategories.exists(pair))) {
        throw new AppError("In-Valid category or subcategory", 400);
      }
    }
    if (brandId && !(await this.brands.findById(brandId))) {
      throw new AppError("In-Valid brand", 400);
    }

    if (name) {
      changes.slug = toSlug(name);
    }
    // ?? rather than ||, so a discount of 0 is applied instead of ignored
    if (price !== undefined || discount !== undefined) {
      changes.finalPrice = ProductService.#finalPrice(
        price ?? product.price,
        discount ?? product.discount
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

  // Products that still exist, in no particular order (e.g. a wishlist)
  findActiveMany(productIds: Id[]) {
    return this.model.find({ _id: { $in: productIds }, isDeleted: false });
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

import type { Request, Response } from "express";
import { BaseController } from "../../core/BaseController.js";
import type { UploadedFiles } from "../../types/common.js";
import type { WishlistService } from "../user/wishlist.service.js";
import type { ProductService } from "./product.service.js";

type ProductParams = { productId: string };

export class ProductController extends BaseController {
  constructor(
    private readonly productService: ProductService,
    private readonly wishlist: WishlistService
  ) {
    super();
  }

  // multer's .fields() always yields the keyed-object form of req.files
  static #files(req: Request): UploadedFiles | undefined {
    return req.files as UploadedFiles | undefined;
  }

  async getProducts(req: Request, res: Response) {
    const { data: productList, pagination } = await this.productService.list(req.query);
    return res.status(200).json({ message: "Done", productList, pagination });
  }

  async createProduct(req: Request, res: Response) {
    const product = await this.productService.create(
      req.body,
      ProductController.#files(req),
      BaseController.currentUser(req)._id
    );
    return res
      .status(201)
      .json({ message: "Product created successfully", product });
  }

  async updateProduct(req: Request<ProductParams>, res: Response) {
    const updatedProduct = await this.productService.update(
      req.params.productId,
      req.body,
      ProductController.#files(req),
      BaseController.currentUser(req)._id
    );
    return res
      .status(201)
      .json({ message: "Product updated successfully", updatedProduct });
  }

  async wishList(req: Request<ProductParams>, res: Response) {
    await this.wishlist.add(
      BaseController.currentUser(req)._id,
      req.params.productId
    );
    return res.status(200).json({ message: "Done" });
  }

  async deleteFromWishList(req: Request<ProductParams>, res: Response) {
    await this.wishlist.remove(
      BaseController.currentUser(req)._id,
      req.params.productId
    );
    return res.json({ message: "Done" });
  }
}

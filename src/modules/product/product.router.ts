import type { Router } from "express";
import { BaseRouter } from "../../core/BaseRouter.js";
import type { IAuthenticator } from "../../core/contracts.js";
import { Validator } from "../../middleware/validation.js";
import { FileUpload } from "../../services/FileUpload.js";
import type { ProductController } from "./product.controller.js";
import * as validators from "./product.validation.js";

const PRODUCT_IMAGES = [
  { name: "mainImage", maxCount: 1 },
  { name: "subImages", maxCount: 5 },
];

export class ProductRouter extends BaseRouter<ProductController> {
  constructor(
    controller: ProductController,
    auth: IAuthenticator,
    private readonly reviewRouter: Router
  ) {
    super(controller, auth);
  }

  protected initRoutes(router: Router): void {
    const { controller, reviewRouter } = this;
    const loggedIn = this.authenticated();
    const adminOnly = this.adminOnly();

    router.use("/:productId/review", reviewRouter);

    router.get("/", controller.getProducts);

    router.post(
      "/",
      adminOnly,
      FileUpload.image().fields(PRODUCT_IMAGES),
      Validator.validate(validators.createProduct),
      controller.createProduct
    );

    router.put(
      "/:productId",
      adminOnly,
      FileUpload.image().fields(PRODUCT_IMAGES),
      Validator.validate(validators.updateProduct),
      controller.updateProduct
    );

    router.patch(
      "/:productId/wishlist/add",
      loggedIn,
      Validator.validate(validators.wishlist),
      controller.wishList
    );

    router.patch(
      "/:productId/wishlist/remove",
      loggedIn,
      Validator.validate(validators.wishlist),
      controller.deleteFromWishList
    );
  }
}

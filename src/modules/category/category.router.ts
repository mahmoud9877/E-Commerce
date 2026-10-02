import type { Router } from "express";
import { BaseRouter } from "../../core/BaseRouter.js";
import type { IAuthenticator } from "../../core/contracts.js";
import { Validator } from "../../middleware/validation.js";
import { FileUpload } from "../../services/FileUpload.js";
import type { CategoryController } from "./category.controller.js";
import * as validators from "./category.validation.js";

export class CategoryRouter extends BaseRouter<CategoryController> {
  constructor(
    controller: CategoryController,
    auth: IAuthenticator,
    private readonly subcategoryRouter: Router
  ) {
    super(controller, auth);
  }

  protected initRoutes(router: Router): void {
    const { controller, subcategoryRouter } = this;
    const adminOnly = this.adminOnly();
    const uploadImage = FileUpload.singleImage();

    router.use("/:categoryId/subcategory", subcategoryRouter);

    router.get("/", controller.getCategories);

    router.post(
      "/",
      adminOnly,
      uploadImage,
      Validator.validate(validators.createCategory),
      controller.createCategory
    );

    router.put(
      "/:categoryId",
      adminOnly,
      uploadImage,
      Validator.validate(validators.updateCategory),
      controller.updateCategory
    );

    router.delete(
      "/",
      adminOnly,
      Validator.validate(validators.deleteCategory),
      controller.deleteCategory
    );
  }
}


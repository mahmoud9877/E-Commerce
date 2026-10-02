import type { Router } from "express";
import { BaseRouter } from "../../core/BaseRouter.js";
import { Validator } from "../../middleware/validation.js";
import { FileUpload } from "../../services/FileUpload.js";
import type { SubcategoryController } from "./subcategory.controller.js";
import * as validators from "./subcategory.validation.js";

export class SubcategoryRouter extends BaseRouter<SubcategoryController> {
  protected initRoutes(router: Router): void {
    const { controller } = this;
    const adminOnly = this.adminOnly();
    const uploadImage = FileUpload.singleImage();

    router.get("/", controller.getSubcategories);

    router.post(
      "/",
      adminOnly,
      uploadImage,
      Validator.validate(validators.createSubcategory),
      controller.createSubcategory
    );

    router.put(
      "/:subcategoryId",
      adminOnly,
      uploadImage,
      Validator.validate(validators.updateSubcategory),
      controller.updateSubcategory
    );
  }
}


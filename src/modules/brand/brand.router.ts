import type { Router } from "express";
import { BaseRouter } from "../../core/BaseRouter.js";
import { Validator } from "../../middleware/validation.js";
import { FileUpload } from "../../services/FileUpload.js";
import type { BrandController } from "./brand.controller.js";
import * as validators from "./brand.validation.js";

export class BrandRouter extends BaseRouter<BrandController> {
  protected initRoutes(router: Router): void {
    const { controller } = this;
    const adminOnly = this.adminOnly();
    const uploadImage = FileUpload.singleImage();

    router.get("/", controller.getBrand);

    router.post(
      "/",
      adminOnly,
      uploadImage,
      Validator.validate(validators.createBrand),
      controller.createBrand
    );

    router.put(
      "/:brandId",
      adminOnly,
      uploadImage,
      Validator.validate(validators.updateBrand),
      controller.updateBrand
    );

    router.delete("/", adminOnly, controller.deleteBrand);
  }
}


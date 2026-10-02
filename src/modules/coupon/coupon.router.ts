import type { Router } from "express";
import { BaseRouter } from "../../core/BaseRouter.js";
import { Validator } from "../../middleware/validation.js";
import { FileUpload } from "../../services/FileUpload.js";
import type { CouponController } from "./coupon.controller.js";
import * as validators from "./coupon.validation.js";

export class CouponRouter extends BaseRouter<CouponController> {
  protected initRoutes(router: Router): void {
    const { controller } = this;
    const adminOnly = this.adminOnly();
    const uploadImage = FileUpload.singleImage();

    router.get("/", controller.getCoupon);

    router.post(
      "/",
      adminOnly,
      uploadImage,
      Validator.validate(validators.createCoupon),
      controller.createCoupon
    );

    router.put(
      "/:couponId",
      adminOnly,
      uploadImage,
      Validator.validate(validators.updateCoupon),
      controller.updateCoupon
    );
  }
}


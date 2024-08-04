import { Router } from "express";
import subcategoryRouter from "../subcategory/subcategory.router.js";
import { auth } from "../../middleware/auth.js";
import { validation } from "../../middleware/validation.js";
import * as validators from "../../modules/coupon/coupon.validation.js";
import { fileUpload, fileValidation } from "../../utils/multer.js";
import * as controllerCoupon from "./controller/coupon.js";
import { endpoint } from "./coupon.endPoint.js";
const router = Router();

router.use("/:categoryId/subcategory", subcategoryRouter);

router.get("/", controllerCoupon.getCoupon);

router.post(
  "/",
  auth(endpoint.create),
  fileUpload(fileValidation.image).single("image"),
  validation(validators.createCoupon),
  controllerCoupon.createCoupon
);

router.put(
  "/:couponId",
  auth(endpoint.update),
  fileUpload(fileValidation.image).single("image"),
  validation(validators.updateCoupon),
  controllerCoupon.updateCoupon
);

export default router;

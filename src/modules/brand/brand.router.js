import { Router } from "express";
import { auth } from "../../middleware/auth.js";
import { validation } from "../../middleware/validation.js";
import * as validators from "../../modules/brand/brand.validation.js";
import { fileUpload, fileValidation } from "../../utils/multer.js";
import * as controllerBrand from "./controller/brand.js";
import { endpoint } from "./brand.endPoint.js";
const router = Router();

router.get("/", controllerBrand.getBrand);
router.post(
  "/",
  auth(endpoint.create),
  fileUpload(fileValidation.image).single("image"),
  validation(validators.createBrand),
  controllerBrand.createBrand
);

router.put(
  "/:brandId",
  auth(endpoint.update),
  fileUpload(fileValidation.image).single("image"),
  validation(validators.updateBrand),
  controllerBrand.updateBrand
);

export default router;

import { Router } from "express";
import subcategoryRouter from "../subcategory/subcategory.router.js";
import { auth } from "../../middleware/auth.js";
import { validation } from "../../middleware/validation.js";
import * as validators from "../../modules/category/category.validation.js";
import { fileUpload, fileValidation } from "../../utils/multer.js";
import * as controllerCategory from "./controller/category.js";

import { endpoint } from "./category.endPoint.js";

const router = Router();

router.use("/:categoryId/subcategory", subcategoryRouter);

router.get("/", controllerCategory.getCategories);

router.post(
  "/",
  auth(endpoint.create),
  fileUpload(fileValidation.image).single("image"),
  validation(validators.createCategory),
  controllerCategory.createCategory
);

router.put(
  "/:categoryId",
  auth(endpoint.update),
  fileUpload(fileValidation.image).single("image"),
  controllerCategory.updateCategory
);

export default router;

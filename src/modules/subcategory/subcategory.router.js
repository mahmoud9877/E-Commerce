import { Router } from "express";
import { auth } from "../../middleware/auth.js";
import { endpoint } from "./subcategory.endPoint.js";
import { validation } from "../../middleware/validation.js";
import { fileUpload, fileValidation } from "../../utils/multer.js";
import * as controllerSubcategory from "./controller/subcategory.js";
import * as validators from "./subcategory.validation.js";
const router = Router({ mergeParams: true });

router.get("/", controllerSubcategory.getSubcategories);
router.post(
  "/",
  auth(endpoint.create),
  fileUpload(fileValidation.image).single("image"),
  validation(validators.createSubcategory),
  controllerSubcategory.createSubcategory
);
router.put(
  "/:subcategoryId",
  auth(endpoint.update),
  fileUpload(fileValidation.image).single("image"),
  validation(validators.updateSubcategory),
  controllerSubcategory.updateSubcategory
);

export default router;

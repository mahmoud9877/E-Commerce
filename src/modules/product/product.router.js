import { Router } from "express";
import reviewRouter from "../reviews/reviews.router.js";
import { fileUpload, fileValidation } from "../../utils/multer.js";
import { auth } from "../../middleware/auth.js";
import * as productController from "../product/controller/product.js";
import { endpoint } from "./product.endPoint.js";
const router = Router();

router.use("/:productId/review", reviewRouter);

router.get("/", productController.getProducts);

router.post(
  "/",
  auth(endpoint.create),
  fileUpload(fileValidation.image).fields([
    { name: "mainImage", maxCount: 1 },
    { name: "subImages", maxCount: 5 },
  ]),
  productController.createProduct
);

router.put(
  "/:productId",
  auth(endpoint.update),
  fileUpload(fileValidation.image).fields([
    { name: "mainImage", maxCount: 1 },
    { name: "subImages", maxCount: 5 },
  ]),
  productController.updateProduct
);

router.patch(
  "/:productId/wishlist/add",
  auth(endpoint.wishlist),
  productController.wishList
);

router.patch(
  "/:productId/wishlist/remove",
  auth(endpoint.wishlist),
  productController.deleteFromWishList
);

export default router;

import { Router } from "express";
import * as validators from "../cart/cart.validation.js";
import { auth } from "../../middleware/auth.js";
import * as cartController from "../cart/controller/cart.js";
import { endpoint } from "./cart.endPoint.js";
import { validation } from "../../middleware/validation.js";
const router = Router();

router.post("/", auth(endpoint.addToCart), cartController.addToCart);

router.patch(
  "/:productId/remove",
  auth(endpoint.deleteFromCart),
  validation(validators.deleteFromCart),
  cartController.deleteFromCart
);


export default router;

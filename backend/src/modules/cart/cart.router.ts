import type { Router } from "express";
import { BaseRouter } from "../../core/BaseRouter.js";
import { Validator } from "../../middleware/validation.js";
import type { CartController } from "./cart.controller.js";
import * as validators from "./cart.validation.js";

export class CartRouter extends BaseRouter<CartController> {
  protected initRoutes(router: Router): void {
    const { controller } = this;
    const loggedIn = this.authenticated();

    router.get("/", loggedIn, controller.getCart);

    router.post(
      "/",
      loggedIn,
      Validator.validate(validators.addToCart),
      controller.addToCart
    );

    router.patch(
      "/:productId/remove",
      loggedIn,
      Validator.validate(validators.removeFromCart),
      controller.deleteFromCart
    );

    router.delete("/deleteCart", loggedIn, controller.clearCart);
  }
}

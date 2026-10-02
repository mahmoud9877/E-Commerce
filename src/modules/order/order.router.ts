import express, { type Router } from "express";
import { BaseRouter } from "../../core/BaseRouter.js";
import { Validator } from "../../middleware/validation.js";
import type { OrderController } from "./order.controller.js";
import * as validators from "./order.validation.js";

export class OrderRouter extends BaseRouter<OrderController> {
  protected initRoutes(router: Router): void {
    const { controller } = this;
    const loggedIn = this.authenticated();
    const adminOnly = this.adminOnly();

    router.post(
      "/",
      loggedIn,
      Validator.validate(validators.createOrder),
      controller.createOrder
    );

    router.patch(
      "/:orderId/cancel",
      loggedIn,
      Validator.validate(validators.cancelOrder),
      controller.cancelOrder
    );

    router.post(
      "/webhook",
      express.raw({ type: "application/json" }),
      controller.webhook
    );

    router.patch(
      "/:orderId/delivered",
      adminOnly,
      Validator.validate(validators.deliveredOrder),
      controller.deliveredOrder
    );
  }
}


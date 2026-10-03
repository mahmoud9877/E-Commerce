import type { Router } from "express";
import { BaseRouter } from "../../core/BaseRouter.js";
import { Validator } from "../../middleware/validation.js";
import type { NotificationController } from "./notification.controller.js";
import * as validators from "./notification.validation.js";

export class NotificationRouter extends BaseRouter<NotificationController> {
  protected initRoutes(router: Router): void {
    const { controller } = this;
    const loggedIn = this.authenticated();

    router.get(
      "/",
      loggedIn,
      Validator.validate(validators.listNotifications),
      controller.getNotifications
    );

    // Declared before "/:notificationId/read" so "read-all" is never taken for an id
    router.patch("/read-all", loggedIn, controller.markAllRead);

    router.patch(
      "/:notificationId/read",
      loggedIn,
      Validator.validate(validators.markRead),
      controller.markRead
    );
  }
}

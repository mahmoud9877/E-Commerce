import type { Router } from "express";
import { BaseRouter } from "../../core/BaseRouter.js";
import { Validator } from "../../middleware/validation.js";
import type { AuthController } from "./auth.controller.js";
import * as validators from "./auth.validation.js";

export class AuthRouter extends BaseRouter<AuthController> {
  protected initRoutes(router: Router): void {
    const { controller } = this;

    router.get("/", controller.getUser);

    router.post("/signup", Validator.validate(validators.signup), controller.signup);

    router.get(
      "/confirmEmail/:token",
      Validator.validate(validators.token),
      controller.confirmEmail
    );

    router.get(
      "/NewConfirmEmail/:token",
      Validator.validate(validators.token),
      controller.requestNewConfirmEmail
    );

    router.patch("/sendCode", Validator.validate(validators.sendCode), controller.sendCode);

    router.post("/login", Validator.validate(validators.login), controller.login);

    router.patch(
      "/forgetPassword",
      Validator.validate(validators.forgetPassword),
      controller.forgetPassword
    );
  }
}


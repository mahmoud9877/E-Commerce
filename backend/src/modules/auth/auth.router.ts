import type { Router } from "express";
import { BaseRouter } from "../../core/BaseRouter.js";
import { RateLimits } from "../../middleware/rateLimit.js";
import { Validator } from "../../middleware/validation.js";
import type { AuthController } from "./auth.controller.js";
import * as validators from "./auth.validation.js";

export class AuthRouter extends BaseRouter<AuthController> {
  protected initRoutes(router: Router): void {
    const { controller } = this;

    router.get("/", this.adminOnly(), controller.getUser);

    router.post("/signup", ...RateLimits.signup, Validator.validate(validators.signup), controller.signup);

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

    router.patch("/sendCode", ...RateLimits.sendCode, Validator.validate(validators.sendCode), controller.sendCode);

    router.post("/login", ...RateLimits.login, Validator.validate(validators.login), controller.login);

    router.post("/refresh", ...RateLimits.refresh, Validator.validate(validators.refreshToken), controller.refresh);

    router.post("/logout", Validator.validate(validators.refreshToken), controller.logout);

    router.patch(
      "/forgetPassword",
      ...RateLimits.forgetPassword,
      Validator.validate(validators.forgetPassword),
      controller.forgetPassword
    );
  }
}


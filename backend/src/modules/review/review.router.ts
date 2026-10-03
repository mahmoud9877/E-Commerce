import type { Router } from "express";
import { BaseRouter } from "../../core/BaseRouter.js";
import { Validator } from "../../middleware/validation.js";
import type { ReviewController } from "./review.controller.js";
import * as validators from "./review.validation.js";

export class ReviewRouter extends BaseRouter<ReviewController> {
  protected initRoutes(router: Router): void {
    const { controller } = this;
    const loggedIn = this.authenticated();

    router.get("/", Validator.validate(validators.listReviews), controller.getReviews);

    router.post(
      "/",
      loggedIn,
      Validator.validate(validators.createReview),
      controller.createReview
    );

    router.patch(
      "/:reviewId",
      loggedIn,
      Validator.validate(validators.updateReview),
      controller.updateReview
    );
  }
}


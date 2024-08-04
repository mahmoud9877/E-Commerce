import { Router } from "express";
import * as reviewController from "../reviews/controller/review.js";
import { auth } from "../../middleware/auth.js";
import { endpoint } from "./reviews.endPoint.js";
import { validation } from "../../middleware/validation.js";
import * as validators from "./reviews.validation.js";
const router = Router({ mergeParams: true });

router.post(
  "/",
  auth(endpoint.create),
  validation(validators.createReview),
  reviewController.createReview
);

router.patch(
  "/",
  auth(endpoint.update),
  validation(validators.updateReview),
  reviewController.updateReview
);

export default router;

import { Router } from "express";
import * as authController from "../auth/controller/registration.js";
import { validation } from "../../middleware/validation.js";
import * as validators from "./auth.validation.js";

const router = Router();
router.get("/", authController.getUser);

router.post("/signup",
  validation(validators.signup),
  authController.signup);

router.get(
  "/confirmEmail/:token",
  validation(validators.token),
  authController.confirmEmail
);

router.get(
  "/NewConfirmEmail/:token",
  validation(validators.token),
  authController.requestNewConfirmEmail
);

router.patch(
  "/sendCode",
  validation(validators.sendCode),
  authController.sendCode
);

router.post("/login",
  validation(validators.login),
  authController.login);

router.patch(
  "/forgetPassword",
  validation(validators.forgetPassword),
  authController.forgetPassword
);

export default router;

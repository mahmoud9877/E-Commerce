import type { Request, Response } from "express";
import { BaseController } from "../../core/BaseController.js";
import type { AuthService } from "./auth.service.js";
import { ConfirmResult, type EmailVerificationService } from "./emailVerification.service.js";
import type { PasswordResetService } from "./passwordReset.service.js";

export class AuthController extends BaseController {
  constructor(
    private readonly authService: AuthService,
    private readonly verification: EmailVerificationService,
    private readonly passwordReset: PasswordResetService
  ) {
    super();
  }

  async getUser(req: Request, res: Response) {
    const { data: userList, pagination } = await this.authService.getUsers(req.query);
    return res.json({ message: "Done", userList, pagination });
  }

  async signup(req: Request, res: Response) {
    const _id = await this.authService.signup(req.body, BaseController.baseUrl(req));
    return res.status(201).json({ message: "Done", _id });
  }

  async login(req: Request, res: Response) {
    const { token, user } = await this.authService.login(req.body);
    return res.status(200).json({ message: "Login successful", token, user });
  }

  async sendCode(req: Request, res: Response) {
    await this.passwordReset.sendCode(req.body);
    return res.status(200).json({ message: "Done" });
  }

  async confirmEmail(req: Request<{ token: string }>, res: Response) {
    const confirmed = await this.verification.confirmEmail(req.params.token);
    if (!confirmed) {
      return res.status(404).send(`<p>Not Register Account </P>`);
    }
    return res.status(200).redirect(process.env.FE_URL ?? "/");
  }

  async requestNewConfirmEmail(req: Request<{ token: string }>, res: Response) {
    const result = await this.verification.requestNewConfirmEmail(
      req.params.token,
      BaseController.baseUrl(req)
    );
    switch (result) {
      case ConfirmResult.NotRegistered:
        return res.status(404).redirect(`${process.env.FE_URL}/#/invalidEmail`);
      case ConfirmResult.AlreadyConfirmed:
        return res.status(404).redirect(`${process.env.FE_URL}`);
      case ConfirmResult.Sent:
        return res.status(201).send("<p>New Confirmation email sent</p>");
    }
  }

  async forgetPassword(req: Request, res: Response) {
    await this.passwordReset.forgetPassword(req.body);
    return res.status(200).json({ message: "Password updated successfully" });
  }
}

import type { Request, Response } from "express";
import { BaseController } from "../../core/BaseController.js";
import type { UserService } from "../user/user.service.js";
import type { AuthService } from "./auth.service.js";
import { ConfirmResult, type EmailVerificationService } from "./emailVerification.service.js";
import type { PasswordResetService } from "./passwordReset.service.js";
import type { ClientInfo, SessionService } from "./session.service.js";

export class AuthController extends BaseController {
  constructor(
    private readonly authService: AuthService,
    private readonly verification: EmailVerificationService,
    private readonly passwordReset: PasswordResetService,
    private readonly sessions: SessionService,
    private readonly users: UserService
  ) {
    super();
  }

  // Stored with each refresh token so a user can tell their sessions apart
  static #client(req: Request): ClientInfo {
    return { userAgent: req.get("user-agent"), ip: req.ip };
  }

  async getUser(req: Request, res: Response) {
    const { data: userList, pagination } = await this.users.list(req.query);
    return res.json({ message: "Done", userList, pagination });
  }

  async signup(req: Request, res: Response) {
    console.log("signup request body:", req.body);

    const _id = await this.authService.signup(req.body, BaseController.baseUrl(req));
    return res.status(201).json({ message: "Done", _id });
  }

  async login(req: Request, res: Response) {
    const { accessToken, refreshToken, expiresIn, user } = await this.authService.login(
      req.body,
      AuthController.#client(req)
    );
    return res.status(200).json({
      message: "Login successful",
      accessToken,
      refreshToken,
      expiresIn,
      // Deprecated alias of accessToken, kept so existing clients keep working
      token: accessToken,
      user,
    });
  }

  async refresh(req: Request, res: Response) {
    const tokens = await this.sessions.refresh(req.body.refreshToken, AuthController.#client(req));
    return res.status(200).json({ message: "Done", ...tokens });
  }

  async logout(req: Request, res: Response) {
    await this.sessions.revoke(req.body.refreshToken);
    return res.status(200).json({ message: "Logged out" });
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
    return res.redirect(process.env.FE_URL ?? "/");
  }

  async requestNewConfirmEmail(req: Request<{ token: string }>, res: Response) {
    const result = await this.verification.requestNewConfirmEmail(
      req.params.token,
      BaseController.baseUrl(req)
    );
    switch (result) {
      case ConfirmResult.NotRegistered:
        return res.redirect(`${process.env.FE_URL}/#/invalidEmail`);
      case ConfirmResult.AlreadyConfirmed:
        return res.redirect(`${process.env.FE_URL}`);
      case ConfirmResult.Sent:
        return res.status(201).send("<p>New Confirmation email sent</p>");
    }
  }

  async forgetPassword(req: Request, res: Response) {
    await this.passwordReset.forgetPassword(req.body);
    return res.status(200).json({ message: "Password updated successfully" });
  }
}

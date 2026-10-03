import type { Model } from "mongoose";
import type { IUser } from "../../db/models/User.model.js";
import { AppError } from "../../core/AppError.js";
import { BaseService } from "../../core/BaseService.js";
import type { IMailer, ITokenService } from "../../core/contracts.js";
import { Env } from "../../core/Env.js";
import { EmailTemplates } from "../../integrations/EmailTemplates.js";

export enum ConfirmResult {
  NotRegistered = "notRegistered",
  AlreadyConfirmed = "alreadyConfirmed",
  Sent = "sent",
}

// Owns the email-confirmation flow: issuing links, confirming and re-sending
export class EmailVerificationService extends BaseService<IUser> {
  constructor(
    model: Model<IUser>,
    private readonly tokens: ITokenService,
    private readonly mailer: IMailer
  ) {
    super(model);
  }

  #emailToken(email: string, expiresIn: number): string {
    return this.tokens.generate(
      { email },
      { signature: Env.get("EMAIL_TOKEN"), expiresIn }
    );
  }

  #decodeEmailToken(token: string): string | undefined {
    try {
      return this.tokens.verify<{ email: string }>(token, Env.get("EMAIL_TOKEN")).email;
    } catch {
      throw new AppError("Invalid or expired confirmation link", 400);
    }
  }

  async #send(params: {
    email: string;
    subject: string;
    link: string;
    rfLink: string;
  }): Promise<void> {
    const html = EmailTemplates.confirmEmail(params);
    await this.mailer.send({ to: params.email, subject: params.subject, html });
  }

  async sendSignupConfirmation(email: string, baseUrl: string): Promise<void> {
    const token = this.#emailToken(email, 60 * 5);
    const refreshToken = this.#emailToken(email, 60 * 60 * 24 * 30);
    await this.#send({
      email,
      subject: "Confirmation-Email",
      link: `${baseUrl}/auth/confirmEmail/${token}`,
      rfLink: `${baseUrl}/auth/NewConfirmEmail/${refreshToken}`,
    });
  }

  // Returns true when a matching account was confirmed
  async confirmEmail(token: string): Promise<boolean> {
    const email = this.#decodeEmailToken(token);
    if (!email) {
      throw new AppError("In-Valid Token Payload", 404);
    }
    const result = await this.model.updateOne(
      { email: email.toLowerCase() },
      { confirmEmail: true }
    );
    return Boolean(result.matchedCount);
  }

  async requestNewConfirmEmail(token: string, baseUrl: string): Promise<ConfirmResult> {
    let email: string | undefined;
    try {
      email = this.#decodeEmailToken(token);
    } catch {
      throw new AppError("Invalid Token Payload", 404);
    }
    if (!email) {
      throw new AppError("Invalid Token Payload", 404);
    }

    const user = await this.model.findOne({ email: email.toLowerCase() });
    if (!user) return ConfirmResult.NotRegistered;
    if (user.confirmEmail) return ConfirmResult.AlreadyConfirmed;

    const newToken = this.#emailToken(email.toLowerCase(), 60 * 2);
    await this.#send({
      email,
      subject: "Confirmation Email",
      link: `${baseUrl}/auth/confirmEmail/${newToken}`,
      rfLink: `${baseUrl}/auth/NewConfirmEmail/${token}`,
    });
    return ConfirmResult.Sent;
  }
}

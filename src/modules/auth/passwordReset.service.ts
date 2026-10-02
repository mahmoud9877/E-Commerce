import { customAlphabet } from "nanoid";
import type { Model } from "mongoose";
import type { IUser } from "../../../DB/model/User.model.js";
import { AppError } from "../../core/AppError.js";
import { BaseService } from "../../core/BaseService.js";
import type { IHasher, IMailer } from "../../core/contracts.js";
import { EmailTemplates } from "../../services/EmailTemplates.js";

export interface ForgetPasswordInput {
  email: string;
  code: string;
  password: string;
  cPassword: string;
}

// Owns the forgot-password flow: emailing a reset code and applying the new password
export class PasswordResetService extends BaseService<IUser> {
  readonly #generateCode = customAlphabet("123456789", 4);

  constructor(
    model: Model<IUser>,
    private readonly hasher: IHasher,
    private readonly mailer: IMailer
  ) {
    super(model);
  }

  async sendCode({ email }: { email: string }): Promise<void> {
    const user = await this.model.findOneAndUpdate(
      { email: email.toLowerCase() },
      { code: this.#generateCode() },
      { new: true }
    );
    if (!user) {
      throw new AppError("Not Registered", 404);
    }

    const html = EmailTemplates.resetPasswordCode({ code: user.code });
    await this.mailer.send({ to: email, subject: "Forget Password", html });
  }

  async forgetPassword({ email, code, password, cPassword }: ForgetPasswordInput): Promise<void> {
    const user = await this.findOrFail(
      { email: email.toLowerCase() },
      "Not Registered Account"
    );
    // Stored code is a number, the input a string
    if (String(user.code) !== String(code)) {
      throw new AppError("Incorrect code", 400);
    }
    if (password !== cPassword) {
      throw new AppError("Passwords do not match", 400);
    }

    user.password = this.hasher.hash(password);
    user.code = null;
    await user.save();
  }
}

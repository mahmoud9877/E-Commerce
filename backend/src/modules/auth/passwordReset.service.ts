import { customAlphabet } from "nanoid";
import type { Model } from "mongoose";
import type { IUser } from "../../db/models/User.model.js";
import { AppError } from "../../core/AppError.js";
import { BaseService } from "../../core/BaseService.js";
import type { IHasher, IMailer } from "../../core/contracts.js";
import { EmailTemplates } from "../../integrations/EmailTemplates.js";
import type { SessionService } from "./session.service.js";

export interface ForgetPasswordInput {
  email: string;
  code: string;
  password: string;
  cPassword: string;
}

const CODE_TTL_MS = 10 * 60 * 1000;
const MAX_CODE_ATTEMPTS = 5;

// Owns the forgot-password flow: emailing a reset code and applying the new password
export class PasswordResetService extends BaseService<IUser> {
  readonly #generateCode = customAlphabet("123456789", 6);

  constructor(
    model: Model<IUser>,
    private readonly hasher: IHasher,
    private readonly mailer: IMailer,
    private readonly sessions: SessionService
  ) {
    super(model);
  }

  async sendCode({ email }: { email: string }): Promise<void> {
    const now = new Date();
    const code = Number(this.#generateCode());
    const filter = { email: email.toLowerCase() };
    // A new attempt budget only starts once the previous code has expired. Resending while a
    // code is still active swaps the code but keeps its expiry and used attempts, so
    // "resend, guess, resend" cannot get around MAX_CODE_ATTEMPTS
    const user =
      (await this.model.findOneAndUpdate(
        { ...filter, $or: [{ codeExpiresAt: null }, { codeExpiresAt: { $lte: now } }] },
        { code, codeExpiresAt: new Date(now.getTime() + CODE_TTL_MS), codeAttempts: 0 },
        { new: true }
      )) ?? (await this.model.findOneAndUpdate(filter, { code }, { new: true }));
    // Unknown emails get the same response, so this endpoint cannot be used to find accounts
    if (!user) return;

    const html = EmailTemplates.resetPasswordCode({ code: user.code });
    await this.mailer.send({ to: email, subject: "Forget Password", html });
  }

  async forgetPassword({ email, code, password, cPassword }: ForgetPasswordInput): Promise<void> {
    if (password !== cPassword) {
      throw new AppError("Passwords do not match", 400);
    }
    // Count the attempt in the same atomic step that checks the limit, so concurrent
    // guesses cannot all read the same attempt count and slip past it
    const user = await this.model.findOneAndUpdate(
      {
        email: email.toLowerCase(),
        code: { $ne: null },
        codeExpiresAt: { $gt: new Date() },
        codeAttempts: { $lt: MAX_CODE_ATTEMPTS },
      },
      { $inc: { codeAttempts: 1 } },
      { new: true }
    );
    if (!user) {
      throw new AppError("Invalid or expired code, request a new one", 400);
    }
    // Stored code is a number, the input a string
    if (String(user.code) !== String(code)) {
      throw new AppError("Incorrect code", 400);
    }

    user.password = await this.hasher.hash(password);
    user.code = null;
    user.codeExpiresAt = null;
    user.codeAttempts = 0;
    // Login tokens issued before this moment stop working (checked in AuthMiddleware)
    user.changePasswordTime = new Date();
    await user.save();
    await this.sessions.revokeAllForUser(user._id);
  }
}

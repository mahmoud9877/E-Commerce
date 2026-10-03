import type { Model, Types } from "mongoose";
import type { IUser } from "../../db/models/User.model.js";
import { AppError } from "../../core/AppError.js";
import { BaseService } from "../../core/BaseService.js";
import type { IHasher } from "../../core/contracts.js";
import { assertCanSignIn } from "../user/user.service.js";
import type { EmailVerificationService } from "./emailVerification.service.js";
import type { ClientInfo, SessionService, TokenPair } from "./session.service.js";

export interface SignupInput {
  userName: string;
  email: string;
  password: string;
}

export interface LoginInput {
  email: string;
  password: string;
}

export interface LoginResult extends TokenPair {
  user: { id: Types.ObjectId; userName: string; email: string };
}

// Owns account registration and login
export class AuthService extends BaseService<IUser> {
  constructor(
    model: Model<IUser>,
    private readonly sessions: SessionService,
    private readonly hasher: IHasher,
    private readonly verification: EmailVerificationService
  ) {
    super(model);
  }

  async signup({ userName, email, password }: SignupInput, baseUrl: string): Promise<Types.ObjectId> {
    const normalizedEmail = email.toLowerCase();
    await this.ensureNotExists({ email: normalizedEmail }, "Email Exist");

    // Created first so a concurrent signup fails on the unique email index before any email goes out
    const { _id } = await this.model.create({
      userName,
      email: normalizedEmail,
      password: await this.hasher.hash(password),
    });
    try {
      console.log("Sending signup confirmation email to:", normalizedEmail);
      // await this.verification.sendSignupConfirmation(normalizedEmail, baseUrl);
    } catch (err) {
      // Without the confirmation email the account could never be activated, so let them sign up again
      await this.model.deleteOne({ _id });
      throw err;
    }
    return _id;
  }

  async login({ email, password }: LoginInput, client: ClientInfo = {}): Promise<LoginResult> {
    const user = await this.model.findOne({ email: email.toLowerCase(), isDeleted: { $ne: true } });
    // Same answer for unknown email and wrong password, so accounts cannot be probed
    if (!user || !(await this.hasher.compare(password, user.password))) {
      throw new AppError("Invalid email or password", 401);
    }
    assertCanSignIn(user);

    const tokens = await this.sessions.start(user, client);
    user.status = "online";
    await user.save();

    return {
      ...tokens,
      user: { id: user._id, userName: user.userName, email: user.email },
    };
  }
}

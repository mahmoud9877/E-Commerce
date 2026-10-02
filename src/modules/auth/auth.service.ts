import type { ParsedQs } from "qs";
import type { Model, Types } from "mongoose";
import type { IUser } from "../../../DB/model/User.model.js";
import { AppError } from "../../core/AppError.js";
import { BaseService } from "../../core/BaseService.js";
import type { IHasher, ITokenService } from "../../core/contracts.js";
import type { EmailVerificationService } from "./emailVerification.service.js";

export interface SignupInput {
  userName: string;
  email: string;
  password: string;
}

export interface LoginInput {
  email: string;
  password: string;
}

export interface LoginResult {
  token: string;
  user: { id: Types.ObjectId; userName: string; email: string };
}

// Owns account registration and login
export class AuthService extends BaseService<IUser> {
  constructor(
    model: Model<IUser>,
    private readonly tokens: ITokenService,
    private readonly hasher: IHasher,
    private readonly verification: EmailVerificationService
  ) {
    super(model);
  }

  getUsers(query: ParsedQs) {
    return this.paginate({ isDeleted: false }, query);
  }

  async signup({ userName, email, password }: SignupInput, baseUrl: string): Promise<Types.ObjectId> {
    await this.ensureNotExists({ email: email.toLowerCase() }, "Email Exist");
    await this.verification.sendSignupConfirmation(email, baseUrl);

    const { _id } = await this.model.create({
      userName,
      email,
      password: this.hasher.hash(password),
    });
    return _id;
  }

  async login({ email, password }: LoginInput): Promise<LoginResult> {
    const user = await this.findOrFail(
      { email: email.toLowerCase() },
      "Email Not found"
    );
    if (!this.hasher.compare(password, user.password)) {
      throw new AppError("In-Valid Login", 404);
    }

    const token = this.tokens.generate(
      { id: user._id, userName: user.userName },
      { expiresIn: 30 * 60 * 24 * 365 }
    );
    user.status = "online";
    await user.save();

    return {
      token,
      user: { id: user._id, userName: user.userName, email: user.email },
    };
  }
}

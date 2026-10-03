import type { ClientSession, Model, Types } from "mongoose";
import type { ParsedQs } from "qs";
import { roles, type IUser, type UserDocument } from "../../db/models/User.model.js";
import { AppError } from "../../core/AppError.js";
import { BaseService } from "../../core/BaseService.js";
import type { Id } from "../../types/common.js";

// Never returned by the users listing
const PRIVATE_FIELDS = "-password -code -codeExpiresAt -codeAttempts";

type SignInState = Pick<IUser, "isDeleted" | "status" | "confirmEmail">;

// The one rule for whether an account may hold a session (login, refresh, every authenticated request)
export function assertCanSignIn<T extends SignInState>(user: T | null | undefined): asserts user is T {
  if (!user || user.isDeleted) {
    throw new AppError("Not registered account", 401);
  }
  if (user.status === "blocked") {
    throw new AppError("This account is blocked", 403);
  }
  if (!user.confirmEmail) {
    throw new AppError("Please confirm your email first", 403);
  }
}

// Owns reads of the users collection for other modules. Credential fields (password,
// reset code, email confirmation) are written only by the auth module's services.
export class UserService extends BaseService<IUser> {
  constructor(model: Model<IUser>) {
    super(model);
  }

  list(query: ParsedQs) {
    return this.paginate({ isDeleted: { $ne: true } }, query, [], PRIVATE_FIELDS);
  }

  findById(userId: Id, select?: string): Promise<UserDocument | null> {
    return this.model.findById(userId).select(select ?? "").exec();
  }

  async adminIds(session?: ClientSession): Promise<Types.ObjectId[]> {
    const admins = await this.model
      .find({ role: roles.Admin, isDeleted: { $ne: true } })
      .select("_id")
      .session(session ?? null);
    return admins.map((admin) => admin._id);
  }
}

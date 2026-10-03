import { createHash, randomBytes, randomUUID } from "crypto";
import type { Model, Types } from "mongoose";
import type { IRefreshToken, RefreshTokenDocument } from "../../db/models/RefreshToken.Model.js";
import type { UserDocument } from "../../db/models/User.model.js";
import { AppError } from "../../core/AppError.js";
import { BaseService } from "../../core/BaseService.js";
import type { ITokenService } from "../../core/contracts.js";
import { assertCanSignIn, type UserService } from "../user/user.service.js";

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  // Access token lifetime in seconds, so clients know when to refresh
  expiresIn: number;
}

export interface ClientInfo {
  userAgent?: string;
  ip?: string;
}

const DAY = 60 * 60 * 24;
const accessLifetime = () => Number(process.env.ACCESS_TOKEN_EXPIRES_IN) || 15 * 60;
const refreshLifetime = () => Number(process.env.REFRESH_TOKEN_EXPIRES_IN) || 30 * DAY;
// A just-rotated token may come back from parallel tabs or a client retrying after a timeout
const ROTATION_GRACE_MS = 30 * 1000;

// Refresh tokens are 384 random bits, so a fast hash is enough to make a leaked DB row useless
const hashToken = (token: string) => createHash("sha256").update(token).digest("hex");

// Owns login sessions: short-lived JWT access tokens plus rotating, revocable refresh tokens
export class SessionService extends BaseService<IRefreshToken> {
  constructor(
    model: Model<IRefreshToken>,
    private readonly users: UserService,
    private readonly tokens: ITokenService
  ) {
    super(model);
  }

  async #issue(user: UserDocument, familyId: string, client: ClientInfo): Promise<TokenPair> {
    const expiresIn = accessLifetime();
    const accessToken = this.tokens.generate(
      { id: user._id, userName: user.userName },
      { expiresIn }
    );
    const refreshToken = randomBytes(48).toString("base64url");
    await this.model.create({
      userId: user._id,
      tokenHash: hashToken(refreshToken),
      familyId,
      expiresAt: new Date(Date.now() + refreshLifetime() * 1000),
      userAgent: client.userAgent,
      ip: client.ip,
    });
    return { accessToken, refreshToken, expiresIn };
  }

  // Starts a new session family (called on login)
  start(user: UserDocument, client: ClientInfo = {}): Promise<TokenPair> {
    return this.#issue(user, randomUUID(), client);
  }

  // Exchanges a refresh token for a new pair; the old refresh token stops working
  async refresh(refreshToken: string, client: ClientInfo = {}): Promise<TokenPair> {
    const tokenHash = hashToken(refreshToken);
    const now = new Date();
    // Atomic: two concurrent refreshes with the same token cannot both rotate it
    const current = await this.model.findOneAndUpdate(
      { tokenHash, revokedAt: null, expiresAt: { $gt: now } },
      { revokedAt: now, rotatedAt: now }
    );
    if (current) return this.#continue(current, client);

    const known = await this.model.findOne({ tokenHash });
    if (known?.revokedAt) {
      const recentlyRotated =
        known.rotatedAt && now.getTime() - known.rotatedAt.getTime() < ROTATION_GRACE_MS;
      // Within the grace window, reuse is a benign race as long as the login is still active
      // (not logged out or revoked), so hand out another pair in the same family
      const familyActive =
        recentlyRotated &&
        (await this.model.exists({ familyId: known.familyId, revokedAt: null, expiresAt: { $gt: now } }));
      if (familyActive) return this.#continue(known, client);

      // An already-rotated token came back later: assume it was stolen and end that whole login
      await this.#revokeFamily(known.familyId);
    }
    throw new AppError("Invalid or expired refresh token", 401);
  }

  // Issues the next pair in a token's family, if the account may still sign in
  async #continue(token: RefreshTokenDocument, client: ClientInfo): Promise<TokenPair> {
    const user = await this.users.findById(token.userId);
    try {
      assertCanSignIn(user);
    } catch (err) {
      await this.#revokeFamily(token.familyId);
      throw err;
    }
    return this.#issue(user, token.familyId, client);
  }

  // Logout: ends the session this refresh token belongs to (silently ignores unknown tokens)
  async revoke(refreshToken: string): Promise<void> {
    const token = await this.model.findOne({ tokenHash: hashToken(refreshToken) });
    if (token) await this.#revokeFamily(token.familyId);
  }

  // Logs the user out everywhere (password reset, account blocked)
  async revokeAllForUser(userId: Types.ObjectId): Promise<void> {
    await this.model.updateMany(
      { userId, revokedAt: null },
      { revokedAt: new Date() }
    );
  }

  async #revokeFamily(familyId: string): Promise<void> {
    await this.model.updateMany(
      { familyId, revokedAt: null },
      { revokedAt: new Date() }
    );
  }
}

import mongoose, { HydratedDocument, Model, Schema, Types, model } from "mongoose";

// One row per issued refresh token. Only a SHA-256 hash is stored, never the token itself.
export interface IRefreshToken {
  userId: Types.ObjectId;
  tokenHash: string;
  // Every token created by rotating from the same login shares a family; reuse revokes the family
  familyId: string;
  expiresAt: Date;
  revokedAt?: Date | null;
  // Set when this token was exchanged for a new one (as opposed to logout / theft revocation)
  rotatedAt?: Date | null;
  userAgent?: string;
  ip?: string;
}

export type RefreshTokenDocument = HydratedDocument<IRefreshToken>;

const refreshTokenSchema = new Schema<IRefreshToken>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    tokenHash: { type: String, required: true, unique: true },
    familyId: { type: String, required: true, index: true },
    expiresAt: { type: Date, required: true },
    revokedAt: { type: Date, default: null },
    rotatedAt: { type: Date, default: null },
    userAgent: String,
    ip: String,
  },
  { timestamps: true }
);

// MongoDB deletes rows automatically once they expire
refreshTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

const refreshTokenModel =
  (mongoose.models.RefreshToken as Model<IRefreshToken> | undefined) ||
  model<IRefreshToken>("RefreshToken", refreshTokenSchema);

export default refreshTokenModel;

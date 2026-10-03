import mongoose, { HydratedDocument, Model, Schema, Types, model } from "mongoose";
import type { ImageAsset } from "../../types/common.js";

export const roles = {
  Admin: "Admin",
  User: "User",
} as const;

export type Role = (typeof roles)[keyof typeof roles];

export interface IUser {
  firstName?: string;
  lastName?: string;
  userName: string;
  email: string;
  password: string;
  phone?: string;
  address?: string;
  gender: "male" | "female";
  role: Role;
  confirmEmail: boolean;
  status: "offline" | "online" | "blocked";
  image?: ImageAsset;
  DOB?: string;
  code: number | null;
  codeExpiresAt?: Date | null;
  codeAttempts: number;
  changePasswordTime?: Date;
  wishList: Types.ObjectId[];
  isDeleted: boolean;
}

export type UserDocument = HydratedDocument<IUser>;

const userSchema = new Schema<IUser>(
  {
    firstName: String,
    lastName: String,
    userName: {
      type: String,
      required: [true, "userName is required"],
    },
    email: {
      type: String,
      unique: true,
      required: [true, "email is required"],
      trim: true,
      lowercase: true,
    },
    password: {
      type: String,
      required: [true, "password is required"],
    },
    phone: {
      type: String,
    },
    address: String,
    gender: {
      type: String,
      default: "male",
      enum: ["male", "female"],
    },
    role: {
      type: String,
      default: roles.User,
      enum: Object.values(roles),
    },
    confirmEmail: {
      type: Boolean,
      default: false,
    },
    status: {
      type: String,
      default: "offline",
      enum: ["offline", "online", "blocked"],
    },
    image: Object,
    DOB: String,
    code: { type: Number, default: null },
    codeExpiresAt: { type: Date, default: null },
    codeAttempts: { type: Number, default: 0 },
    changePasswordTime: Date,
    wishList: [{ type: Schema.Types.ObjectId, ref: "Product" }],
    // Deleted accounts can no longer sign in; the row is kept for order history
    isDeleted: { type: Boolean, default: false },
  },
  {
    timestamps: true,
  }
);

// Serves the admin lookup for order notifications
userSchema.index({ role: 1 });

const userModel =
  (mongoose.models.User as Model<IUser> | undefined) ||
  model<IUser>("User", userSchema);
export default userModel;

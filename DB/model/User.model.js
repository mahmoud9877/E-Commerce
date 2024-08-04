import mongoose, { Schema, Types, model } from "mongoose";

const userSchema = new Schema(
  {
    firstName: String,
    lastName: String,
    userName: {
      type: String,
      lower: true,
      required: [true, "userName is required"],
      min: [2, "minimum length 2 char"],
      max: [20, "max length 2 char"],
    },
    email: {
      type: String,
      lower: true,
      unique: [true, "email must be unique value"],
      required: [true, "email is required"],
      trim: true,
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
      default: "User",
      enum: ["User", "Admin"],
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
    changePasswordTime: Date,
    wishList: [{ type: Types.ObjectId, ref: "Product" }],
  },
  {
    timestamps: true,
  }
);

const userModel = mongoose.models.User || model("User", userSchema);
export default userModel;

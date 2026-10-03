import mongoose, { Model, Schema, model } from "mongoose";

// Request counters shared by every app instance (see middleware/rateLimit.ts)
export interface IRateLimit {
  key: string;
  hits: number;
  resetAt: Date;
}

const rateLimitSchema = new Schema<IRateLimit>({
  key: { type: String, required: true, unique: true },
  hits: { type: Number, required: true },
  resetAt: { type: Date, required: true },
});

// MongoDB removes a counter once its window has passed
rateLimitSchema.index({ resetAt: 1 }, { expireAfterSeconds: 0 });

const rateLimitModel =
  (mongoose.models.RateLimit as Model<IRateLimit> | undefined) ||
  model<IRateLimit>("RateLimit", rateLimitSchema);

export default rateLimitModel;

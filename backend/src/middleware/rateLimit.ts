import type { Request, RequestHandler } from "express";
import rateLimit, { type IncrementResponse, type Options, type Store } from "express-rate-limit";
import rateLimitModel from "../db/models/RateLimit.Model.js";

const isDuplicateKey = (err: unknown) => (err as { code?: number } | null)?.code === 11000;

// Counters live in MongoDB, so every app instance shares the same limits
export class MongoRateLimitStore implements Store {
  readonly localKeys = false;
  #windowMs = 60_000;

  constructor(readonly prefix: string) {}

  init(options: Options): void {
    this.#windowMs = options.windowMs;
  }

  async increment(key: string): Promise<IncrementResponse> {
    const now = new Date();
    const freshReset = new Date(now.getTime() + this.#windowMs);
    // One atomic update: start a new window when the old one has passed, otherwise count the hit
    const expired = { $lt: [{ $ifNull: ["$resetAt", new Date(0)] }, now] };
    const update = [
      {
        $set: {
          hits: { $cond: [expired, 1, { $add: ["$hits", 1] }] },
          resetAt: { $cond: [expired, freshReset, "$resetAt"] },
        },
      },
    ];
    const run = () =>
      rateLimitModel.findOneAndUpdate({ key: this.prefix + key }, update, {
        upsert: true,
        new: true,
      });
    // Two first hits for the same key can race on the upsert; the loser retries as an update
    const doc = await run().catch((err) => (isDuplicateKey(err) ? run() : Promise.reject(err)));
    return { totalHits: doc!.hits, resetTime: doc!.resetAt };
  }

  async decrement(key: string): Promise<void> {
    await rateLimitModel.updateOne({ key: this.prefix + key }, { $inc: { hits: -1 } });
  }

  async resetKey(key: string): Promise<void> {
    await rateLimitModel.deleteOne({ key: this.prefix + key });
  }
}

const MINUTE = 60 * 1000;

function limiter(
  name: string,
  limit: number,
  windowMs: number,
  keyGenerator?: (req: Request) => string
): RequestHandler {
  return rateLimit({
    windowMs,
    limit,
    standardHeaders: "draft-7",
    legacyHeaders: false,
    store: new MongoRateLimitStore(`${name}:`),
    // A database hiccup should not lock everyone out of signing in
    passOnStoreError: true,
    message: { message: "Too many requests, please try again later" },
    ...(keyGenerator && { keyGenerator }),
  });
}

// Per-account limits stop a distributed attack on one email that per-IP limits would miss
const byEmail = (req: Request) => `email:${String(req.body?.email ?? "").toLowerCase()}`;

export const RateLimits = {
  login: [limiter("login-ip", 10, 15 * MINUTE), limiter("login-email", 10, 15 * MINUTE, byEmail)],
  signup: [limiter("signup-ip", 5, 60 * MINUTE)],
  sendCode: [limiter("code-ip", 5, 60 * MINUTE), limiter("code-email", 3, 60 * MINUTE, byEmail)],
  forgetPassword: [limiter("reset-ip", 10, 15 * MINUTE)],
  refresh: [limiter("refresh-ip", 60, 15 * MINUTE)],
} satisfies Record<string, RequestHandler[]>;

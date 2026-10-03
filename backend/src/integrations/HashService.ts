import bcrypt from "bcryptjs";
import { Env } from "../core/Env.js";
import type { IHasher } from "../core/contracts.js";

// Below this cost factor, offline cracking of a leaked hash is too cheap
const MIN_ROUNDS = 10;

export class HashService implements IHasher {
  get #rounds(): number {
    return Math.max(parseInt(Env.get("SALT_ROUND")) || MIN_ROUNDS, MIN_ROUNDS);
  }

  hash(plaintext: string): Promise<string> {
    return bcrypt.hash(plaintext, this.#rounds);
  }

  compare(plaintext: string, hashValue: string): Promise<boolean> {
    return bcrypt.compare(plaintext, hashValue);
  }
}

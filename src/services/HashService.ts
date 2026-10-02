import bcrypt from "bcryptjs";
import { Env } from "../core/Env.js";
import type { IHasher } from "../core/contracts.js";

export class HashService implements IHasher {
  hash(plaintext: string, salt: number = parseInt(Env.get("SALT_ROUND"))): string {
    return bcrypt.hashSync(plaintext, salt);
  }

  compare(plaintext: string, hashValue: string): boolean {
    return bcrypt.compareSync(plaintext, hashValue);
  }
}


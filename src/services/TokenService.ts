import jwt from "jsonwebtoken";
import { Env } from "../core/Env.js";

import type { ITokenService, TokenOptions } from "../core/contracts.js";

export class TokenService implements ITokenService {
  generate(payload: object = {}, { signature, expiresIn = 60 * 60 }: TokenOptions = {}): string {
    return jwt.sign(payload, signature ?? Env.get("TOKEN_SIGNATURE"), {
      expiresIn: Math.trunc(expiresIn),
    });
  }

  verify<T extends object>(token: string, signature?: string): Partial<T> {
    return jwt.verify(token, signature ?? Env.get("TOKEN_SIGNATURE")) as Partial<T>;
  }
}


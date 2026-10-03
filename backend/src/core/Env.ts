// Variables the app cannot run without; checked once at startup so a missing one fails fast
const REQUIRED = [
  "DB_LOCAL",
  "BEARER_KEY",
  "TOKEN_SIGNATURE",
  "EMAIL_TOKEN",
  "SALT_ROUND",
  "API_KEY",
  "API_SECRET",
  "CLOUD_NAME",
  "Secret_Key",
  "endpointSecret",
  "FE_URL",
] as const;

export class Env {
  // Reads a variable at call time; .env is loaded by loadEnv.ts before any request runs
  static get(key: string): string {
    const value = process.env[key];
    if (value === undefined) {
      throw new Error(`Missing environment variable ${key}`);
    }
    return value;
  }

  static isDev(): boolean {
    return process.env.MOOD === "DEV";
  }

  // Comma-separated CORS_ORIGINS, falling back to the frontend URL
  static corsOrigins(): string[] {
    return (process.env.CORS_ORIGINS || process.env.FE_URL || "")
      .split(",")
      .map((origin) => origin.trim().replace(/\/$/, ""))
      .filter(Boolean);
  }

  // Number of reverse proxies in front of the app (the frontend nginx, a load balancer...).
  // Leave unset when clients connect directly, or X-Forwarded-For could be spoofed.
  static trustProxy(): number | boolean {
    const value = process.env.TRUST_PROXY;
    if (!value) return false;
    if (value === "true") return true;
    return Number(value) || false;
  }

  static assertRequired(): void {
    // Email goes through a generic SMTP provider, or Gmail when none is configured
    const mail = process.env.SMTP_HOST ? ["SMTP_USER", "SMTP_PASS"] : ["gmail", "gmailPass"];
    const missing = [...REQUIRED, ...mail].filter((key) => !process.env[key]);
    if (missing.length) {
      throw new Error(`Missing environment variables: ${missing.join(", ")}`);
    }
  }
}

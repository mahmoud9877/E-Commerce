// Variables the app cannot run without; checked once at startup so a missing one fails fast
const REQUIRED = [
  "DB_LOCAL",
  "BEARER_KEY",
  "TOKEN_SIGNATURE",
  "EMAIL_TOKEN",
  "SALT_ROUND",
  "gmail",
  "gmailPass",
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

  static assertRequired(): void {
    const missing = REQUIRED.filter((key) => !process.env[key]);
    if (missing.length) {
      throw new Error(`Missing environment variables: ${missing.join(", ")}`);
    }
  }
}

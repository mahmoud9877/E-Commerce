import path from "path";
import dotenv from "dotenv";

// Imported first from index.ts so env vars exist before any other module evaluates.
// Resolved from the project root so it works from both index.ts (tsx) and dist/ (tsc).
dotenv.config({ path: path.resolve(process.cwd(), "config/.env") });

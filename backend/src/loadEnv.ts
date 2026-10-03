import path from "path";
import dotenv from "dotenv";

// Imported first from index.ts so env vars exist before any other module evaluates.
// Resolved from the working directory so it works from both index.ts (tsx) and dist/ (tsc).
// Order = precedence: backend/.env, then the repository root .env shared with Docker Compose.
// Variables already in the environment (e.g. set by Docker Compose) always win; in a container
// neither file exists and everything comes from the environment.
dotenv.config({ path: [path.resolve(process.cwd(), ".env"), path.resolve(process.cwd(), "../.env")] });

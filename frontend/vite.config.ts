import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// The browser only ever talks to this origin: requests to /api/* are forwarded to the backend
// (by this dev server here, by nginx in the production image), so no CORS and no Docker-internal
// hostnames ever reach browser JavaScript.
//
// These are read by the dev server process only (not exposed to the browser bundle):
//   API_PROXY_TARGET   where /api is forwarded; http://backend:5000 inside Docker Compose
//   VITE_DEV_PORT      dev server port (default 3000, the backend's FE_URL default)
//   WATCH_POLLING      "true" to poll for file changes (bind mounts from Windows drives / WSL)
const port = Number(process.env.VITE_DEV_PORT) || 3000;

export default defineConfig({
  plugins: [react()],
  // Shares the repository root .env with the backend and Docker Compose (only VITE_* reach the bundle)
  envDir: "..",
  server: {
    host: true,
    port,
    strictPort: true,
    watch: {
      usePolling: process.env.WATCH_POLLING === "true",
      interval: 300,
    },
    proxy: {
      "/api": {
        target: process.env.API_PROXY_TARGET || "http://localhost:5000",
        changeOrigin: true,
        // No X-Forwarded-For: the dev backend does not trust proxies (TRUST_PROXY unset), and
        // express-rate-limit rejects the header in that case
        rewrite: (path) => path.replace(/^\/api/, ""),
      },
    },
  },
  preview: {
    host: true,
    port,
  },
});

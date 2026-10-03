import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
    setupFiles: ["tests/setup.ts"],
    // Each file starts its own in-memory MongoDB replica set
    fileParallelism: false,
    testTimeout: 30_000,
    hookTimeout: 180_000,
  },
});

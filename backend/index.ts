// Must stay the first import so env vars are loaded before anything reads them
import "./src/loadEnv.js";
import Database from "./src/db/connection.js";
import { App } from "./src/app.js";
import { buildContainer } from "./src/container.js";
import { Env } from "./src/core/Env.js";
import { scheduleExpireStaleOrders } from "./src/jobs/expireStaleOrders.js";

const SHUTDOWN_TIMEOUT_MS = 10_000;

try {
  Env.assertRequired();
  const { routes, orders } = buildContainer();
  const app = new App(new Database(), routes);
  const server = await app.start();
  const stopJobs = scheduleExpireStaleOrders(orders);

  // Docker/Kubernetes send SIGTERM on stop; Ctrl+C sends SIGINT
  const shutdown = (signal: string) => {
    console.log(`${signal} received, shutting down...`);
    stopJobs();
    setTimeout(() => process.exit(1), SHUTDOWN_TIMEOUT_MS).unref();
    app.stop(server).then(
      () => process.exit(0),
      (err) => {
        console.error("Shutdown failed:", err);
        process.exit(1);
      }
    );
  };
  process.once("SIGTERM", shutdown);
  process.once("SIGINT", shutdown);
} catch (err) {
  console.error("Failed to start:", err);
  process.exit(1);
}

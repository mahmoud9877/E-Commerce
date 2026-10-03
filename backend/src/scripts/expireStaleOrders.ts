// One sweep of unpaid card orders, for running from an external scheduler (cron) instead of the in-process timer:
//   npm run job:expire-orders               (local, uses the root .env)
//   node dist/src/scripts/expireStaleOrders.js   (built image / production env)
import "../loadEnv.js";
import Database from "../db/connection.js";
import { buildContainer } from "../container.js";
import { expireStaleOrders } from "../jobs/expireStaleOrders.js";

const database = new Database();
await database.connect();
try {
  const rejected = await expireStaleOrders(buildContainer().orders);
  console.log(`Released ${rejected} unpaid order(s)`);
} finally {
  await database.disconnect();
}

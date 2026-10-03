// Creates the admin account from ADMIN_EMAIL / ADMIN_PASSWORD (and optional ADMIN_USERNAME). Safe to re-run:
// an existing account with that email is promoted to Admin, confirmed, unblocked and given the password.
//   npm run seed:admin                          (local, uses the root .env)
//   node dist/src/scripts/seedAdmin.js           (built image / production env)
import "../loadEnv.js";
import mongoose from "mongoose";
import { Env } from "../core/Env.js";
import userModel, { roles } from "../db/models/User.model.js";
import { HashService } from "../integrations/HashService.js";

const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
const password = process.env.ADMIN_PASSWORD;
const userName = process.env.ADMIN_USERNAME?.trim() || "Admin";

if (!email || !password) {
  console.error("Set ADMIN_EMAIL and ADMIN_PASSWORD to seed the admin account");
  process.exit(1);
}

await mongoose.connect(Env.get("DB_LOCAL"));
try {
  const hashed = await new HashService().hash(password);
  const { upsertedCount } = await userModel.updateOne(
    { email },
    {
      $set: {
        password: hashed,
        role: roles.Admin,
        confirmEmail: true,
        status: "offline",
        isDeleted: false,
        // Sessions issued under an older password stop working
        changePasswordTime: new Date(),
      },
      $setOnInsert: { userName },
    },
    { upsert: true, runValidators: true }
  );
  console.log(`Admin ${email}: ${upsertedCount ? "created" : "updated"}`);
} finally {
  await mongoose.disconnect();
}

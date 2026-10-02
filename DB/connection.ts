import mongoose from "mongoose";
import type { Connectable } from "../src/core/contracts.js";
import { Env } from "../src/core/Env.js";

export class Database implements Connectable {
  constructor(private readonly uri: string = Env.get("DB_LOCAL")) {}

  // Throws on failure so the app does not start without a database
  async connect(): Promise<void> {
    await mongoose.connect(this.uri);
    console.log(`DB Connected successfully.........`);
  }

  async disconnect(): Promise<void> {
    await mongoose.disconnect();
  }
}

export default Database;

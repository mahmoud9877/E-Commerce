import mongoose from "mongoose";
import { Env } from "../core/Env.js";

export class Database {
  constructor(private readonly uri: string = Env.get("DB_LOCAL")) {}

  // Throws on failure so the app does not start without a database
  async connect(): Promise<void> {
    // Already connected: reuse the open connection instead of opening a second one
    if (mongoose.connection.readyState === 1) return;
    // Keeps Mongoose 6 behaviour (unknown filter fields are dropped) and silences the v7 warning
    mongoose.set("strictQuery", true);
    await mongoose.connect(this.uri);
    console.log(`DB Connected successfully.........`);
  }

  // Used by the /health endpoint
  isConnected(): boolean {
    return mongoose.connection.readyState === 1;
  }

  async disconnect(): Promise<void> {
    await mongoose.disconnect();
  }
}

export default Database;

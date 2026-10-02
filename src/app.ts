import express, { type Express, type Router } from "express";
import type { Server } from "http";
import cors from "cors";
import morgan from "morgan";
import chalk from "chalk";
import type { Connectable } from "./core/contracts.js";
import { Env } from "./core/Env.js";
import { ErrorHandler } from "./core/ErrorHandler.js";

export class App {
  static readonly WHITE_LIST = ["http://localhost:3000"];

  readonly app: Express;

  constructor(
    private readonly database: Connectable,
    private readonly routes: Record<string, Router>
  ) {
    this.app = express();
    this.#registerMiddlewares();
    this.#registerRoutes();
    this.#registerErrorHandlers();
  }

  #registerMiddlewares(): void {
    this.app.use(
      cors({
        origin(origin, callback) {
          if (!origin || App.WHITE_LIST.includes(origin)) {
            callback(null, true);
          } else {
            callback(new Error("Not allowed by CORS"));
          }
        },
        exposedHeaders: ["Idempotent-Replayed"],
      })
    );
    this.app.use(express.urlencoded({ extended: false }));

    // The Stripe webhook needs the raw body to verify its signature
    this.app.use((req, res, next) => {
      if (req.originalUrl === "/order/webhook") return next();
      return express.json()(req, res, next);
    });

    this.app.use(morgan(Env.isDev() ? "dev" : "common"));
  }

  #registerRoutes(): void {
    this.app.get("/", (req, res) => {
      res.status(200).send("Welcome to the E-commerchhhhe API");
    });

    for (const [path, router] of Object.entries(this.routes)) {
      this.app.use(path, router);
    }

    this.app.all("*", (req, res) => {
      res
        .status(404)
        .json({ message: "Invalid route. Please check the URL or HTTP method." });
    });
  }

  #registerErrorHandlers(): void {
    this.app.use(ErrorHandler.globalHandler);
  }

  // Stops accepting connections, lets in-flight requests finish, then closes the database
  async stop(server: Server): Promise<void> {
    await new Promise<void>((resolve, reject) =>
      server.close((err) => (err ? reject(err) : resolve()))
    );
    await this.database.disconnect();
  }

  // Connects to the database first so no request is served without one
  async start(port: number | string = process.env.PORT || 5000): Promise<Server> {
    await this.database.connect();
    const warn = chalk.hex("#09c");
    return this.app.listen(Number(port), () =>
      console.log(
        warn(`Example app listening on port... ` + chalk.green.bold(`${port}!`))
      )
    );
  }
}

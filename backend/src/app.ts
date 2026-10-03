import { randomUUID } from "crypto";
import express, { type Express, type Router } from "express";
import type { Server } from "http";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import chalk from "chalk";
import type { Database } from "./db/connection.js";
import { Env } from "./core/Env.js";
import { ErrorHandler } from "./core/ErrorHandler.js";

const REQUEST_ID = /^[\w.-]{1,128}$/;

morgan.token("id", (req) => (req as express.Request).id);

export class App {
  readonly app: Express;

  constructor(
    private readonly database: Database,
    private readonly routes: Record<string, Router>
  ) {
    this.app = express();
    this.#registerMiddlewares();
    this.#registerRoutes();
    this.#registerErrorHandlers();
  }

  #registerMiddlewares(): void {
    // Makes req.ip the real client address behind TRUST_PROXY reverse proxies (rate limits depend on it)
    this.app.set("trust proxy", Env.trustProxy());

    this.app.use((req, res, next) => {
      const incoming = req.get("X-Request-Id");
      req.id = incoming && REQUEST_ID.test(incoming) ? incoming : randomUUID();
      res.set("X-Request-Id", req.id);
      next();
    });

    this.app.use(helmet());

    const allowed = Env.corsOrigins();
    this.app.use(
      cors({
        // Unknown origins get no CORS headers (the browser blocks them) instead of a server error
        origin: (origin, callback) => callback(null, !origin || allowed.includes(origin)),
        exposedHeaders: ["Idempotent-Replayed", "X-Request-Id"],
      })
    );
    this.app.use(express.urlencoded({ extended: false }));
    this.app.use(
      express.json({
        // Payment webhooks verify their signature against the exact bytes received
        verify: (req, res, buf) => {
          (req as express.Request).rawBody = buf;
        },
      })
    );

    this.app.use(
      morgan(Env.isDev() ? "dev" : ':id :remote-addr ":method :url" :status :res[content-length] - :response-time ms', {
        skip: () => process.env.MOOD === "TEST",
      })
    );
  }

  #registerRoutes(): void {
    this.app.get("/", (req, res) => {
      res.status(200).send("Welcome to the E-commerce API");
    });

    // Liveness + database readiness for Docker healthchecks; reports nothing beyond up/down
    this.app.get("/health", (req, res) => {
      const up = this.database.isConnected();
      res.status(up ? 200 : 503).json({ status: up ? "ok" : "unavailable" });
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

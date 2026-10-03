import { Router, type RequestHandler, type RouterOptions } from "express";
import { roles } from "../db/models/User.model.js";
import type { BaseController } from "./BaseController.js";
import type { AuthMiddleware } from "../middleware/auth.js";

export abstract class BaseRouter<C extends BaseController> {
  #router?: Router;

  constructor(
    protected readonly controller: C,
    protected readonly auth: AuthMiddleware,
    private readonly routerOptions: RouterOptions = {}
  ) {}

  // Built on first access so subclass constructor fields (e.g. nested routers) exist by then
  get router(): Router {
    if (!this.#router) {
      this.#router = Router(this.routerOptions);
      this.initRoutes(this.#router);
    }
    return this.#router;
  }

  // Any logged-in account (customer or admin)
  protected authenticated(): RequestHandler {
    return this.auth.authenticate([roles.User, roles.Admin]);
  }

  protected adminOnly(): RequestHandler {
    return this.auth.authenticate([roles.Admin]);
  }

  protected abstract initRoutes(router: Router): void;
}

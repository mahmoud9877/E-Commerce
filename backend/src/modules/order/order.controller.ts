import type { Request, Response } from "express";
import { AppError } from "../../core/AppError.js";
import { BaseController } from "../../core/BaseController.js";
import type { CheckoutService } from "./checkout.service.js";
import type { OrderService } from "./order.service.js";

export class OrderController extends BaseController {
  constructor(
    private readonly orderService: OrderService,
    private readonly checkout: CheckoutService
  ) {
    super();
  }

  // Optional header; clients should send a fresh UUID per checkout attempt and reuse it on retry
  static #idempotencyKey(req: Request): string | undefined {
    const key = req.get("Idempotency-Key")?.trim();
    if (key === undefined || key === "") return undefined;
    if (key.length > 255) {
      throw new AppError("Idempotency-Key must be at most 255 characters", 400);
    }
    return key;
  }

  async getMyOrders(req: Request, res: Response) {
    const { data: orderList, pagination } = await this.orderService.listForUser(
      BaseController.currentUser(req)._id,
      req.query
    );
    return res.status(200).json({ message: "Done", orderList, pagination });
  }

  async getAllOrders(req: Request, res: Response) {
    const { data: orderList, pagination } = await this.orderService.listAll(req.query);
    return res.status(200).json({ message: "Done", orderList, pagination });
  }

  async createOrder(req: Request, res: Response) {
    const { order, session, replayed } = await this.orderService.create(
      BaseController.currentUser(req),
      req.body,
      OrderController.#idempotencyKey(req)
    );
    const status = replayed ? 200 : 201;
    if (replayed) res.set("Idempotent-Replayed", "true");
    if (session) {
      return res.status(status).json({ message: "Done", order, session });
    }
    return res.status(status).json({ message: "Order created successfully", order });
  }

  async webhook(req: Request, res: Response) {
    let event;
    try {
      // app.ts keeps the exact request bytes; the signature is computed over them
      event = this.checkout.parseWebhookEvent(
        req.rawBody ?? "",
        req.headers["stripe-signature"]
      );
    } catch (err) {
      return res.status(400).send(`Webhook Error: ${(err as Error).message}`);
    }
    const outcome = await this.orderService.applyPaymentEvent(event);
    return res.json({ message: outcome === "rejected" ? "rejected link" : "Done", outcome });
  }

  async cancelOrder(req: Request<{ orderId: string }>, res: Response) {
    const order = await this.orderService.cancel(
      req.params.orderId,
      BaseController.currentUser(req)._id,
      req.body.reason
    );
    return res.status(200).json({ message: "Done", order });
  }

  async deliveredOrder(req: Request<{ orderId: string }>, res: Response) {
    const order = await this.orderService.markDelivered(
      req.params.orderId,
      BaseController.currentUser(req)._id
    );
    return res.status(200).json({ message: "Order delivered successfully", order });
  }
}

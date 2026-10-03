import { CHECKOUT_SESSION_TTL_MS } from "../modules/order/checkout.service.js";
import type { OrderService } from "../modules/order/order.service.js";

// Past the checkout session's own expiry, with slack for Stripe's "expired" webhook to arrive first
export const STALE_AFTER_MS = CHECKOUT_SESSION_TTL_MS + 15 * 60 * 1000;
const INTERVAL_MS = 5 * 60 * 1000;

export function expireStaleOrders(orders: OrderService): Promise<number> {
  return orders.rejectStaleUnpaid(new Date(Date.now() - STALE_AFTER_MS));
}

// Runs the sweep in-process on a timer; returns a function that stops it.
// Several instances may run it at once: each order is only rejected while still waitPayment.
export function scheduleExpireStaleOrders(orders: OrderService): () => void {
  let running = false;
  const timer = setInterval(async () => {
    if (running) return;
    running = true;
    try {
      const rejected = await expireStaleOrders(orders);
      if (rejected) console.log(`Released ${rejected} unpaid order(s)`);
    } catch (err) {
      console.error("Stale order sweep failed:", err);
    } finally {
      running = false;
    }
  }, INTERVAL_MS);
  timer.unref();
  return () => clearInterval(timer);
}

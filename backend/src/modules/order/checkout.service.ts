import { Env } from "../../core/Env.js";
import type { OrderDocument } from "../../db/models/Order.Model.js";
import type { CouponDocument } from "../../db/models/Coupon.Model.js";
import type {
  CheckoutSession,
  ExpireResult,
  IPaymentGateway,
  PaymentEvent,
} from "../../core/contracts.js";

const CURRENCY = "egp";

// How long a customer has to pay before the session expires and the order's stock is released.
// Stripe accepts 30 minutes to 24 hours; the extra minute keeps us clear of the lower bound.
export const CHECKOUT_SESSION_TTL_MS = 31 * 60 * 1000;

// Owns the payment-gateway side of an order: checkout sessions, webhooks and refunds
export class CheckoutService {
  constructor(private readonly payments: IPaymentGateway) {}

  createSession(
    order: OrderDocument,
    coupon: CouponDocument | undefined,
    customerEmail: string
  ): Promise<CheckoutSession> {
    const orderId = order._id.toString();
    return this.payments.createCheckoutSession({
      orderId,
      customerEmail,
      currency: CURRENCY,
      // Back to the shop, where the order is listed and can be cancelled (or paid before it expires)
      cancelUrl: `${Env.get("FE_URL")}/#/orders?checkout=cancelled&orderId=${orderId}`,
      items: order.products.map((product) => ({
        name: product.name,
        unitAmount: Math.round(product.unitPrice * 100),
        quantity: product.quantity,
      })),
      percentOff: coupon?.amount,
      expiresAt: new Date(Date.now() + CHECKOUT_SESSION_TTL_MS),
    });
  }

  parseWebhookEvent(
    rawBody: Buffer | string,
    signature: string | string[] | undefined
  ): PaymentEvent {
    return this.payments.parseWebhookEvent(rawBody, signature);
  }

  expireSession(sessionId: string): Promise<ExpireResult> {
    return this.payments.expireCheckoutSession(sessionId);
  }

  // Keyed by order, so a redelivered webhook never refunds twice
  refund(paymentRef: string, orderId: string): Promise<void> {
    return this.payments.refund(paymentRef, `order-refund-${orderId}`);
  }
}

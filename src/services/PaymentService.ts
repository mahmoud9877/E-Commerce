import Stripe from "stripe";
import { Env } from "../core/Env.js";
import type {
  CheckoutRequest,
  CheckoutSession,
  IPaymentGateway,
  PaymentEvent,
} from "../core/contracts.js";

// Stripe implementation of IPaymentGateway; Stripe types never leave this file
export class PaymentService implements IPaymentGateway {
  #stripe?: Stripe;

  get stripe(): Stripe {
    this.#stripe ??= new Stripe(Env.get("Secret_Key"));
    return this.#stripe;
  }

  async createCheckoutSession({
    orderId,
    customerEmail,
    currency,
    items,
    cancelUrl,
    percentOff,
  }: CheckoutRequest): Promise<CheckoutSession> {
    const discounts: Stripe.Checkout.SessionCreateParams.Discount[] = [];
    if (percentOff) {
      const coupon = await this.stripe.coupons.create(
        { percent_off: percentOff, duration: "once" },
        { idempotencyKey: `order-coupon-${orderId}` }
      );
      discounts.push({ coupon: coupon.id });
    }

    // Keyed by order so a retried call returns the same session instead of a second one
    const session = await this.stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      mode: "payment",
      success_url: `${Env.get("FE_URL")}/#/order`,
      cancel_url: cancelUrl,
      customer_email: customerEmail,
      metadata: { orderId },
      line_items: items.map((item) => ({
        price_data: {
          currency,
          product_data: { name: item.name },
          unit_amount: item.unitAmount,
        },
        quantity: item.quantity,
      })),
      discounts,
    }, { idempotencyKey: `order-checkout-${orderId}` });
    return { id: session.id, url: session.url };
  }

  parseWebhookEvent(
    rawBody: Buffer | string,
    signature: string | string[] | undefined
  ): PaymentEvent {
    const event = this.stripe.webhooks.constructEvent(
      rawBody,
      signature ?? "",
      Env.get("endpointSecret")
    );
    if (
      event.type !== "checkout.session.completed" &&
      event.type !== "checkout.session.expired"
    ) {
      return { type: "ignored" };
    }
    const orderId = event.data.object.metadata?.orderId;
    if (!orderId) return { type: "ignored" };
    return {
      type: event.type === "checkout.session.completed" ? "paid" : "expired",
      orderId,
    };
  }
}

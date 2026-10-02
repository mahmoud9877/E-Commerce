import type { OrderDocument } from "../../../DB/model/Order.Model.js";
import type { CouponDocument } from "../../../DB/model/Coupon.Model.js";
import type {
  CheckoutSession,
  IPaymentGateway,
  PaymentEvent,
} from "../../core/contracts.js";

const CURRENCY = "egp";

// Owns the payment-gateway side of an order: checkout sessions and webhook verification
export class CheckoutService {
  constructor(private readonly payments: IPaymentGateway) {}

  createSession(
    order: OrderDocument,
    coupon: CouponDocument | undefined,
    customerEmail: string,
    baseUrl: string
  ): Promise<CheckoutSession> {
    const orderId = order._id.toString();
    return this.payments.createCheckoutSession({
      orderId,
      customerEmail,
      currency: CURRENCY,
      cancelUrl: `${baseUrl}/order/cancel?orderId=${orderId}`,
      items: order.products.map((product) => ({
        name: product.name,
        unitAmount: Math.round(product.unitPrice * 100),
        quantity: product.quantity,
      })),
      percentOff: coupon?.amount,
    });
  }

  parseWebhookEvent(
    rawBody: Buffer | string,
    signature: string | string[] | undefined
  ): PaymentEvent {
    return this.payments.parseWebhookEvent(rawBody, signature);
  }
}

// Abstractions the domain services depend on (Dependency Inversion).
// Concrete implementations live in src/integrations and are wired in src/container.ts.
import type Mail from "nodemailer/lib/mailer/index.js";
import type { ImageAsset } from "../types/common.js";

export interface IImageStorage {
  upload(filePath: string, folder: string): Promise<ImageAsset>;
  destroy(publicId?: string): Promise<void>;
  replace(filePath: string, folder: string, oldPublicId?: string): Promise<ImageAsset>;
}

export interface TokenOptions {
  signature?: string;
  expiresIn?: number;
}

export interface ITokenService {
  generate(payload?: object, options?: TokenOptions): string;
  verify<T extends object>(token: string, signature?: string): Partial<T>;
}

// Async so hashing runs on libuv's thread pool instead of blocking the event loop
export interface IHasher {
  hash(plaintext: string): Promise<string>;
  compare(plaintext: string, hashValue: string): Promise<boolean>;
}

export interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  cc?: string;
  bcc?: string;
  attachments?: Mail.Attachment[];
}

export interface IMailer {
  // Throws when the recipient is rejected
  send(options: EmailOptions): Promise<void>;
}

export interface CheckoutLineItem {
  name: string;
  unitAmount: number; // in the smallest currency unit (e.g. piasters)
  quantity: number;
}

export interface CheckoutRequest {
  orderId: string;
  customerEmail: string;
  currency: string;
  items: CheckoutLineItem[];
  cancelUrl: string;
  percentOff?: number;
  // After this the session can no longer be paid (Stripe allows 30 minutes to 24 hours)
  expiresAt: Date;
}

export interface CheckoutSession {
  id: string;
  url: string | null;
}

// Gateway-neutral view of a webhook: only the outcomes the order flow reacts to
export type PaymentEvent =
  // paymentRef identifies the captured payment, so it can be refunded
  | { type: "paid"; orderId: string; paymentRef?: string }
  | { type: "expired"; orderId: string }
  | { type: "ignored" };

// "completed" means the customer already paid, so the session can no longer be closed
export type ExpireResult = "expired" | "completed";

export interface IPaymentGateway {
  createCheckoutSession(request: CheckoutRequest): Promise<CheckoutSession>;
  // Throws when the signature is invalid
  parseWebhookEvent(
    rawBody: Buffer | string,
    signature: string | string[] | undefined
  ): PaymentEvent;
  // Closes an unpaid session so the customer can no longer pay it
  expireCheckoutSession(sessionId: string): Promise<ExpireResult>;
  // Refunds a captured payment in full; idempotencyKey makes webhook retries safe
  refund(paymentRef: string, idempotencyKey: string): Promise<void>;
}

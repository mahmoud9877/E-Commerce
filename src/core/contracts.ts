// Abstractions the domain services depend on (Dependency Inversion).
// Concrete implementations live in src/services and are wired in src/container.ts.
import type { RequestHandler } from "express";
import type Mail from "nodemailer/lib/mailer/index.js";
import type { Role } from "../../DB/model/User.model.js";
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

export interface IHasher {
  hash(plaintext: string, salt?: number): string;
  compare(plaintext: string, hashValue: string): boolean;
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
}

export interface CheckoutSession {
  id: string;
  url: string | null;
}

// Gateway-neutral view of a webhook: only the outcomes the order flow reacts to
export type PaymentEvent =
  | { type: "paid" | "expired"; orderId: string }
  | { type: "ignored" };

export interface IPaymentGateway {
  createCheckoutSession(request: CheckoutRequest): Promise<CheckoutSession>;
  // Throws when the signature is invalid
  parseWebhookEvent(
    rawBody: Buffer | string,
    signature: string | string[] | undefined
  ): PaymentEvent;
}

export interface IAuthenticator {
  authenticate(accessRoles?: readonly Role[]): RequestHandler;
}

export interface Connectable {
  connect(): Promise<void>;
  disconnect(): Promise<void>;
}

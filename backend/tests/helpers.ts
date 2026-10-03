import type { Express } from "express";
import { MongoMemoryReplSet } from "mongodb-memory-server";
import mongoose, { Types } from "mongoose";
import request from "supertest";
import { afterAll, beforeAll, beforeEach } from "vitest";
import { App } from "../src/app.js";
import { buildContainer, type Container } from "../src/container.js";
import type {
  CheckoutRequest,
  CheckoutSession,
  EmailOptions,
  ExpireResult,
  IImageStorage,
  IMailer,
  IPaymentGateway,
  PaymentEvent,
} from "../src/core/contracts.js";
import Database from "../src/db/connection.js";
import cartModel from "../src/db/models/Cart.Model.js";
import productModel from "../src/db/models/Product.Model.js";
import userModel from "../src/db/models/User.model.js";
import { HashService } from "../src/integrations/HashService.js";

export class FakePayments implements IPaymentGateway {
  sessions: CheckoutRequest[] = [];
  expired: string[] = [];
  refunds: { paymentRef: string; idempotencyKey: string }[] = [];
  // What expireCheckoutSession reports, e.g. "completed" to simulate an already-paid session
  expireResult: ExpireResult = "expired";

  async createCheckoutSession(req: CheckoutRequest): Promise<CheckoutSession> {
    this.sessions.push(req);
    return { id: `cs_${req.orderId}`, url: `https://pay.test/${req.orderId}` };
  }

  // Tests post the PaymentEvent itself as the webhook body; a "bad" signature fails verification
  parseWebhookEvent(rawBody: Buffer | string, signature: string | string[] | undefined): PaymentEvent {
    if (signature !== "valid") throw new Error("Invalid signature");
    return JSON.parse(rawBody.toString()) as PaymentEvent;
  }

  async expireCheckoutSession(sessionId: string): Promise<ExpireResult> {
    this.expired.push(sessionId);
    return this.expireResult;
  }

  async refund(paymentRef: string, idempotencyKey: string): Promise<void> {
    this.refunds.push({ paymentRef, idempotencyKey });
  }
}

export class FakeMailer implements IMailer {
  sent: EmailOptions[] = [];
  async send(options: EmailOptions): Promise<void> {
    this.sent.push(options);
  }
}

export class FakeImages implements IImageStorage {
  async upload(filePath: string, folder: string) {
    return { secure_url: `https://img.test/${folder}`, public_id: `${folder}/${Date.now()}` };
  }
  async destroy(): Promise<void> {}
  async replace(filePath: string, folder: string) {
    return this.upload(filePath, folder);
  }
}

export interface TestContext {
  app: Express;
  container: Container;
  payments: FakePayments;
  mailer: FakeMailer;
}

// Starts a single-node replica set (orders use transactions) and a fresh app with fake integrations
export function useTestApp(): TestContext {
  const ctx = {} as TestContext;
  let replSet: MongoMemoryReplSet;
  let database: Database;

  beforeAll(async () => {
    replSet = await MongoMemoryReplSet.create({ replSet: { count: 1, storageEngine: "wiredTiger" } });
    database = new Database(replSet.getUri());
    await database.connect();
    // Unique indexes must exist before the tests that rely on them
    await Promise.all(Object.values(mongoose.models).map((model) => model.init()));

    ctx.payments = new FakePayments();
    ctx.mailer = new FakeMailer();
    ctx.container = buildContainer({
      payments: ctx.payments,
      mailer: ctx.mailer,
      images: new FakeImages(),
    });
    ctx.app = new App(database, ctx.container.routes).app;
  });

  beforeEach(async () => {
    const collections = await mongoose.connection.db.collections();
    await Promise.all(collections.map((collection) => collection.deleteMany({})));
    Object.assign(ctx.payments, new FakePayments());
    ctx.mailer.sent = [];
  });

  afterAll(async () => {
    await database?.disconnect();
    await replSet?.stop();
  });

  return ctx;
}

export const PASSWORD = "Passw0rd!";
const hasher = new HashService();

export async function createUser(overrides: Record<string, unknown> = {}) {
  return userModel.create({
    userName: "tester",
    email: `user-${new Types.ObjectId().toString()}@example.com`,
    password: await hasher.hash(PASSWORD),
    confirmEmail: true,
    ...overrides,
  });
}

export async function login(app: Express, email: string) {
  const res = await request(app).post("/auth/login").send({ email, password: PASSWORD });
  if (res.status !== 200) throw new Error(`login failed: ${res.status} ${JSON.stringify(res.body)}`);
  return res.body as { accessToken: string; refreshToken: string };
}

export const bearer = (token: string) => ({ Authorization: `Bearer__${token}` });

export function createProduct(overrides: Record<string, unknown> = {}) {
  return productModel.create({
    customId: new Types.ObjectId().toString(),
    name: "test product",
    slug: "test-product",
    stock: 10,
    price: 100,
    finalPrice: 100,
    mainImage: { secure_url: "https://img.test/p", public_id: "p" },
    categoryId: new Types.ObjectId(),
    subcategoryId: new Types.ObjectId(),
    brandId: new Types.ObjectId(),
    createBy: new Types.ObjectId(),
    ...overrides,
  });
}

export function fillCart(userId: Types.ObjectId, items: { productId: Types.ObjectId; quantity: number }[]) {
  return cartModel.create({ userId, products: items });
}

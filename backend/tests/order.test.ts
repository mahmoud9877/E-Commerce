import { Types } from "mongoose";
import request from "supertest";
import { describe, expect, it } from "vitest";
import cartModel from "../src/db/models/Cart.Model.js";
import couponModel from "../src/db/models/Coupon.Model.js";
import couponUsageModel from "../src/db/models/CouponUsage.Model.js";
import notificationModel from "../src/db/models/Notification.Model.js";
import orderModel from "../src/db/models/Order.Model.js";
import productModel from "../src/db/models/Product.Model.js";
import { expireStaleOrders, STALE_AFTER_MS } from "../src/jobs/expireStaleOrders.js";
import { bearer, createProduct, createUser, fillCart, login, useTestApp } from "./helpers.js";

const ctx = useTestApp();

const ORDER = { address: "12 Test Street, Cairo", phone: ["01012345678"] };

async function customerWithCart(quantity = 2, stock = 10) {
  const user = await createUser();
  const product = await createProduct({ stock });
  await fillCart(user._id, [{ productId: product._id, quantity }]);
  const { accessToken } = await login(ctx.app, user.email);
  return { user, product, auth: bearer(accessToken) };
}

const stockOf = async (id: unknown) => (await productModel.findById(id))!.stock;

function postOrder(auth: Record<string, string>, body: Record<string, unknown>, key?: string) {
  const req = request(ctx.app).post("/order").set(auth);
  if (key) req.set("Idempotency-Key", key);
  return req.send({ ...ORDER, ...body });
}

const webhook = (event: unknown, signature = "valid") =>
  request(ctx.app)
    .post("/order/webhook")
    .set("stripe-signature", signature)
    .set("Content-Type", "application/json")
    .send(JSON.stringify(event));

describe("cash orders", () => {
  it("reserves stock, empties the cart and notifies admins", async () => {
    const admin = await createUser({ role: "Admin" });
    const { user, product, auth } = await customerWithCart(3);

    const res = await postOrder(auth, { paymentType: "cash" });

    expect(res.status).toBe(201);
    expect(res.body.order.status).toBe("placed");
    expect(await stockOf(product._id)).toBe(7);
    expect((await cartModel.findOne({ userId: user._id }))!.products).toHaveLength(0);
    expect(await notificationModel.countDocuments({ recipientId: admin._id })).toBe(1);
  });

  it("replays a retried request with the same Idempotency-Key", async () => {
    const { product, auth } = await customerWithCart(1);

    const first = await postOrder(auth, { paymentType: "cash" }, "key-1");
    const retry = await postOrder(auth, { paymentType: "cash" }, "key-1");

    expect(retry.status).toBe(200);
    expect(retry.headers["idempotent-replayed"]).toBe("true");
    expect(retry.body.order._id).toBe(first.body.order._id);
    expect(await orderModel.countDocuments()).toBe(1);
    expect(await stockOf(product._id)).toBe(9);
  });

  it("gives stock back on cancel", async () => {
    const { product, auth } = await customerWithCart(4);
    const { body } = await postOrder(auth, { paymentType: "cash" });

    const res = await request(ctx.app)
      .patch(`/order/${body.order._id}/cancel`)
      .set(auth)
      .send({ reason: "changed my mind" });

    expect(res.status).toBe(200);
    expect(await stockOf(product._id)).toBe(10);
  });
});

describe("coupons", () => {
  const futureCoupon = () =>
    couponModel.create({ name: "save10", amount: 10, expire: new Date(Date.now() + 86_400_000) });

  it("can be used only once per user, and again after that order is canceled", async () => {
    await futureCoupon();
    const { user, product, auth } = await customerWithCart(1);

    const first = await postOrder(auth, { paymentType: "cash", couponName: "SAVE10" });
    expect(first.status).toBe(201);
    expect(first.body.order.finalPrice).toBe(90);

    const refillCart = () =>
      cartModel.updateOne({ userId: user._id }, { products: [{ productId: product._id, quantity: 1 }] });
    await refillCart();
    const second = await postOrder(auth, { paymentType: "cash", couponName: "save10" });
    expect(second.status).toBe(400);
    expect(second.body.message).toMatch(/already used/);

    await request(ctx.app)
      .patch(`/order/${first.body.order._id}/cancel`)
      .set(auth)
      .send({ reason: "use it later" });
    expect(await couponUsageModel.countDocuments()).toBe(0);

    await refillCart();
    const third = await postOrder(auth, { paymentType: "cash", couponName: "save10" });
    expect(third.status).toBe(201);
  });

  it("are only listed to admins", async () => {
    await futureCoupon();
    const customer = await createUser();
    const { accessToken } = await login(ctx.app, customer.email);

    expect((await request(ctx.app).get("/coupon")).status).toBe(401);
    expect((await request(ctx.app).get("/coupon").set(bearer(accessToken))).status).toBe(403);
  });
});

describe("card orders", () => {
  it("expires the checkout session when the order is canceled", async () => {
    const { product, auth } = await customerWithCart(2);
    const { body } = await postOrder(auth, { paymentType: "card" });
    expect(body.order.status).toBe("waitPayment");
    expect(body.session.url).toContain(body.order._id);

    const res = await request(ctx.app)
      .patch(`/order/${body.order._id}/cancel`)
      .set(auth)
      .send({ reason: "too slow" });

    expect(res.status).toBe(200);
    expect(ctx.payments.expired).toEqual([`cs_${body.order._id}`]);
    expect(await stockOf(product._id)).toBe(10);
  });

  it("refuses to cancel an order the customer already paid", async () => {
    const { auth } = await customerWithCart(1);
    const { body } = await postOrder(auth, { paymentType: "card" });
    ctx.payments.expireResult = "completed";

    const res = await request(ctx.app)
      .patch(`/order/${body.order._id}/cancel`)
      .set(auth)
      .send({ reason: "too late" });

    expect(res.status).toBe(409);
    expect((await orderModel.findById(body.order._id))!.status).toBe("waitPayment");
  });

  it("refunds a payment that arrives after the order was canceled", async () => {
    const { auth } = await customerWithCart(1);
    const { body } = await postOrder(auth, { paymentType: "card" });
    await request(ctx.app).patch(`/order/${body.order._id}/cancel`).set(auth).send({ reason: "x x" });

    const res = await webhook({ type: "paid", orderId: body.order._id, paymentRef: "pi_1" });

    expect(res.body.outcome).toBe("refunded");
    expect(ctx.payments.refunds).toEqual([
      { paymentRef: "pi_1", idempotencyKey: `order-refund-${body.order._id}` },
    ]);
  });

  it("places the order on payment and rejects it on expiry, releasing stock", async () => {
    const { product, auth } = await customerWithCart(1, 10);
    const paid = (await postOrder(auth, { paymentType: "card" })).body.order;
    expect((await webhook({ type: "paid", orderId: paid._id, paymentRef: "pi_2" })).body.outcome).toBe("placed");

    const { user } = await customerWithCart(2, 10);
    const { accessToken } = await login(ctx.app, user.email);
    const unpaid = (await postOrder(bearer(accessToken), { paymentType: "card" })).body.order;
    expect((await webhook({ type: "expired", orderId: unpaid._id })).body.outcome).toBe("rejected");

    expect((await orderModel.findById(paid._id))!.status).toBe("placed");
    expect((await orderModel.findById(unpaid._id))!.status).toBe("rejected");
    expect(await stockOf(product._id)).toBe(9);
  });

  it("rejects webhooks with a bad signature", async () => {
    expect((await webhook({ type: "ignored" }, "forged")).status).toBe(400);
  });

  it("releases stock of orders left unpaid past the session lifetime", async () => {
    const { product, auth } = await customerWithCart(3);
    const { body } = await postOrder(auth, { paymentType: "card" });
    // Through the driver: Mongoose silently drops updates to the immutable createdAt
    await orderModel.collection.updateOne(
      { _id: new Types.ObjectId(body.order._id) },
      { $set: { createdAt: new Date(Date.now() - STALE_AFTER_MS - 60_000) } }
    );

    expect(await expireStaleOrders(ctx.container.orders)).toBe(1);
    expect((await orderModel.findById(body.order._id))!.status).toBe("rejected");
    expect(await stockOf(product._id)).toBe(10);
  });
});

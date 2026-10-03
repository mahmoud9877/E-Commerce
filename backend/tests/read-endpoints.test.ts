import { Types } from "mongoose";
import request from "supertest";
import { describe, expect, it } from "vitest";
import orderModel from "../src/db/models/Order.Model.js";
import { bearer, createProduct, createUser, fillCart, login, useTestApp } from "./helpers.js";

const ctx = useTestApp();

async function loggedIn(overrides: Record<string, unknown> = {}) {
  const user = await createUser(overrides);
  const { accessToken } = await login(ctx.app, user.email);
  return { user, auth: bearer(accessToken) };
}

const ORDER = { address: "12 Test Street, Cairo", phone: ["01012345678"] };

describe("product listing: size", () => {
  it("treats a letter as the product-size filter and a number as the page size", async () => {
    await createProduct({ slug: "small", size: ["s"] });
    await createProduct({ slug: "medium", size: ["m"] });
    await createProduct({ slug: "large", size: ["lg"] });

    const bySize = await request(ctx.app).get("/product?size=m");
    expect(bySize.body.productList.map((p: { slug: string }) => p.slug)).toEqual(["medium"]);

    const paged = await request(ctx.app).get("/product?size=2");
    expect(paged.status).toBe(200);
    expect(paged.body.productList).toHaveLength(2);
    expect(paged.body.pagination).toMatchObject({ size: 2, total: 3, totalPages: 2 });
  });
});

describe("GET /product/:productId", () => {
  it("returns an active product, 404 for a deleted one and 400 for a malformed id", async () => {
    const product = await createProduct({ slug: "shown" });
    const deleted = await createProduct({ slug: "gone", isDeleted: true });

    const found = await request(ctx.app).get(`/product/${product._id}`);
    expect(found.status).toBe(200);
    expect(found.body.product.slug).toBe("shown");

    expect((await request(ctx.app).get(`/product/${deleted._id}`)).status).toBe(404);
    expect((await request(ctx.app).get("/product/not-an-id")).status).toBe(400);
  });
});

describe("GET /product/wishlist", () => {
  it("lists the user's wishlisted products and requires a login", async () => {
    const { auth } = await loggedIn();
    const wanted = await createProduct({ slug: "wanted" });
    await createProduct({ slug: "other" });

    await request(ctx.app).patch(`/product/${wanted._id}/wishlist/add`).set(auth).expect(200);
    const res = await request(ctx.app).get("/product/wishlist").set(auth);

    expect(res.status).toBe(200);
    expect(res.body.wishlist.map((p: { slug: string }) => p.slug)).toEqual(["wanted"]);
    expect((await request(ctx.app).get("/product/wishlist")).status).toBe(401);
  });
});

describe("order lists", () => {
  async function placeOrder(paymentType: "cash" | "card" = "cash") {
    const { user, auth } = await loggedIn();
    const product = await createProduct({ slug: `p-${new Types.ObjectId().toString()}` });
    await fillCart(user._id, [{ productId: product._id, quantity: 1 }]);
    const res = await request(ctx.app)
      .post("/order")
      .set(auth)
      .set("Idempotency-Key", `key-${user._id.toString()}`)
      .send({ ...ORDER, paymentType });
    expect(res.status).toBe(201);
    return { user, auth, order: res.body.order };
  }

  it("GET /order returns only my orders, without the idempotency key", async () => {
    const mine = await placeOrder();
    await placeOrder();

    const res = await request(ctx.app).get("/order").set(mine.auth);

    expect(res.status).toBe(200);
    expect(res.body.orderList).toHaveLength(1);
    expect(res.body.orderList[0]._id).toBe(mine.order._id);
    expect(res.body.orderList[0].idempotencyKey).toBeUndefined();
    expect(res.body.pagination.total).toBe(1);
  });

  it("GET /order/all is admin-only and filters by status", async () => {
    const first = await placeOrder();
    await placeOrder();
    await orderModel.updateOne({ _id: first.order._id }, { status: "delivered" });
    const admin = await loggedIn({ role: "Admin" });

    expect((await request(ctx.app).get("/order/all").set(first.auth)).status).toBe(403);

    const all = await request(ctx.app).get("/order/all").set(admin.auth);
    expect(all.status).toBe(200);
    expect(all.body.orderList).toHaveLength(2);
    expect(all.body.orderList[0].userId).toHaveProperty("email");

    const delivered = await request(ctx.app).get("/order/all?status=delivered").set(admin.auth);
    expect(delivered.body.orderList.map((o: { _id: string }) => o._id)).toEqual([first.order._id]);

    expect((await request(ctx.app).get("/order/all?status=bogus").set(admin.auth)).status).toBe(400);
  });

  it("sends Stripe's cancel link back to the frontend", async () => {
    const { order } = await placeOrder("card");
    const [session] = ctx.payments.sessions;

    expect(session.cancelUrl).toBe(`${process.env.FE_URL}/#/orders?checkout=cancelled&orderId=${order._id}`);
  });
});

describe("reviews", () => {
  async function deliveredBuyer() {
    const { user, auth } = await loggedIn();
    const product = await createProduct({ slug: "reviewed" });
    await orderModel.create({
      userId: user._id,
      address: ORDER.address,
      phone: ORDER.phone,
      products: [{ name: "x", productId: product._id, quantity: 1, unitPrice: 100, finalPrice: 100 }],
      subtotal: 100,
      finalPrice: 100,
      paymentType: "cash",
      status: "delivered",
    });
    return { user, auth, product };
  }

  it("lists a product's reviews publicly, and the author can edit using the returned id", async () => {
    const { auth, product } = await deliveredBuyer();

    const created = await request(ctx.app)
      .post(`/product/${product._id}/review`)
      .set(auth)
      .send({ comment: "Great", rating: 5 });
    expect(created.status).toBe(200);
    const reviewId = created.body.review._id;

    const edited = await request(ctx.app)
      .patch(`/product/${product._id}/review/${reviewId}`)
      .set(auth)
      .send({ rating: 4 });
    expect(edited.body.review.rating).toBe(4);

    const list = await request(ctx.app).get(`/product/${product._id}/review`);
    expect(list.status).toBe(200);
    expect(list.body.reviewList).toHaveLength(1);
    expect(list.body.reviewList[0]).toMatchObject({ _id: reviewId, rating: 4, comment: "Great" });
    expect(list.body.reviewList[0].createBy).toEqual({ _id: expect.any(String), userName: "tester" });
    expect(list.body.reviewList[0].orderId).toBeUndefined();
  });
});

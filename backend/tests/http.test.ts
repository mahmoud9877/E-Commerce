import request from "supertest";
import { describe, expect, it } from "vitest";
import { bearer, createProduct, createUser, login, useTestApp } from "./helpers.js";

const ctx = useTestApp();

describe("product listing", () => {
  it("ignores operators and fields that are not allowlisted", async () => {
    await createProduct({ name: "visible" });
    await createProduct({ name: "hidden", isDeleted: true });

    const res = await request(ctx.app)
      .get("/product")
      .query("$where=sleep(100)&isDeleted=true&fields=name,createBy");

    expect(res.status).toBe(200);
    expect(res.body.productList.map((p: { name: string }) => p.name)).toEqual(["visible"]);
    expect(res.body.productList[0]).not.toHaveProperty("createBy");
  });

  it("filters price ranges and escapes search text", async () => {
    await createProduct({ name: "cheap (a)", finalPrice: 50 });
    await createProduct({ name: "pricey", finalPrice: 500 });

    const range = await request(ctx.app).get("/product").query("finalPrice[lte]=100&sort=-finalPrice");
    expect(range.body.productList.map((p: { name: string }) => p.name)).toEqual(["cheap (a)"]);

    const search = await request(ctx.app).get("/product").query({ search: "(a)" });
    expect(search.body.pagination.total).toBe(1);
  });
});

describe("validation and errors", () => {
  it("rejects a field sent both in the path and the query string", async () => {
    const user = await createUser();
    const { accessToken } = await login(ctx.app, user.email);
    const product = await createProduct();

    const res = await request(ctx.app)
      .patch(`/cart/not-an-id/remove?productId=${product._id.toString()}`)
      .set(bearer(accessToken));

    expect(res.status).toBe(400);
  });

  it("answers malformed JSON with 400, not 500", async () => {
    const res = await request(ctx.app)
      .post("/auth/login")
      .set("Content-Type", "application/json")
      .send("{not json");
    expect(res.status).toBe(400);
  });

  it("tags responses with a request id", async () => {
    const res = await request(ctx.app).get("/does-not-exist");
    expect(res.status).toBe(404);
    expect(res.headers["x-request-id"]).toBeTruthy();
  });

  it("sends no CORS headers to unknown origins", async () => {
    const allowed = await request(ctx.app).get("/").set("Origin", "http://localhost:3000");
    const unknown = await request(ctx.app).get("/").set("Origin", "https://evil.test");
    expect(allowed.headers["access-control-allow-origin"]).toBe("http://localhost:3000");
    expect(unknown.status).toBe(200);
    expect(unknown.headers["access-control-allow-origin"]).toBeUndefined();
  });
});

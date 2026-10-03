import request from "supertest";
import { afterEach, describe, expect, it, vi } from "vitest";
import refreshTokenModel from "../src/db/models/RefreshToken.Model.js";
import userModel from "../src/db/models/User.model.js";
import { bearer, createUser, login, PASSWORD, useTestApp } from "./helpers.js";

const ctx = useTestApp();

const refresh = (refreshToken: string) =>
  request(ctx.app).post("/auth/refresh").send({ refreshToken });

afterEach(() => {
  vi.useRealTimers();
});

describe("refresh tokens", () => {
  it("rotate: each refresh token works once and yields a new pair", async () => {
    const user = await createUser();
    const { refreshToken } = await login(ctx.app, user.email);

    const res = await refresh(refreshToken);

    expect(res.status).toBe(200);
    expect(res.body.refreshToken).not.toBe(refreshToken);
    expect((await refresh(res.body.refreshToken)).status).toBe(200);
  });

  it("tolerate reuse right after rotation (parallel tabs, client retries)", async () => {
    const user = await createUser();
    const { refreshToken } = await login(ctx.app, user.email);

    const first = await refresh(refreshToken);
    const retry = await refresh(refreshToken);

    expect(retry.status).toBe(200);
    // The pair handed to the first request keeps working
    expect((await refresh(first.body.refreshToken)).status).toBe(200);
  });

  it("revoke the whole login when an old token comes back after the grace window", async () => {
    const user = await createUser();
    const { refreshToken } = await login(ctx.app, user.email);
    const rotated = await refresh(refreshToken);

    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(Date.now() + 60_000);

    expect((await refresh(refreshToken)).status).toBe(401);
    // The thief's reuse also ends the legitimate holder's session
    expect((await refresh(rotated.body.refreshToken)).status).toBe(401);
  });

  it("stop working once the account is blocked", async () => {
    const user = await createUser();
    const { refreshToken, accessToken } = await login(ctx.app, user.email);
    await userModel.updateOne({ _id: user._id }, { status: "blocked" });

    expect((await refresh(refreshToken)).status).toBe(403);
    expect((await request(ctx.app).get("/cart").set(bearer(accessToken))).status).toBe(403);
  });
});

describe("password reset", () => {
  const sendCode = (email: string) => request(ctx.app).patch("/auth/sendCode").send({ email });
  const reset = (email: string, code: string) =>
    request(ctx.app)
      .patch("/auth/forgetPassword")
      .send({ email, code, password: "NewPassw0rd", cPassword: "NewPassw0rd" });
  const storedCode = async (email: string) => String((await userModel.findOne({ email }))!.code);
  const wrong = (code: string) => (code === "111111" ? "222222" : "111111");

  it("sets the new password and logs out every session", async () => {
    const user = await createUser();
    await login(ctx.app, user.email);
    await sendCode(user.email);

    const res = await reset(user.email, await storedCode(user.email));

    expect(res.status).toBe(200);
    expect(await refreshTokenModel.countDocuments({ revokedAt: null })).toBe(0);
    const loginRes = await request(ctx.app)
      .post("/auth/login")
      .send({ email: user.email, password: "NewPassw0rd" });
    expect(loginRes.status).toBe(200);
  });

  it("locks the code after 5 wrong guesses, and resending does not reset the count", async () => {
    const user = await createUser();
    await sendCode(user.email);
    const code = await storedCode(user.email);

    for (let i = 0; i < 4; i++) {
      expect((await reset(user.email, wrong(code))).status).toBe(400);
    }
    await sendCode(user.email);
    const resent = await storedCode(user.email);
    expect((await reset(user.email, wrong(resent))).status).toBe(400);

    // Sixth attempt, with the right code: still refused
    const res = await reset(user.email, resent);
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/request a new one/);
  });

  it("answers the same for unknown emails", async () => {
    const res = await sendCode("nobody@example.com");
    expect(res.status).toBe(200);
    expect(ctx.mailer.sent).toHaveLength(0);
  });
});

describe("login", () => {
  it("is rate limited per account", async () => {
    const user = await createUser();
    const attempt = () =>
      request(ctx.app).post("/auth/login").send({ email: user.email, password: "wrong" });

    for (let i = 0; i < 10; i++) {
      expect((await attempt()).status).toBe(401);
    }
    expect((await attempt()).status).toBe(429);
    // Even the right password is refused until the window passes
    const res = await request(ctx.app).post("/auth/login").send({ email: user.email, password: PASSWORD });
    expect(res.status).toBe(429);
  });

  it("refuses unconfirmed accounts", async () => {
    const user = await createUser({ confirmEmail: false });
    const res = await request(ctx.app).post("/auth/login").send({ email: user.email, password: PASSWORD });
    expect(res.status).toBe(403);
  });
});

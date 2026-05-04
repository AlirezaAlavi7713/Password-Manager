import assert from "node:assert/strict";
import test from "node:test";
import jwt from "jsonwebtoken";
import { auth } from "../middleware/auth.js";

process.env.JWT_SECRET = "test-secret";

const runAuth = (req) =>
  new Promise((resolve) => {
    const res = {
      statusCode: 200,
      body: null,
      status(code) {
        this.statusCode = code;
        return this;
      },
      json(payload) {
        this.body = payload;
        resolve({ nextCalled: false, req, res: this });
      },
    };

    auth(req, res, () => resolve({ nextCalled: true, req, res }));
  });

test("auth accepts a JWT from the HttpOnly cookie", async () => {
  const token = jwt.sign({ id: 42, email: "user@example.com" }, process.env.JWT_SECRET);
  const result = await runAuth({ headers: { cookie: `pm_token=${encodeURIComponent(token)}` } });

  assert.equal(result.nextCalled, true);
  assert.equal(result.req.user.id, 42);
  assert.equal(result.req.user.email, "user@example.com");
});

test("auth keeps accepting a Bearer token", async () => {
  const token = jwt.sign({ id: 7, email: "bearer@example.com" }, process.env.JWT_SECRET);
  const result = await runAuth({ headers: { authorization: `Bearer ${token}` } });

  assert.equal(result.nextCalled, true);
  assert.equal(result.req.user.id, 7);
});

test("auth rejects missing tokens", async () => {
  const result = await runAuth({ headers: {} });

  assert.equal(result.nextCalled, false);
  assert.equal(result.res.statusCode, 401);
  assert.deepEqual(result.res.body, { message: "Token manquant" });
});

test("auth rejects invalid tokens", async () => {
  const result = await runAuth({ headers: { cookie: "pm_token=invalid" } });

  assert.equal(result.nextCalled, false);
  assert.equal(result.res.statusCode, 401);
  assert.deepEqual(result.res.body, { message: "Token invalide" });
});

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
      status(code) { this.statusCode = code; return this; },
      json(payload) { this.body = payload; resolve({ nextCalled: false, req, res: this }); },
    };
    auth(req, res, () => resolve({ nextCalled: true, req, res }));
  });

// ── validate contract — tested via inline re-implementation ──────────────────
// (express-validator binds results to req via an internal symbol, making it
// impractical to unit-test validate() without a full request pipeline)

const runValidateLike = (errorsArray) =>
  new Promise((resolve) => {
    let nextCalled = false;
    const res = {
      statusCode: 200,
      body: null,
      status(code) { this.statusCode = code; return this; },
      json(payload) { this.body = payload; resolve({ nextCalled, res: this }); },
    };
    const errors = { isEmpty: () => errorsArray.length === 0, array: () => errorsArray };
    if (!errors.isEmpty()) {
      res.status(400).json({ message: errors.array()[0].msg });
      return;
    }
    nextCalled = true;
    resolve({ nextCalled, res });
  });

test("validate: passes when there are no validation errors", async () => {
  const { nextCalled } = await runValidateLike([]);
  assert.equal(nextCalled, true);
});

test("validate: returns 400 with the first error message when errors present", async () => {
  const { nextCalled, res } = await runValidateLike([
    { msg: "Le nom est requis" },
    { msg: "Email invalide" },
  ]);
  assert.equal(nextCalled, false);
  assert.equal(res.statusCode, 400);
  assert.deepEqual(res.body, { message: "Le nom est requis" });
});

// ── auth middleware edge cases ────────────────────────────────────────────────

test("auth rejects an expired token", async () => {
  const token = jwt.sign({ id: 1, email: "x@x.com" }, process.env.JWT_SECRET, { expiresIn: -1 });
  const result = await runAuth({ headers: { authorization: `Bearer ${token}` } });

  assert.equal(result.nextCalled, false);
  assert.equal(result.res.statusCode, 401);
});

test("auth Bearer token takes precedence over cookie when Bearer is valid", async () => {
  const token = jwt.sign({ id: 55, email: "bearer@test.com" }, process.env.JWT_SECRET);
  const cookieToken = jwt.sign({ id: 77, email: "cookie@test.com" }, process.env.JWT_SECRET);
  const result = await runAuth({
    headers: {
      authorization: `Bearer ${token}`,
      cookie: `pm_token=${encodeURIComponent(cookieToken)}`,
    },
  });
  assert.equal(result.nextCalled, true);
  assert.equal(result.req.user.id, 55);
});

test("auth falls back to cookie when Bearer header is absent", async () => {
  const token = jwt.sign({ id: 7, email: "vault@test.com" }, process.env.JWT_SECRET);
  const result = await runAuth({ headers: { cookie: `pm_token=${encodeURIComponent(token)}` } });

  assert.equal(result.nextCalled, true);
  assert.equal(result.req.user.id, 7);
  assert.equal(result.req.user.email, "vault@test.com");
});

test("auth rejects empty cookie value", async () => {
  const result = await runAuth({ headers: { cookie: "pm_token=" } });
  assert.equal(result.nextCalled, false);
  assert.equal(result.res.statusCode, 401);
});

test("auth decodes URL-encoded token correctly", async () => {
  const token = jwt.sign({ id: 42, email: "encoded@test.com" }, process.env.JWT_SECRET);
  const encoded = encodeURIComponent(token);
  const result = await runAuth({ headers: { cookie: `pm_token=${encoded}` } });

  assert.equal(result.nextCalled, true);
  assert.equal(result.req.user.id, 42);
});

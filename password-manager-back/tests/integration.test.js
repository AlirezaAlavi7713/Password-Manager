import assert from "node:assert/strict";
import test, { after, before } from "node:test";
import jwt from "jsonwebtoken";

process.env.JWT_SECRET = "test-secret";

const { default: app } = await import("../app.js");
const { default: pool } = await import("../config/db.js");

let dbAvailable = true;
let server;
let baseUrl;
let userId;
let token;

const jsonFetch = async (path, options = {}) => {
  const response = await fetch(`${baseUrl}${path}`, {
    ...options,
    headers: {
      "content-type": "application/json",
      ...(options.headers || {}),
    },
  });

  const body = await response.json();
  return { response, body };
};

before(async () => {
  try {
    await pool.query("SELECT 1");
  } catch {
    dbAvailable = false;
    return;
  }

  const email = `integration-${Date.now()}@example.com`;
  const [result] = await pool.query(
    `INSERT INTO users (nom, prenom, email, auth_key_hash, pbkdf2_salt)
     VALUES (?, ?, ?, ?, ?)`,
    ["Integration", "Test", email, "hash", "salt"]
  );
  userId = result.insertId;
  token = jwt.sign({ id: userId, email }, process.env.JWT_SECRET);

  await new Promise((resolve) => {
    server = app.listen(0, "127.0.0.1", () => {
      baseUrl = `http://127.0.0.1:${server.address().port}/api`;
      resolve();
    });
  });
});

after(async () => {
  if (userId) {
    await pool.query("DELETE FROM users WHERE id = ?", [userId]);
  }
  if (server) {
    await new Promise((resolve) => server.close(resolve));
  }
  await pool.end();
});

test("categories: create, list, update, delete", async (t) => {
  if (!dbAvailable) return t.skip("Base MySQL indisponible");
  const authHeaders = { authorization: `Bearer ${token}` };

  const created = await jsonFetch("/categories", {
    method: "POST",
    headers: authHeaders,
    body: JSON.stringify({ name: "Admin", icon: "🔐", color: "#123456" }),
  });
  assert.equal(created.response.status, 201);
  assert.equal(typeof created.body.id, "number");

  const listed = await jsonFetch("/categories", { headers: authHeaders });
  assert.equal(listed.response.status, 200);
  assert.equal(listed.body.some((category) => category.id === created.body.id), true);

  const updated = await jsonFetch(`/categories/${created.body.id}`, {
    method: "PUT",
    headers: authHeaders,
    body: JSON.stringify({ name: "Admin mis à jour", icon: "🔑", color: "#abcdef" }),
  });
  assert.equal(updated.response.status, 200);

  const deleted = await jsonFetch(`/categories/${created.body.id}`, {
    method: "DELETE",
    headers: authHeaders,
  });
  assert.equal(deleted.response.status, 200);
});

test("vault: create, favorite, stats, filter, update, delete", async (t) => {
  if (!dbAvailable) return t.skip("Base MySQL indisponible");
  const authHeaders = { authorization: `Bearer ${token}` };

  const category = await jsonFetch("/categories", {
    method: "POST",
    headers: authHeaders,
    body: JSON.stringify({ name: "Coffre", icon: "🔒", color: "#654321" }),
  });

  const created = await jsonFetch("/vault", {
    method: "POST",
    headers: authHeaders,
    body: JSON.stringify({ category_id: category.body.id, encrypted_data: "abc123", iv: "iv123" }),
  });
  assert.equal(created.response.status, 201);

  const favorite = await jsonFetch(`/vault/${created.body.id}/favorite`, {
    method: "PATCH",
    headers: authHeaders,
  });
  assert.equal(favorite.response.status, 200);

  const stats = await jsonFetch("/vault/stats", { headers: authHeaders });
  assert.equal(stats.response.status, 200);
  assert.equal(stats.body.total, 1);
  assert.equal(stats.body.favorites, 1);

  const favorites = await jsonFetch("/vault?favorites=true", { headers: authHeaders });
  assert.equal(favorites.response.status, 200);
  assert.equal(favorites.body.length, 1);
  assert.equal(favorites.body[0].id, created.body.id);

  const updated = await jsonFetch(`/vault/${created.body.id}`, {
    method: "PUT",
    headers: authHeaders,
    body: JSON.stringify({ category_id: null, encrypted_data: "def456", iv: "iv456" }),
  });
  assert.equal(updated.response.status, 200);

  const deleted = await jsonFetch(`/vault/${created.body.id}`, {
    method: "DELETE",
    headers: authHeaders,
  });
  assert.equal(deleted.response.status, 200);
});

test("vault: rejects categories owned by another user", async (t) => {
  if (!dbAvailable) return t.skip("Base MySQL indisponible");
  const otherEmail = `other-${Date.now()}@example.com`;
  const [otherUser] = await pool.query(
    `INSERT INTO users (nom, prenom, email, auth_key_hash, pbkdf2_salt)
     VALUES (?, ?, ?, ?, ?)`,
    ["Other", "User", otherEmail, "hash", "salt"]
  );

  try {
    const [otherCategory] = await pool.query(
      `INSERT INTO categories (user_id, name, icon, color)
       VALUES (?, ?, ?, ?)`,
      [otherUser.insertId, "Privée", "🔒", "#000000"]
    );

    const result = await jsonFetch("/vault", {
      method: "POST",
      headers: { authorization: `Bearer ${token}` },
      body: JSON.stringify({ category_id: otherCategory.insertId, encrypted_data: "abc123", iv: "iv123" }),
    });

    assert.equal(result.response.status, 400);
    assert.deepEqual(result.body, { message: "Catégorie invalide" });
  } finally {
    await pool.query("DELETE FROM users WHERE id = ?", [otherUser.insertId]);
  }
});

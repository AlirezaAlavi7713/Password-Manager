import pool from "../config/db.js";

export const findUserByEmail = async (email) => {
  const sql = `SELECT * FROM users WHERE email = ?`;
  const [rows] = await pool.query(sql, [email]);
  return rows;
};

export const findUserById = async (id) => {
  const sql = `SELECT id, nom, prenom, email, pbkdf2_salt, totp_enabled, created_at FROM users WHERE id = ?`;
  const [rows] = await pool.query(sql, [id]);
  return rows;
};

export const findUserSecurityById = async (id) => {
  const sql = `SELECT id, email, totp_secret, totp_enabled FROM users WHERE id = ?`;
  const [rows] = await pool.query(sql, [id]);
  return rows;
};

export const saveTotpSecret = async (id, secret) => {
  const [r] = await pool.query(`UPDATE users SET totp_secret = ? WHERE id = ?`, [secret, id]);
  return r;
};

export const enableTotp = async (id) => {
  const [r] = await pool.query(`UPDATE users SET totp_enabled = TRUE WHERE id = ?`, [id]);
  return r;
};

export const disableTotp = async (id) => {
  const [r] = await pool.query(`UPDATE users SET totp_secret = NULL, totp_enabled = FALSE WHERE id = ?`, [id]);
  return r;
};

export const createUser = async (nom, prenom, email, auth_key_hash, pbkdf2_salt) => {
  const sql = `INSERT INTO users (nom, prenom, email, auth_key_hash, pbkdf2_salt) VALUES (?, ?, ?, ?, ?)`;
  const [response] = await pool.query(sql, [nom, prenom, email, auth_key_hash, pbkdf2_salt]);
  return response;
};

export const getSalt = async (email) => {
  const sql = `SELECT pbkdf2_salt FROM users WHERE email = ?`;
  const [rows] = await pool.query(sql, [email]);
  return rows;
};

export const updateProfile = async (id, nom, prenom, email) => {
  const sql = `UPDATE users SET nom = ?, prenom = ?, email = ? WHERE id = ?`;
  const [response] = await pool.query(sql, [nom, prenom, email, id]);
  return response;
};

export const updateMasterPasswordWithEntries = async (id, auth_key_hash, pbkdf2_salt, entries) => {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const [[{ total }]] = await conn.query(
      `SELECT COUNT(*) as total FROM vault_entries WHERE user_id = ?`,
      [id]
    );

    if (entries.length !== total) {
      throw new Error("Toutes les entrées doivent être re-chiffrées");
    }

    const seen = new Set();
    for (const entry of entries) {
      if (!entry.id || !entry.encrypted_data || !entry.iv || seen.has(entry.id)) {
        throw new Error("Entrée re-chiffrée invalide");
      }
      seen.add(entry.id);

      const [result] = await conn.query(
        `UPDATE vault_entries SET encrypted_data = ?, iv = ?, updated_at = NOW() WHERE id = ? AND user_id = ?`,
        [entry.encrypted_data, entry.iv, entry.id, id]
      );

      if (result.affectedRows !== 1) {
        throw new Error("Entrée re-chiffrée introuvable");
      }
    }

    const [response] = await conn.query(
      `UPDATE users SET auth_key_hash = ?, pbkdf2_salt = ? WHERE id = ?`,
      [auth_key_hash, pbkdf2_salt, id]
    );

    await conn.commit();
    return response;
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
};

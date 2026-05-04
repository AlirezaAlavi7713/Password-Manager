import pool from "../config/db.js";

export const getEntriesByUser = async (user_id, category_id = null, favoriteOnly = false) => {
  const cat = category_id || null;
  const sql = `
    SELECT v.id, v.category_id, v.encrypted_data, v.iv, v.is_favorite, v.created_at, v.updated_at,
      c.name as category_name, c.icon as category_icon, c.color as category_color
    FROM vault_entries v
    LEFT JOIN categories c ON v.category_id = c.id AND c.user_id = v.user_id
    WHERE v.user_id = ?
      AND (? IS NULL OR v.category_id = ?)
      AND (? = false OR v.is_favorite = true)
    ORDER BY v.is_favorite DESC, v.updated_at DESC
  `;
  const [rows] = await pool.query(sql, [user_id, cat, cat, favoriteOnly]);
  return rows;
};

export const createEntry = async (user_id, category_id, encrypted_data, iv) => {
  const sql = `INSERT INTO vault_entries (user_id, category_id, encrypted_data, iv) VALUES (?, ?, ?, ?)`;
  const [response] = await pool.query(sql, [user_id, category_id || null, encrypted_data, iv]);
  return response;
};

export const updateEntry = async (id, user_id, category_id, encrypted_data, iv) => {
  const sql = `
    UPDATE vault_entries
    SET category_id = ?, encrypted_data = ?, iv = ?, updated_at = NOW()
    WHERE id = ? AND user_id = ?
  `;
  const [response] = await pool.query(sql, [category_id || null, encrypted_data, iv, id, user_id]);
  return response;
};

export const toggleFavorite = async (id, user_id) => {
  const sql = `UPDATE vault_entries SET is_favorite = NOT is_favorite WHERE id = ? AND user_id = ?`;
  const [response] = await pool.query(sql, [id, user_id]);
  return response;
};

export const deleteEntry = async (id, user_id) => {
  const sql = `DELETE FROM vault_entries WHERE id = ? AND user_id = ?`;
  const [response] = await pool.query(sql, [id, user_id]);
  return response;
};

export const getStatsByUser = async (user_id) => {
  const sql = `
    SELECT
      COUNT(*) as total,
      SUM(CASE WHEN is_favorite THEN 1 ELSE 0 END) as favorites
    FROM vault_entries
    WHERE user_id = ?
  `;
  const [[row]] = await pool.query(sql, [user_id]);
  return {
    total: Number(row.total) || 0,
    favorites: Number(row.favorites) || 0,
  };
};

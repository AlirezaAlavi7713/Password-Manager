import pool from "../config/db.js";

export const getCategoriesByUser = async (user_id) => {
  const sql = `SELECT * FROM categories WHERE user_id = ? ORDER BY name ASC`;
  const [rows] = await pool.query(sql, [user_id]);
  return rows;
};

export const createCategory = async (user_id, name, icon, color) => {
  const sql = `INSERT INTO categories (user_id, name, icon, color) VALUES (?, ?, ?, ?)`;
  const [response] = await pool.query(sql, [user_id, name, icon, color]);
  return response;
};

export const categoryBelongsToUser = async (id, user_id) => {
  if (!id) return true;
  const sql = `SELECT id FROM categories WHERE id = ? AND user_id = ?`;
  const [rows] = await pool.query(sql, [id, user_id]);
  return rows.length > 0;
};

export const updateCategory = async (id, user_id, name, icon, color) => {
  const sql = `UPDATE categories SET name = ?, icon = ?, color = ? WHERE id = ? AND user_id = ?`;
  const [response] = await pool.query(sql, [name, icon, color, id, user_id]);
  return response;
};

export const deleteCategory = async (id, user_id) => {
  const sql = `DELETE FROM categories WHERE id = ? AND user_id = ?`;
  const [response] = await pool.query(sql, [id, user_id]);
  return response;
};

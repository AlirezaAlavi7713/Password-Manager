import mysql from "mysql2/promise";
import "./env.js";

const pool = mysql.createPool({
  host:     process.env.DB_HOST,
  port:     process.env.DB_PORT ? parseInt(process.env.DB_PORT) : 3306,
  user:     process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  ssl: process.env.DB_SSL === "true" ? { rejectUnauthorized: false } : false,
});

export default pool;

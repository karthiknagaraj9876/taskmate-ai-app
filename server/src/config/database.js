import pg from "pg";
import { env } from "./env.js";

const { Pool } = pg;

export const pool = new Pool({
  host: env.DB_HOST,
  port: env.DB_PORT,
  database: env.DB_NAME,
  user: env.DB_USER,
  password: env.DB_PASSWORD,

  max: 10,

  idleTimeoutMillis: 30000,

  connectionTimeoutMillis: 5000
});

// Connection established
pool.on("connect", () => {
  console.log("PostgreSQL client connected");
});

// Unexpected pool error
pool.on("error", (error) => {
  console.error("Unexpected PostgreSQL pool error:", error);
});

// Test database connection
export const testDatabaseConnection = async () => {
  try {
    const result = await pool.query("SELECT NOW()");

    console.log("PostgreSQL connection successful");
    console.log("Database server time:", result.rows[0].now);

    return true;
  } catch (error) {
    console.error("PostgreSQL connection failed:", error.message);
    throw error;
  }
};
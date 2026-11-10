import bcrypt from "bcrypt";

import { pool } from "../config/database.js";
import { env } from "../config/env.js";

const createAdmin = async () => {
  try {
    const {
      ADMIN_NAME,
      ADMIN_EMAIL,
      ADMIN_PASSWORD
    } = env;

    if (!ADMIN_NAME || !ADMIN_EMAIL || !ADMIN_PASSWORD) {
      throw new Error("Admin environment variables are missing");
    }

    // Check whether Admin already exists
    const existingUser = await pool.query(
      `SELECT id, email, role
       FROM taskmate.app_users
       WHERE LOWER(email) = LOWER($1)`,
      [ADMIN_EMAIL]
    );

    if (existingUser.rowCount > 0) {
      console.log("Admin user already exists.");
      return;
    }

    // Hash the password
    const passwordHash = await bcrypt.hash(
      ADMIN_PASSWORD,
      12
    );

    // Insert Admin into PostgreSQL
    const result = await pool.query(
      `INSERT INTO taskmate.app_users
       (
         full_name,
         email,
         password_hash,
         role,
         is_active
       )
       VALUES ($1, $2, $3, 'ADMIN', TRUE)
       RETURNING id, full_name, email, role`,
      [
        ADMIN_NAME,
        ADMIN_EMAIL.toLowerCase(),
        passwordHash
      ]
    );

    console.log("Admin created successfully:");
    console.table(result.rows);

  } catch (error) {
    console.error("Admin creation failed:", error.message);
    process.exitCode = 1;

  } finally {
    await pool.end();
  }
};

createAdmin();
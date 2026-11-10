import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

import { pool } from "../config/database.js";
import { env } from "../config/env.js";

// Login service
export const loginUser = async (email, password) => {

  // Find user by email
  const result = await pool.query(
    `SELECT
       id,
       full_name,
       email,
       password_hash,
       role,
       is_active
     FROM taskmate.app_users
     WHERE LOWER(email) = LOWER($1)
     LIMIT 1`,
    [email]
  );

  const user = result.rows[0];

  // Check whether user exists and is active
  if (!user || !user.is_active) {
    return null;
  }

  // Compare entered password with stored hash
  const passwordMatches = await bcrypt.compare(
    password,
    user.password_hash
  );

  if (!passwordMatches) {
    return null;
  }

  // Generate JWT
  const token = jwt.sign(
    {
      id: user.id
    },
    env.JWT_SECRET,
    {
      expiresIn: env.JWT_EXPIRES_IN,
      issuer: "taskmate-ai"
    }
  );

  // Return safe user information
  return {
    token,
    user: {
      id: user.id,
      fullName: user.full_name,
      email: user.email,
      role: user.role
    }
  };
};

// Get current logged-in user
export const getCurrentUser = async (userId) => {

  const result = await pool.query(
    `SELECT
       id,
       full_name,
       email,
       role
     FROM taskmate.app_users
     WHERE id = $1
       AND is_active = TRUE`,
    [userId]
  );

  return result.rows[0] || null;
};
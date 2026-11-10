import jwt from "jsonwebtoken";

import { env } from "../config/env.js";
import { pool } from "../config/database.js";

export const authenticate = async (req, res, next) => {
  try {

    // Read Authorization header
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        success: false,
        message: "Authentication token is required"
      });
    }

    // Extract token
    const token = authHeader.split(" ")[1];

    // Verify JWT
    const decoded = jwt.verify(
      token,
      env.JWT_SECRET,
      {
        issuer: "taskmate-ai"
      }
    );

    // Find current active user in database
    const result = await pool.query(
      `SELECT id, full_name, email, role
       FROM taskmate.app_users
       WHERE id = $1
         AND is_active = TRUE`,
      [decoded.id]
    );

    if (result.rowCount === 0) {
      return res.status(401).json({
        success: false,
        message: "User is inactive or does not exist"
      });
    }

    const user = result.rows[0];

    // Attach user to request
    req.user = {
      id: user.id,
      fullName: user.full_name,
      email: user.email,
      role: user.role
    };

    next();

  } catch (error) {

    if (
      error.name === "JsonWebTokenError" ||
      error.name === "TokenExpiredError" ||
      error.name === "NotBeforeError"
    ) {
      return res.status(401).json({
        success: false,
        message: "Invalid or expired token"
      });
    }

    console.error("Authentication error:", error);

    return res.status(500).json({
      success: false,
      message: "Authentication service error"
    });
  }
};
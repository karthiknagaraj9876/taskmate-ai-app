import { z } from "zod";

import {
  loginUser,
  getCurrentUser
} from "../services/auth.service.js";

// Login request validation
const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1)
});

// POST /api/auth/login
export const login = async (req, res) => {
  try {

    // Validate request body
    const validation = loginSchema.safeParse(req.body);

    if (!validation.success) {
      return res.status(400).json({
        success: false,
        message: "Invalid login details",
        errors: validation.error.flatten()
      });
    }

    const { email, password } = validation.data;

    // Call authentication service
    const result = await loginUser(email, password);

    if (!result) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password"
      });
    }

    return res.status(200).json({
      success: true,
      message: "Login successful",
      data: result
    });

  } catch (error) {
    console.error("Login error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to process login"
    });
  }
};

// GET /api/auth/me
export const getMe = async (req, res) => {
  try {

    const user = await getCurrentUser(req.user.id);

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "User account is inactive or unavailable"
      });
    }

    return res.status(200).json({
      success: true,
      data: {
        user: {
          id: user.id,
          fullName: user.full_name,
          email: user.email,
          role: user.role
        }
      }
    });

  } catch (error) {
    console.error("Get current user error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to retrieve user information"
    });
  }
};
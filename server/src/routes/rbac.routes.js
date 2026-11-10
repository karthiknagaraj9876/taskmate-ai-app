import express from "express";
import { authenticate } from "../middleware/authenticate.js";
import { authorizeRoles } from "../middleware/authorize.js";

const router = express.Router();

// Only authenticated users
router.get("/authenticated", authenticate, (req, res) => {
  res.status(200).json({
    success: true,
    message: "You are authenticated",
    user: req.user
  });
});

// Only Admin
router.get(
  "/admin-only",
  authenticate,
  authorizeRoles("ADMIN"),
  (req, res) => {
    res.status(200).json({
      success: true,
      message: "Welcome Admin"
    });
  }
);

// Admin or Manager
router.get(
  "/manager-dashboard",
  authenticate,
  authorizeRoles("ADMIN", "MANAGER"),
  (req, res) => {
    res.status(200).json({
      success: true,
      message: "Welcome to the Manager Dashboard"
    });
  }
);

// All three roles
router.get(
  "/employee-dashboard",
  authenticate,
  authorizeRoles("ADMIN", "MANAGER", "EMPLOYEE"),
  (req, res) => {
    res.status(200).json({
      success: true,
      message: "Welcome to the TaskMate Dashboard"
    });
  }
);

export default router;
import express from "express";

import {
  login,
  getMe
} from "../controllers/auth.controller.js";

import { authenticate } from "../middleware/authenticate.js";

const router = express.Router();

// Public API
router.post("/login", login);

// Protected API
router.get("/me", authenticate, getMe);

export default router;
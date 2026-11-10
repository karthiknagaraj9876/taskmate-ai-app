
import express from "express";

import { authenticate } from "../middleware/authenticate.js";
import { authorizeRoles } from "../middleware/authorize.js";

import {
  createUserController,
  getUsersController,
  getUserByIdController,
  updateUserController,
  updateUserActiveStatusController
} from "../controllers/user.controller.js";

const router = express.Router();

router.use(authenticate);

// Admin and Manager can create users.
// The service enforces which roles each can create.
router.post(
  "/",
  authorizeRoles("ADMIN", "MANAGER"),
  createUserController
);

// Each role sees only users within its permitted scope.
router.get("/", getUsersController);
router.get("/:id", getUserByIdController);

// Admin and Manager can update accessible user profiles.
router.patch(
  "/:id",
  authorizeRoles("ADMIN", "MANAGER"),
  updateUserController
);

// Admin and Manager can activate/deactivate accessible users.
router.patch(
  "/:id/active",
  authorizeRoles("ADMIN", "MANAGER"),
  updateUserActiveStatusController
);

export default router;

import express from "express";

import { authenticate } from "../middleware/authenticate.js";
import { authorizeRoles } from "../middleware/authorize.js";

import {
  createTaskController,
  getTasksController,
  getTaskByIdController,
  updateTaskController,
  updateTaskStatusController,
  deleteTaskController
} from "../controllers/task.controller.js";

const router = express.Router();

// Every task API requires authentication.
router.use(authenticate);

// All authenticated roles can view their accessible tasks.
router.get("/", getTasksController);
router.get("/:id", getTaskByIdController);

// Only Admin and Manager can create or edit task details.
router.post(
  "/",
  authorizeRoles("ADMIN", "MANAGER"),
  createTaskController
);

router.patch(
  "/:id",
  authorizeRoles("ADMIN", "MANAGER"),
  updateTaskController
);

// All roles can update status, subject to task ownership.
router.patch("/:id/status", updateTaskStatusController);

// Only Admin and Manager can delete.
router.delete(
  "/:id",
  authorizeRoles("ADMIN", "MANAGER"),
  deleteTaskController
);

export default router;
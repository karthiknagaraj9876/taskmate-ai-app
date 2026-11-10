
import express from "express";

import { authenticate } from "../middleware/authenticate.js";
import { authorizeRoles } from "../middleware/authorize.js";

import {
  createProjectController,
  getProjectsController,
  getProjectByIdController,
  updateProjectController
} from "../controllers/project.controller.js";

const router = express.Router();

router.use(authenticate);

// Admin and Manager can create projects.
router.post(
  "/",
  authorizeRoles("ADMIN", "MANAGER"),
  createProjectController
);

// Each role sees only accessible projects.
router.get("/", getProjectsController);
router.get("/:id", getProjectByIdController);

// Admin and Manager can update projects.
// The service checks Manager ownership.
router.patch(
  "/:id",
  authorizeRoles("ADMIN", "MANAGER"),
  updateProjectController
);

export default router;

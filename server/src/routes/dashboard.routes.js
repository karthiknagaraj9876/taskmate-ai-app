
import express from "express";

import { authenticate } from "../middleware/authenticate.js";

import {
  dashboardSummary,
  priorityBreakdown,
  projectProgress,
  recentTasks,
} from "../controllers/dashboard.controller.js";

const router = express.Router();

router.use(authenticate);

router.get("/summary", dashboardSummary);

router.get("/priority-breakdown", priorityBreakdown);

router.get("/project-progress", projectProgress);

router.get("/recent-tasks", recentTasks);

export default router;

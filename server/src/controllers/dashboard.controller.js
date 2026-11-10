
import {
  getDashboardSummary,
  getPriorityBreakdown,
  getProjectProgress,
  getRecentTasks,
} from "../services/dashboard.service.js";

import { asyncHandler } from "../utils/asyncHandler.js";

export const dashboardSummary = asyncHandler(async (req, res) => {
  const data = await getDashboardSummary(req.user);

  res.status(200).json({
    success: true,
    message: "Dashboard summary retrieved successfully",
    data,
  });
});

export const priorityBreakdown = asyncHandler(async (req, res) => {
  const data = await getPriorityBreakdown(req.user);

  res.status(200).json({
    success: true,
    message: "Priority breakdown retrieved successfully",
    data,
  });
});

export const projectProgress = asyncHandler(async (req, res) => {
  const data = await getProjectProgress(req.user);

  res.status(200).json({
    success: true,
    message: "Project progress retrieved successfully",
    count: data.length,
    data,
  });
});

export const recentTasks = asyncHandler(async (req, res) => {
  const data = await getRecentTasks(req.user);

  res.status(200).json({
    success: true,
    message: "Recent tasks retrieved successfully",
    count: data.length,
    data,
  });
});

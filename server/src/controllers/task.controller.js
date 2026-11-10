
import { z } from "zod";

import {
  getTasks,
  getTaskById,
  createTask,
  updateTask,
  updateTaskStatus,
  deleteTask
} from "../services/task.service.js";

import { asyncHandler } from "../utils/asyncHandler.js";

// Allowed task statuses
const taskStatus = z.enum([
  "TODO",
  "IN_PROGRESS",
  "COMPLETED"
]);

// Allowed task priorities
const taskPriority = z.enum([
  "LOW",
  "MEDIUM",
  "HIGH",
  "CRITICAL"
]);

// Date validation: YYYY-MM-DD
const dateSchema = z.string().regex(
  /^\d{4}-\d{2}-\d{2}$/,
  "Date must be in YYYY-MM-DD format"
);

// CREATE TASK validation
const createTaskSchema = z.object({
  title: z.string().trim().min(3).max(200),
  description: z.string().max(2000).nullable().optional(),
  projectId: z.string().uuid(),
  assignedTo: z.string().uuid(),
  priority: taskPriority.optional(),
  dueDate: dateSchema.nullable().optional()
});

// UPDATE TASK validation
const updateTaskSchema = z.object({
  title: z.string().trim().min(3).max(200).optional(),
  description: z.string().max(2000).nullable().optional(),
  assignedTo: z.string().uuid().optional(),
  priority: taskPriority.optional(),
  dueDate: dateSchema.nullable().optional()
}).strict().refine(
  (data) => Object.keys(data).length > 0,
  "At least one field is required"
);

// UPDATE STATUS validation
const updateStatusSchema = z.object({
  status: taskStatus
});

// GET TASKS validation
const listTasksSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
  status: taskStatus.optional(),
  priority: taskPriority.optional()
});

// CREATE TASK
export const createTaskController = asyncHandler(async (req, res) => {
  const validation = createTaskSchema.safeParse(req.body);

  if (!validation.success) {
    return res.status(400).json({
      success: false,
      message: "Invalid task details",
      errors: validation.error.flatten()
    });
  }

  const task = await createTask(validation.data, req.user);

  return res.status(201).json({
    success: true,
    message: "Task created successfully",
    data: task
  });
});

// GET ALL ACCESSIBLE TASKS
export const getTasksController = asyncHandler(async (req, res) => {
  const validation = listTasksSchema.safeParse(req.query);

  if (!validation.success) {
    return res.status(400).json({
      success: false,
      message: "Invalid filters",
      errors: validation.error.flatten()
    });
  }

  const result = await getTasks({
    user: req.user,
    ...validation.data
  });

  return res.status(200).json({
    success: true,
    data: result.tasks,
    pagination: result.pagination
  });
});

// GET TASK BY ID
export const getTaskByIdController = asyncHandler(async (req, res) => {
  const idValidation = z.string().uuid().safeParse(req.params.id);

  if (!idValidation.success) {
    return res.status(400).json({
      success: false,
      message: "Invalid task ID"
    });
  }

  const task = await getTaskById(req.params.id, req.user);

  if (!task) {
    return res.status(404).json({
      success: false,
      message: "Task not found"
    });
  }

  return res.status(200).json({
    success: true,
    data: task
  });
});

// UPDATE TASK DETAILS
export const updateTaskController = asyncHandler(async (req, res) => {
  const idValidation = z.string().uuid().safeParse(req.params.id);
  const bodyValidation = updateTaskSchema.safeParse(req.body);

  if (!idValidation.success || !bodyValidation.success) {
    return res.status(400).json({
      success: false,
      message: "Invalid task ID or update details",
      errors: bodyValidation.success
        ? undefined
        : bodyValidation.error.flatten()
    });
  }

  const task = await updateTask(
    req.params.id,
    bodyValidation.data,
    req.user
  );

  return res.status(200).json({
    success: true,
    message: "Task updated successfully",
    data: task
  });
});

// UPDATE TASK STATUS
export const updateTaskStatusController = asyncHandler(async (req, res) => {
  const idValidation = z.string().uuid().safeParse(req.params.id);
  const bodyValidation = updateStatusSchema.safeParse(req.body);

  if (!idValidation.success || !bodyValidation.success) {
    return res.status(400).json({
      success: false,
      message: "Invalid task ID or status",
      errors: bodyValidation.success
        ? undefined
        : bodyValidation.error.flatten()
    });
  }

  const task = await updateTaskStatus(
    req.params.id,
    bodyValidation.data.status,
    req.user
  );

  return res.status(200).json({
    success: true,
    message: "Task status updated successfully",
    data: task
  });
});

// DELETE TASK
export const deleteTaskController = asyncHandler(async (req, res) => {
  const idValidation = z.string().uuid().safeParse(req.params.id);

  if (!idValidation.success) {
    return res.status(400).json({
      success: false,
      message: "Invalid task ID"
    });
  }

  await deleteTask(req.params.id, req.user);

  return res.status(200).json({
    success: true,
    message: "Task deleted successfully"
  });
});

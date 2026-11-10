
import { z } from "zod";

import {
  createUser,
  getUsers,
  getUserById,
  updateUser,
  setUserActiveStatus
} from "../services/user.service.js";

import { asyncHandler } from "../utils/asyncHandler.js";

const createUserSchema = z.object({
  fullName: z.string().trim().min(2).max(150),
  email: z.string().email().max(255),
  password: z.string().min(12).max(128),
  role: z.enum(["ADMIN", "MANAGER", "EMPLOYEE"]),
  managerId: z.string().uuid().nullable().optional()
}).strict();

const updateUserSchema = z.object({
  fullName: z.string().trim().min(2).max(150).optional(),
  email: z.string().email().max(255).optional()
}).strict().refine(
  (data) => Object.keys(data).length > 0,
  "At least one field is required"
);

const activeStatusSchema = z.object({
  isActive: z.boolean()
});

// CREATE USER
export const createUserController = asyncHandler(async (req, res) => {
  const validation = createUserSchema.safeParse(req.body);

  if (!validation.success) {
    return res.status(400).json({
      success: false,
      message: "Invalid user details",
      errors: validation.error.flatten()
    });
  }

  const user = await createUser(validation.data, req.user);

  return res.status(201).json({
    success: true,
    message: "User created successfully",
    data: user
  });
});

// GET ALL ACCESSIBLE USERS
export const getUsersController = asyncHandler(async (req, res) => {
  const users = await getUsers(req.user);

  return res.status(200).json({
    success: true,
    count: users.length,
    data: users
  });
});

// GET USER BY ID
export const getUserByIdController = asyncHandler(async (req, res) => {
  const idValidation = z.string().uuid().safeParse(req.params.id);

  if (!idValidation.success) {
    return res.status(400).json({
      success: false,
      message: "Invalid user ID"
    });
  }

  const user = await getUserById(req.params.id, req.user);

  if (!user) {
    return res.status(404).json({
      success: false,
      message: "User not found"
    });
  }

  return res.status(200).json({
    success: true,
    data: user
  });
});

// UPDATE USER
export const updateUserController = asyncHandler(async (req, res) => {
  const idValidation = z.string().uuid().safeParse(req.params.id);
  const bodyValidation = updateUserSchema.safeParse(req.body);

  if (!idValidation.success || !bodyValidation.success) {
    return res.status(400).json({
      success: false,
      message: "Invalid user ID or update details",
      errors: bodyValidation.success
        ? undefined
        : bodyValidation.error.flatten()
    });
  }

  const user = await updateUser(
    req.params.id,
    bodyValidation.data,
    req.user
  );

  return res.status(200).json({
    success: true,
    message: "User updated successfully",
    data: user
  });
});

// ACTIVATE / DEACTIVATE USER
export const updateUserActiveStatusController = asyncHandler(
  async (req, res) => {
    const idValidation = z.string().uuid().safeParse(req.params.id);
    const bodyValidation = activeStatusSchema.safeParse(req.body);

    if (!idValidation.success || !bodyValidation.success) {
      return res.status(400).json({
        success: false,
        message: "Invalid user ID or account status",
        errors: bodyValidation.success
          ? undefined
          : bodyValidation.error.flatten()
      });
    }

    const user = await setUserActiveStatus(
      req.params.id,
      bodyValidation.data.isActive,
      req.user
    );

    return res.status(200).json({
      success: true,
      message: "User account status updated successfully",
      data: user
    });
  }
);

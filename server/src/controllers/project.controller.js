
import { z } from "zod";

import {
  createProject,
  getProjects,
  getProjectById,
  updateProject
} from "../services/project.service.js";

import { asyncHandler } from "../utils/asyncHandler.js";

const createProjectSchema = z.object({
  projectName: z.string().trim().min(3).max(200),
  description: z.string().max(2000).nullable().optional(),
  managerId: z.string().uuid().optional()
}).strict();

const updateProjectSchema = z.object({
  projectName: z.string().trim().min(3).max(200).optional(),
  description: z.string().max(2000).nullable().optional(),
  status: z.enum(["ACTIVE", "COMPLETED", "ON_HOLD"]).optional()
}).strict().refine(
  (data) => Object.keys(data).length > 0,
  "At least one field is required"
);

// CREATE PROJECT
export const createProjectController = asyncHandler(
  async (req, res) => {
    const validation = createProjectSchema.safeParse(req.body);

    if (!validation.success) {
      return res.status(400).json({
        success: false,
        message: "Invalid project details",
        errors: validation.error.flatten()
      });
    }

    const project = await createProject(
      validation.data,
      req.user
    );

    return res.status(201).json({
      success: true,
      message: "Project created successfully",
      data: project
    });
  }
);

// GET ALL ACCESSIBLE PROJECTS
export const getProjectsController = asyncHandler(
  async (req, res) => {
    const projects = await getProjects(req.user);

    return res.status(200).json({
      success: true,
      count: projects.length,
      data: projects
    });
  }
);

// GET PROJECT BY ID
export const getProjectByIdController = asyncHandler(
  async (req, res) => {
    const idValidation = z.string().uuid().safeParse(req.params.id);

    if (!idValidation.success) {
      return res.status(400).json({
        success: false,
        message: "Invalid project ID"
      });
    }

    const project = await getProjectById(
      req.params.id,
      req.user
    );

    if (!project) {
      return res.status(404).json({
        success: false,
        message: "Project not found"
      });
    }

    return res.status(200).json({
      success: true,
      data: project
    });
  }
);

// UPDATE PROJECT
export const updateProjectController = asyncHandler(
  async (req, res) => {
    const idValidation = z.string().uuid().safeParse(req.params.id);
    const bodyValidation = updateProjectSchema.safeParse(req.body);

    if (!idValidation.success || !bodyValidation.success) {
      return res.status(400).json({
        success: false,
        message: "Invalid project ID or update details",
        errors: bodyValidation.success
          ? undefined
          : bodyValidation.error.flatten()
      });
    }

    const project = await updateProject(
      req.params.id,
      bodyValidation.data,
      req.user
    );

    return res.status(200).json({
      success: true,
      message: "Project updated successfully",
      data: project
    });
  }
);

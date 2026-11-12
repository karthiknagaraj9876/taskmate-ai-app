
import api from "./api";

import type {
  Project,
  ProjectPayload,
  ProjectUpdatePayload,
} from "../types/project.types";

interface ProjectListResponse {
  success: boolean;
  count: number;
  data: Project[];
}

interface ProjectResponse {
  success: boolean;
  message?: string;
  data: Project;
}

export const getProjects = async (): Promise<Project[]> => {
  const response = await api.get<ProjectListResponse>("/projects");

  return response.data.data;
};

export const getProjectById = async (
  projectId: string
): Promise<Project> => {
  const response = await api.get<ProjectResponse>(
    `/projects/${projectId}`
  );

  return response.data.data;
};

export const createProject = async (
  payload: ProjectPayload
): Promise<Project> => {
  const response = await api.post<ProjectResponse>(
    "/projects",
    payload
  );

  return response.data.data;
};

export const updateProject = async (
  projectId: string,
  payload: ProjectUpdatePayload
): Promise<Project> => {
  const response = await api.patch<ProjectResponse>(
    `/projects/${projectId}`,
    payload
  );

  return response.data.data;
};


export type ProjectStatus = "ACTIVE" | "COMPLETED" | "ON_HOLD";

export interface Project {
  id: string;
  project_name: string;
  description: string | null;
  manager_id: string | null;
  status: ProjectStatus;
  created_at: string;
  updated_at: string;
  manager_name?: string | null;
  task_count?: number;
}

export interface ProjectPayload {
  projectName: string;
  description?: string | null;
  managerId?: string;
}

export interface ProjectUpdatePayload {
  projectName?: string;
  description?: string | null;
  status?: ProjectStatus;
}


export type TaskStatus = "TODO" | "IN_PROGRESS" | "COMPLETED";
export type TaskPriority = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

export interface Task {
  id: string;
  title: string;
  description: string | null;
  project_id: string;
  assigned_to: string;
  created_by: string;
  status: TaskStatus;
  priority: TaskPriority;
  due_date: string | null;
  completed_at?: string | null;
  created_at: string;
  updated_at: string;
  project_name?: string | null;
  assigned_to_name?: string | null;
}

export interface TaskPayload {
  title: string;
  description: string;
  projectId: string;
  assignedTo: string;
  priority: TaskPriority;
  dueDate: string | null;
}

export interface TaskFilters {
  page: number;
  limit: number;
  status?: TaskStatus | "";
  priority?: TaskPriority | "";
  search?: string;
}

export interface TaskListResponse {
  success: boolean;
  message: string;
  count?: number;
  data: Task[];
}

export interface ProjectOption {
  id: string;
  project_name: string;
  projectName?: string;
}

export interface UserOption {
  id: string;
  fullName?: string;
  full_name?: string;
  email: string;
  role: string;
}

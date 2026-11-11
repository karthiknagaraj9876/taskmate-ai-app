
import api from "./api";

export interface DashboardSummary {
  total_tasks: number;
  todo_tasks: number;
  in_progress_tasks: number;
  completed_tasks: number;
  overdue_tasks: number;
  due_soon_tasks: number;
  completion_rate: number | string;
}

export interface PriorityItem {
  priority: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  task_count: number;
}

export interface ProjectProgressItem {
  project_id: string;
  project_name: string;
  project_status: string;
  total_tasks: number;
  completed_tasks: number;
  pending_tasks: number;
  completion_rate: number | string;
}

export interface RecentTask {
  id: string;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  due_date: string | null;
  created_at: string;
  updated_at: string;
  project_name: string | null;
  assigned_to_name: string | null;
}

interface ApiResponse<T> {
  success: boolean;
  message: string;
  count?: number;
  data: T;
}

export const dashboardService = {
  async getSummary() {
    const response = await api.get<ApiResponse<DashboardSummary>>(
      "/dashboard/summary"
    );

    return response.data.data;
  },

  async getPriorityBreakdown() {
    const response = await api.get<ApiResponse<PriorityItem[]>>(
      "/dashboard/priority-breakdown"
    );

    return response.data.data;
  },

  async getProjectProgress() {
    const response = await api.get<ApiResponse<ProjectProgressItem[]>>(
      "/dashboard/project-progress"
    );

    return response.data.data;
  },

  async getRecentTasks() {
    const response = await api.get<ApiResponse<RecentTask[]>>(
      "/dashboard/recent-tasks"
    );

    return response.data.data;
  },

  async getDashboardData() {
    const [
      summary,
      priorities,
      projects,
      recentTasks,
    ] = await Promise.all([
      this.getSummary(),
      this.getPriorityBreakdown(),
      this.getProjectProgress(),
      this.getRecentTasks(),
    ]);

    return {
      summary,
      priorities,
      projects,
      recentTasks,
    };
  },
};

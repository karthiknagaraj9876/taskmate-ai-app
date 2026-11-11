
import api from "./api";
import type {
  Task,
  TaskPayload,
  TaskFilters,
  ProjectOption,
  UserOption,
} from "../types/task.types";

interface ApiResponse<T> {
  success: boolean;
  message: string;
  count?: number;
  data: T;
}

function extractData<T>(response: { data: ApiResponse<T> }): T {
  return response.data.data;
}

export const getTasks = async (filters: TaskFilters) => {
  const response = await api.get<ApiResponse<Task[]>>("/tasks", {
    params: {
      page: filters.page,
      limit: filters.limit,
      ...(filters.status ? { status: filters.status } : {}),
      ...(filters.priority ? { priority: filters.priority } : {}),
      ...(filters.search ? { search: filters.search } : {}),
    },
  });

  return {
    tasks: extractData(response),
    count: response.data.count ?? response.data.data.length,
  };
};

export const getTaskById = async (id: string): Promise<Task> => {
  const response = await api.get<ApiResponse<Task>>(`/tasks/${id}`);
  return extractData(response);
};

export const createTask = async (
  payload: TaskPayload
): Promise<Task> => {
  const response = await api.post<ApiResponse<Task>>("/tasks", payload);
  return extractData(response);
};

export const updateTask = async (
  id: string,
  payload: Partial<TaskPayload>
): Promise<Task> => {
  const response = await api.patch<ApiResponse<Task>>(
    `/tasks/${id}`,
    payload
  );

  return extractData(response);
};

export const updateTaskStatus = async (
  id: string,
  status: string
): Promise<Task> => {
  const response = await api.patch<ApiResponse<Task>>(
    `/tasks/${id}/status`,
    { status }
  );

  return extractData(response);
};

export const deleteTask = async (id: string): Promise<void> => {
  await api.delete(`/tasks/${id}`);
};

export const getProjects = async (): Promise<ProjectOption[]> => {
  const response = await api.get<ApiResponse<ProjectOption[]>>("/projects");
  return extractData(response);
};

export const getUsers = async (): Promise<UserOption[]> => {
  const response = await api.get<ApiResponse<UserOption[]>>("/users");
  return extractData(response);
};

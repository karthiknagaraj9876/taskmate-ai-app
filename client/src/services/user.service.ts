
import api from "./api";

import type {
  AppUser,
  CreateUserPayload,
  UpdateUserPayload,
  UpdateUserStatusPayload,
} from "../types/user.types";

interface UserListResponse {
  success: boolean;
  count: number;
  data: AppUser[];
}

interface UserResponse {
  success: boolean;
  message?: string;
  data: AppUser;
}

export const getUsers = async (): Promise<AppUser[]> => {
  const response = await api.get<UserListResponse>("/users");

  return response.data.data;
};

export const getUserById = async (
  userId: string
): Promise<AppUser> => {
  const response = await api.get<UserResponse>(
    `/users/${userId}`
  );

  return response.data.data;
};

export const createUser = async (
  payload: CreateUserPayload
): Promise<AppUser> => {
  const response = await api.post<UserResponse>(
    "/users",
    payload
  );

  return response.data.data;
};

export const updateUser = async (
  userId: string,
  payload: UpdateUserPayload
): Promise<AppUser> => {
  const response = await api.patch<UserResponse>(
    `/users/${userId}`,
    payload
  );

  return response.data.data;
};

export const updateUserStatus = async (
  userId: string,
  payload: UpdateUserStatusPayload
): Promise<AppUser> => {
  const response = await api.patch<UserResponse>(
    `/users/${userId}/active`,
    payload
  );

  return response.data.data;
};

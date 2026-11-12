
export type UserRole = "ADMIN" | "MANAGER" | "EMPLOYEE";

export interface AppUser {
  id: string;
  full_name: string;
  email: string;
  role: UserRole;
  manager_id: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  manager_name?: string | null;
}

export interface CreateUserPayload {
  fullName: string;
  email: string;
  password: string;
  role: UserRole;
  managerId?: string;
}

export interface UpdateUserPayload {
  fullName?: string;
  email?: string;
}

export interface UpdateUserStatusPayload {
  isActive: boolean;
}

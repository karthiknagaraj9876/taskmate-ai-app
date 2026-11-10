
import api from "./api";

import type {
  AuthUser,
  LoginCredentials,
} from "../types/auth.types";

interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
}

interface LoginApiData {
  token: string;
  user?: AuthUser;
}

export const authService = {
  async login(credentials: LoginCredentials) {
    const response = await api.post<ApiResponse<LoginApiData>>(
      "/auth/login",
      credentials
    );

    const token = response.data.data.token;

    if (!token) {
      throw new Error("Authentication token was not returned");
    }

    localStorage.setItem("taskmate_token", token);

    // Some backend implementations return the user with the token.
    // If not, retrieve the user using the /me endpoint.
    let user = response.data.data.user;

    if (!user) {
      user = await this.getCurrentUser();
    }

    return {
      token,
      user,
    };
  },

  async getCurrentUser(): Promise<AuthUser> {
    const response = await api.get<ApiResponse<AuthUser>>(
      "/auth/me"
    );

    return response.data.data;
  },

  logout() {
    localStorage.removeItem("taskmate_token");
  },
};

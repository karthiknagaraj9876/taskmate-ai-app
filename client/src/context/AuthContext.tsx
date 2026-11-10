
import {
  createContext,
  useContext,
  useEffect,
  useState,
} from "react";

import { authService } from "../services/auth.service";

import type {
  AuthContextType,
  AuthUser,
  LoginCredentials,
} from "../types/auth.types";

const AuthContext = createContext<AuthContextType | undefined>(
  undefined
);

interface AuthProviderProps {
  children: React.ReactNode;
}

export const AuthProvider = ({
  children,
}: AuthProviderProps) => {
  const [user, setUser] = useState<AuthUser | null>(null);

  const [token, setToken] = useState<string | null>(
    localStorage.getItem("taskmate_token")
  );

  const [isLoading, setIsLoading] = useState(true);

  // Verify existing token when the application starts.
  useEffect(() => {
    const verifyAuthentication = async () => {
      const existingToken = localStorage.getItem("taskmate_token");

      if (!existingToken) {
        setIsLoading(false);
        return;
      }

      try {
        const currentUser = await authService.getCurrentUser();

        setUser(currentUser);
        setToken(existingToken);
      } catch (error) {
        authService.logout();
        setUser(null);
        setToken(null);
      } finally {
        setIsLoading(false);
      }
    };

    verifyAuthentication();
  }, []);

  const login = async (credentials: LoginCredentials) => {
    const result = await authService.login(credentials);

    setToken(result.token);
    setUser(result.user);
  };

  const logout = () => {
    authService.logout();

    setToken(null);
    setUser(null);
  };

  const value: AuthContextType = {
    user,
    token,
    isAuthenticated: Boolean(user && token),
    isLoading,
    login,
    logout,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error(
      "useAuth must be used inside AuthProvider"
    );
  }

  return context;
};

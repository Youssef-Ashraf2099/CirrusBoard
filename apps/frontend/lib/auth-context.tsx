"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import type { User, UserRole } from "@/lib/types";
import { api, ApiError } from "@/lib/api/client";
import { DEFAULT_TEAM_ID } from "@/lib/config";
import { mapUiRoleToApi } from "@/lib/api/mappers";

const STORAGE_KEY = "taskflow_user";
const ACCESS_TOKEN_KEY = "accessToken";
const ID_TOKEN_KEY = "idToken";
const REFRESH_TOKEN_KEY = "refreshToken";

function storeTokens(tokens?: {
  accessToken?: string;
  idToken?: string;
  refreshToken?: string;
}) {
  if (!tokens) return;
  if (tokens.accessToken) {
    localStorage.setItem(ACCESS_TOKEN_KEY, tokens.accessToken);
  }
  if (tokens.idToken) {
    localStorage.setItem(ID_TOKEN_KEY, tokens.idToken);
  }
  if (tokens.refreshToken) {
    localStorage.setItem(REFRESH_TOKEN_KEY, tokens.refreshToken);
  }
}

function clearTokens() {
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(ID_TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
}

interface AuthContextType {
  user: User | null;
  teamId: string;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (
    name: string,
    email: string,
    password: string,
    role: UserRole,
  ) => Promise<void>;
  logout: () => void;
  updateUser: (data: Partial<User>) => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const teamId = user?.teamId ?? DEFAULT_TEAM_ID;

  useEffect(() => {
    const hydrate = async () => {
      const raw =
        typeof window !== "undefined"
          ? localStorage.getItem(STORAGE_KEY)
          : null;
      if (!raw) {
        setIsLoading(false);
        return;
      }
      try {
        const parsed = JSON.parse(raw) as User;
        setUser(parsed);
        const fresh = await api.getUser(parsed.id);
        setUser(fresh);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(fresh));
      } catch {
        localStorage.removeItem(STORAGE_KEY);
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    };
    void hydrate();
  }, []);

  const login = async (email: string, password: string) => {
    setIsLoading(true);
    try {
      const result = await api.login(email, password);

      console.log("LOGIN RESULT:", JSON.stringify(result, null, 2)); // ADD THIS

      setUser(result.user);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(result.user));
      if (result.tokens?.accessToken || result.tokens?.idToken) {
        storeTokens(result.tokens);
      } else {
        clearTokens();
      }
      router.push("/dashboard");
    } finally {
      setIsLoading(false);
    }
  };

  const signup = async (
    name: string,
    email: string,
    password: string,
    role: UserRole,
  ) => {
    setIsLoading(true);
    try {
      // 1. Create user in DB + Cognito
      await api.createUser({
        name,
        email,
        password,
        role: mapUiRoleToApi(role),
        primaryTeamId: DEFAULT_TEAM_ID,
      });

      // 2. Login to get Cognito tokens
      const result = await api.login(email, password);
      setUser(result.user);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(result.user));
      if (result.tokens?.accessToken || result.tokens?.idToken) {
        storeTokens(result.tokens);
      }
      router.push("/dashboard");
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem(STORAGE_KEY);
    clearTokens();
    router.push("/login");
  };

  const updateUser = (data: Partial<User>) => {
    if (user) {
      const next = { ...user, ...data };
      setUser(next);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    }
  };

  const refreshUser = async () => {
    if (!user) return;
    const next = await api.getUser(user.id);
    setUser(next);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        teamId,
        isLoading,
        isAuthenticated: !!user,
        login,
        signup,
        logout,
        updateUser,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

export { ApiError };

export function ProtectedRoute({
  children,
  allowedRoles,
}: {
  children: ReactNode;
  allowedRoles?: UserRole[];
}) {
  const { user, isLoading, isAuthenticated } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push("/login");
    }

    if (!isLoading && isAuthenticated && allowedRoles?.length && user) {
      if (!allowedRoles.includes(user.role)) {
        router.push("/dashboard");
      }
    }
  }, [isLoading, isAuthenticated, allowedRoles, user, router]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  if (allowedRoles?.length && user && !allowedRoles.includes(user.role)) {
    return null;
  }

  return <>{children}</>;
}

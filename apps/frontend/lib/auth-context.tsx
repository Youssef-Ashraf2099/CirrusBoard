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
import { api, ApiError, type LoginResult } from "@/lib/api/client";
import { DEFAULT_TEAM_ID } from "@/lib/config";
import { mapUiRoleToApi } from "@/lib/api/mappers";

const STORAGE_KEY = "taskflow_user";
const ACCESS_TOKEN_KEY = "cognitoAccessToken";
const ID_TOKEN_KEY = "cognitoIdToken";
const REFRESH_TOKEN_KEY = "cognitoRefreshToken";
const LEGACY_ACCESS_TOKEN_KEY = "accessToken";
const LEGACY_ID_TOKEN_KEY = "idToken";
const LEGACY_REFRESH_TOKEN_KEY = "refreshToken";

function storeTokens(tokens?: {
  accessToken?: string;
  idToken?: string;
  refreshToken?: string;
}) {
  if (!tokens) return;
  if (tokens.accessToken) {
    localStorage.setItem(ACCESS_TOKEN_KEY, tokens.accessToken);
    localStorage.setItem(LEGACY_ACCESS_TOKEN_KEY, tokens.accessToken);
  }
  if (tokens.idToken) {
    localStorage.setItem(ID_TOKEN_KEY, tokens.idToken);
    localStorage.setItem(LEGACY_ID_TOKEN_KEY, tokens.idToken);
  }
  if (tokens.refreshToken) {
    localStorage.setItem(REFRESH_TOKEN_KEY, tokens.refreshToken);
    localStorage.setItem(LEGACY_REFRESH_TOKEN_KEY, tokens.refreshToken);
  }
}

function clearTokens() {
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(ID_TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
  localStorage.removeItem(LEGACY_ACCESS_TOKEN_KEY);
  localStorage.removeItem(LEGACY_ID_TOKEN_KEY);
  localStorage.removeItem(LEGACY_REFRESH_TOKEN_KEY);
}

function getStoredTokens() {
  if (typeof window === "undefined") return null;
  const accessToken =
    localStorage.getItem(ACCESS_TOKEN_KEY) ||
    localStorage.getItem(LEGACY_ACCESS_TOKEN_KEY);
  const idToken =
    localStorage.getItem(ID_TOKEN_KEY) ||
    localStorage.getItem(LEGACY_ID_TOKEN_KEY);
  const refreshToken =
    localStorage.getItem(REFRESH_TOKEN_KEY) ||
    localStorage.getItem(LEGACY_REFRESH_TOKEN_KEY);
  return { accessToken, idToken, refreshToken };
}

function hasAnyToken() {
  const tokens = getStoredTokens();
  return !!(tokens?.accessToken || tokens?.idToken);
}

function persistSession(result: LoginResult) {
  setStoredUser(result.user);
  storeTokens(result.tokens);
}

function setStoredUser(user: User) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
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
  const teamId = user?.teamId ?? "";

  useEffect(() => {
    const hydrate = async () => {
      if (!hasAnyToken()) {
        localStorage.removeItem(STORAGE_KEY);
        setUser(null);
        setIsLoading(false);
        return;
      }

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
        setStoredUser(fresh);
      } catch {
        localStorage.removeItem(STORAGE_KEY);
        clearTokens();
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
      persistSession(result);
      setUser(result.user);
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
      await api.createUser({
        name,
        email,
        password,
        role: mapUiRoleToApi(role),
      });

      const result = await api.login(email, password);
      persistSession(result);
      setUser(result.user);
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
      setStoredUser(next);
    }
  };

  const refreshUser = async () => {
    if (!user) return;
    const next = await api.getUser(user.id);
    setUser(next);
    setStoredUser(next);
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

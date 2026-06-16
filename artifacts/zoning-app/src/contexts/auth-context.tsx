import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";

export type UserRole = "administrator" | "planning_officer" | "validator" | "encoder" | "viewer";

export interface AuthUser {
  id: number;
  name: string;
  email: string;
  role: UserRole;
  isActive: boolean;
}

interface AuthContextValue {
  user: AuthUser | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  canEdit: boolean;
  allowedPaths: string[] | "all";
}

const AuthContext = createContext<AuthContextValue | null>(null);

// Paths each role may visit. "all" means no restriction.
const ROLE_PATHS: Record<UserRole, string[] | "all"> = {
  administrator: "all",
  planning_officer: "all",
  validator: "all",
  encoder: ["/dashboard", "/map", "/zoning-records"],
  viewer: ["/dashboard", "/map", "/zoning-records", "/reports"],
};

const CAN_EDIT: Record<UserRole, boolean> = {
  administrator: true,
  planning_officer: true,
  validator: true,
  encoder: true,
  viewer: false,
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchMe = useCallback(async () => {
    try {
      const res = await fetch("/api/auth/me", { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        setUser(data as AuthUser);
      } else {
        setUser(null);
      }
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMe();
  }, [fetchMe]);

  const login = useCallback(async (email: string, password: string) => {
    const res = await fetch("/api/auth/login", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error((data as { error?: string }).error ?? "Login failed.");
    }
    const data = await res.json();
    setUser(data as AuthUser);
  }, []);

  const logout = useCallback(async () => {
    await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
    setUser(null);
  }, []);

  const role = user?.role ?? "viewer";
  const allowedPaths = ROLE_PATHS[role] ?? ROLE_PATHS.viewer;
  const canEdit = CAN_EDIT[role] ?? false;

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, canEdit, allowedPaths }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}

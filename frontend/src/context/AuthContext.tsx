import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { getMe, loginUser, logoutUser, setAuthToken } from "@/api/api";

export type Role = "admin" | "analyst" | "viewer";

interface UserInfo {
  id: number;
  username: string;
  role: Role;
}

interface AuthContextValue {
  user: UserInfo | null;
  token: string | null;
  loading: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserInfo | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const stored = localStorage.getItem("auth_token");
    if (!stored) {
      setLoading(false);
      return;
    }
    setAuthToken(stored);
    setToken(stored);
    getMe()
      .then((info) => setUser(info))
      .catch(() => {
        localStorage.removeItem("auth_token");
        setAuthToken(null);
        setToken(null);
        setUser(null);
      })
      .finally(() => setLoading(false));
  }, []);

  const login = async (username: string, password: string) => {
    const res = await loginUser(username, password);
    localStorage.setItem("auth_token", res.token);
    setAuthToken(res.token);
    setToken(res.token);
    setUser({ id: res.id ?? 0, username: res.username, role: res.role });
  };

  const logout = async () => {
    try {
      await logoutUser();
    } finally {
      localStorage.removeItem("auth_token");
      setAuthToken(null);
      setToken(null);
      setUser(null);
    }
  };

  const value = useMemo(() => ({ user, token, loading, login, logout }), [user, token, loading]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

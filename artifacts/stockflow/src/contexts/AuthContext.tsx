import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react";

export type UserRole = "admin" | "seller" | "client";

export type AuthUser = {
  id:        number;
  email:     string;
  name:      string;
  role:      UserRole;
  active:    boolean;
  createdAt: string;
};

type AuthCtx = {
  user:     AuthUser | null;
  token:    string | null;
  loading:  boolean;
  login:    (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name: string) => Promise<void>;
  logout:   () => void;
  refresh:  () => Promise<void>;
};

const Ctx = createContext<AuthCtx | null>(null);

const TOKEN_KEY = "sf_token";

async function apiFetch<T>(path: string, options?: RequestInit, token?: string | null): Promise<T> {
  const res = await fetch(`/api${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options?.headers,
    },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? "Erreur serveur");
  return data as T;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user,    setUser]    = useState<AuthUser | null>(null);
  const [token,   setToken]   = useState<string | null>(() => localStorage.getItem(TOKEN_KEY));
  const [loading, setLoading] = useState(true);

  const saveToken = (t: string) => {
    localStorage.setItem(TOKEN_KEY, t);
    setToken(t);
  };

  const refresh = useCallback(async () => {
    const t = localStorage.getItem(TOKEN_KEY);
    if (!t) { setLoading(false); return; }
    try {
      const me = await apiFetch<AuthUser>("/auth/me", undefined, t);
      setUser(me);
      setToken(t);
    } catch {
      localStorage.removeItem(TOKEN_KEY);
      setToken(null);
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const login = async (email: string, password: string) => {
    const { token: t, user: u } = await apiFetch<{ token: string; user: AuthUser }>(
      "/auth/login", { method: "POST", body: JSON.stringify({ email, password }) }
    );
    saveToken(t);
    setUser(u);
  };

  const register = async (email: string, password: string, name: string) => {
    const { token: t, user: u } = await apiFetch<{ token: string; user: AuthUser }>(
      "/auth/register", { method: "POST", body: JSON.stringify({ email, password, name }) }
    );
    saveToken(t);
    setUser(u);
  };

  const logout = () => {
    localStorage.removeItem(TOKEN_KEY);
    setToken(null);
    setUser(null);
  };

  return (
    <Ctx.Provider value={{ user, token, loading, login, register, logout, refresh }}>
      {children}
    </Ctx.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}

// Helper : appel API authentifié
export function useAuthFetch() {
  const { token } = useAuth();
  return useCallback(
    <T,>(path: string, options?: RequestInit) => apiFetch<T>(path, options, token),
    [token],
  );
}

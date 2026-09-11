import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { User } from "../types";
import { mockAuth } from "../services/mockData";

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  error: string | null;
  login: (username: string) => Promise<void>;
  signup: (displayName: string, username: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setUser(mockAuth.getSession());
  }, []);

  async function login(username: string) {
    setLoading(true);
    setError(null);
    try {
      const u = await mockAuth.login(username);
      setUser(u);
    } catch (e: any) {
      setError(e.message || "Couldn't log in.");
    } finally {
      setLoading(false);
    }
  }

  async function signup(displayName: string, username: string) {
    setLoading(true);
    setError(null);
    try {
      const u = await mockAuth.signup(displayName, username);
      setUser(u);
    } catch (e: any) {
      setError(e.message || "Couldn't create your account.");
    } finally {
      setLoading(false);
    }
  }

  function logout() {
    mockAuth.logout();
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, loading, error, login, signup, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

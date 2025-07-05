import React, { createContext, useContext, useEffect, useState } from "react";
import { apiFetch } from "../api";

export type UserRole = "user" | "seller";
export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role?: UserRole;
  storeName?: string;
}

interface AuthContextType {
  user: AuthUser | null;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => void;
  register: (data: { name: string; email: string; password: string }) => Promise<boolean>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(null);

  useEffect(() => {
    const token = localStorage.getItem("jwt");
    if (token) {
      apiFetch<AuthUser>("/store/customers/me", {}, true)
        .then(setUser)
        .catch(() => setUser(null));
    }
  }, []);

  const login = async (email: string, password: string) => {
    try {
      const res = await apiFetch<{ access_token: string }>(
        "/store/customers/auth",
        {
          method: "POST",
          body: JSON.stringify({ email, password }),
        }
      );
      localStorage.setItem("jwt", res.access_token);
      const me = await apiFetch<AuthUser>("/store/customers/me", {}, true);
      setUser(me);
      return true;
    } catch (e) {
      setUser(null);
      localStorage.removeItem("jwt");
      return false;
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem("jwt");
  };

  const register = async (data: { name: string; email: string; password: string }) => {
    try {
      await apiFetch(
        "/store/customers",
        {
          method: "POST",
          body: JSON.stringify({
            first_name: data.name,
            email: data.email,
            password: data.password,
          }),
        }
      );
      // 회원가입 성공 시 자동 로그인
      return await login(data.email, data.password);
    } catch (e) {
      return false;
    }
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, register }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
}; 
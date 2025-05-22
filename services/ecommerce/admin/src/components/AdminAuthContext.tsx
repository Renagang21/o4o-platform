import React, { createContext, useContext, useState, useEffect } from "react";

interface AdminAuthContextType {
  admin: boolean;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => void;
}

const AdminAuthContext = createContext<AdminAuthContextType | undefined>(undefined);

const ADMIN_EMAIL = "admin@example.com";
const ADMIN_PASSWORD = "adm!n1234";
const ADMIN_JWT = "dummy-admin-token";

export const AdminAuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [admin, setAdmin] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("admin_jwt");
    setAdmin(!!token);
  }, []);

  const login = async (email: string, password: string) => {
    if (email === ADMIN_EMAIL && password === ADMIN_PASSWORD) {
      localStorage.setItem("admin_jwt", ADMIN_JWT);
      setAdmin(true);
      return true;
    }
    setAdmin(false);
    localStorage.removeItem("admin_jwt");
    return false;
  };

  const logout = () => {
    setAdmin(false);
    localStorage.removeItem("admin_jwt");
  };

  return (
    <AdminAuthContext.Provider value={{ admin, login, logout }}>
      {children}
    </AdminAuthContext.Provider>
  );
};

export const useAdminAuth = () => {
  const ctx = useContext(AdminAuthContext);
  if (!ctx) throw new Error("useAdminAuth must be used within an AdminAuthProvider");
  return ctx;
}; 
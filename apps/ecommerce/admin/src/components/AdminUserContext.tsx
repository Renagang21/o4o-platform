import React, { createContext, useContext, useEffect, useState } from "react";

export type AdminRole = "superadmin" | "manager" | "viewer";
export interface AdminUser {
  id: string;
  email: string;
  name: string;
  password: string;
  role: AdminRole;
  createdAt: string;
}

interface AdminUserContextType {
  users: AdminUser[];
  addUser: (user: Omit<AdminUser, "id" | "createdAt">) => void;
  updateUser: (id: string, user: Partial<Omit<AdminUser, "id" | "createdAt">>) => void;
  getUser: (id: string) => AdminUser | undefined;
}

const AdminUserContext = createContext<AdminUserContextType | undefined>(undefined);

export const AdminUserProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [users, setUsers] = useState<AdminUser[]>([]);

  useEffect(() => {
    const stored = localStorage.getItem("admin_users");
    if (stored) setUsers(JSON.parse(stored));
  }, []);

  useEffect(() => {
    localStorage.setItem("admin_users", JSON.stringify(users));
  }, [users]);

  const addUser = (user: Omit<AdminUser, "id" | "createdAt">) => {
    setUsers(prev => [
      {
        ...user,
        id: Math.random().toString(36).slice(2),
        createdAt: new Date().toISOString(),
      },
      ...prev,
    ]);
  };

  const updateUser = (id: string, user: Partial<Omit<AdminUser, "id" | "createdAt">>) => {
    setUsers(prev => prev.map(u => u.id === id ? { ...u, ...user } : u));
  };

  const getUser = (id: string) => users.find(u => u.id === id);

  return (
    <AdminUserContext.Provider value={{ users, addUser, updateUser, getUser }}>
      {children}
    </AdminUserContext.Provider>
  );
};

export const useAdminUsers = () => {
  const ctx = useContext(AdminUserContext);
  if (!ctx) throw new Error("useAdminUsers must be used within an AdminUserProvider");
  return ctx;
}; 
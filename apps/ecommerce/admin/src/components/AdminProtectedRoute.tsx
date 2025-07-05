import React from "react";
import { useAdminAuth } from "./AdminAuthContext";
import { Navigate } from "react-router-dom";

export default function AdminProtectedRoute({ children }: { children: React.ReactNode }) {
  const { admin } = useAdminAuth();
  if (!admin) return <Navigate to="/admin/login" replace />;
  return <>{children}</>;
} 
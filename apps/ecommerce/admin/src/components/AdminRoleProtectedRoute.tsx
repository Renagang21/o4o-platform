import React from "react";
import { Navigate } from "react-router-dom";
import { useAdminUsers } from "./AdminUserContext";
import { useAdminAuth } from "./AdminAuthContext";
import ForbiddenPage from "./ForbiddenPage";

// 역할 우선순위 정의
const ROLE_PRIORITY = { superadmin: 3, manager: 2, viewer: 1 } as const;

type AdminRole = keyof typeof ROLE_PRIORITY;

function getCurrentAdminRole(): AdminRole | null {
  // 현재 로그인한 관리자 이메일을 localStorage에서 추출 (admin_jwt와 연동 필요)
  const adminEmail = localStorage.getItem("admin_email");
  if (!adminEmail) return null;
  const usersRaw = localStorage.getItem("admin_users");
  if (!usersRaw) return null;
  const users = JSON.parse(usersRaw);
  const admin = users.find((u: any) => u.email === adminEmail);
  return admin?.role || null;
}

export default function AdminRoleProtectedRoute({ role, children }: { role: AdminRole; children: React.ReactNode }) {
  const { admin } = useAdminAuth();
  const currentRole = getCurrentAdminRole();
  if (!admin || !currentRole) return <Navigate to="/admin/login" replace />;
  if (ROLE_PRIORITY[currentRole] < ROLE_PRIORITY[role]) {
    return <ForbiddenPage />;
  }
  return <>{children}</>;
} 
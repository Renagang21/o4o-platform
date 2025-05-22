import React, { useEffect } from 'react';
import { useAdminAuthStore } from '../store/adminAuthStore';
import { Navigate } from 'react-router-dom';

const AdminProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAdminAuthenticated, checkAuth } = useAdminAuthStore();

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  if (!isAdminAuthenticated) {
    return <Navigate to="/admin/login" replace />;
  }
  return <>{children}</>;
};

export const AdminRoleProtectedRoute: React.FC<{ roles: ('superadmin' | 'manager' | 'editor' | 'viewer')[], children: React.ReactNode }> = ({ roles, children }) => {
  const { admin, isAdminAuthenticated, checkAuth } = useAdminAuthStore();
  useEffect(() => { checkAuth(); }, [checkAuth]);
  if (!isAdminAuthenticated) return <Navigate to="/admin/login" replace />;
  if (!admin || !roles.includes(admin.role)) return <div className="p-8 text-center text-red-600 font-bold">권한이 없습니다. (403)</div>;
  return <>{children}</>;
};

export default AdminProtectedRoute; 
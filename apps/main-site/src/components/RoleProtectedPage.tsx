import React from 'react';
import { useAuth, UserRole } from '../context/AuthContext';
import { Navigate, useLocation } from 'react-router-dom';
import toast from 'react-hot-toast';
import { logAccess } from '../utils/logAccess';

export default function RoleProtectedPage({
  allowedRoles,
  children,
  message = '이 페이지는 권한이 없습니다. 홈으로 이동합니다.',
  show403 = true,
}: {
  allowedRoles?: UserRole[];
  children: React.ReactNode;
  message?: string;
  show403?: boolean;
}) {
  const { user } = useAuth();
  const location = useLocation();

  // 전체 공개: allowedRoles가 없거나 빈 배열
  if (!allowedRoles || allowedRoles.length === 0) {
    return <>{children}</>;
  }

  // 관리자 우선 접근 허용
  if (user && user.roles.includes('administrator')) {
    return <>{children}</>;
  }

  // 권한 체크
  if (!user || !allowedRoles.some(role => user.roles.includes(role))) {
    toast.error(message);
    if (show403) {
      return <Navigate to="/403" state={{ from: location }} replace />;
    }
    return <Navigate to="/" state={{ from: location }} replace />;
  }

  // 접근 기록 로그
  React.useEffect(() => {
    if (user) logAccess(user.id, location.pathname);
     
  }, [user, location.pathname]);

  return <>{children}</>;
} 
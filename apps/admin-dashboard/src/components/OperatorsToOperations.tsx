import type { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@o4o/auth-context';

/**
 * 관리자 사이트(admin.neture.co.kr)는 전체 관리자와 운영자만 쓴다(2026-11-10 사용자 확정).
 * 전체 관리자 화면(/admin 등)에 전체 관리자가 아닌 로그인 사용자가 오면 업무 운영 화면으로 보낸다.
 * 업무 운영 화면은 서버의 업무 위임을 확인하고, 위임이 없는 일반 회원은 로그아웃시킨다.
 * 로그인 전 · 확인 중에는 기존 AdminProtectedRoute 가 로그인 화면 이동을 맡는다.
 */
export default function OperatorsToOperations({ children }: Readonly<{ children: ReactNode }>) {
  const { isAuthenticated, isLoading, user } = useAuth();
  if (!isLoading && isAuthenticated && user && user.roles?.includes('platform:super_admin') !== true)
    return <Navigate to="/operations" replace />;
  return <>{children}</>;
}

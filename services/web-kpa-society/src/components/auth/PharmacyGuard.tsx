/**
 * PharmacyGuard — 약국 경영지원 접근 제어
 *
 * WO-KPA-A-PHARMACY-ROUTE-GUARD-HARDENING-V1
 * WO-PHARMACY-GUARD-HARDENING-V1: /pharmacy/approval 포함 전체 보호
 * /pharmacy/* 라우트 전체 보호
 *
 * 정책:
 * - 미인증 → /login
 * - admin/operator → /operator (관리자 전용 인터페이스)
 * - pharmacy_owner 아닌 약사 → /dashboard
 * - pharmacy_owner → 통과
 */

import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { hasAnyRole, PLATFORM_ROLES } from '../../lib/role-constants';

interface PharmacyGuardProps {
  children: React.ReactNode;
}

export function PharmacyGuard({ children }: PharmacyGuardProps) {
  const { user, isAuthenticated, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
        <p style={{ color: '#64748B' }}>권한을 확인하는 중...</p>
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return <Navigate to="/login" state={{ from: location.pathname + location.search }} replace />;
  }

  // admin/operator는 Operator 대시보드로 리다이렉트
  if (hasAnyRole(user.roles, PLATFORM_ROLES)) {
    return <Navigate to="/operator" replace />;
  }

  // pharmacy_owner만 접근 허용
  if (user.pharmacistRole !== 'pharmacy_owner') {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
}

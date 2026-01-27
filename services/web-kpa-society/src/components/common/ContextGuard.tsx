/**
 * ContextGuard - 라우트 보호 컴포넌트 (컨텍스트 기반)
 * WO-CONTEXT-SWITCH-FOUNDATION-V1
 *
 * 특정 컨텍스트 유형이 필요한 라우트를 감싸서 보호한다.
 * - 미로그인 → /demo/login 리다이렉트
 * - 컨텍스트 미설정 → fallbackPath 리다이렉트
 * - 컨텍스트 유형 불일치 → fallbackPath 리다이렉트
 */

import { Navigate } from 'react-router-dom';
import { useAuth } from '../../contexts';
import { useOrganization } from '../../contexts';
import type { ContextType } from '../../types/organization';

interface ContextGuardProps {
  /** 필요한 컨텍스트 유형. 배열이면 any match 허용 */
  requiredType: ContextType | ContextType[];
  /** 가드 실패 시 리다이렉트 경로 (default: '/') */
  fallbackPath?: string;
  children: React.ReactNode;
}

export function ContextGuard({
  requiredType,
  fallbackPath = '/',
  children,
}: ContextGuardProps) {
  const { user } = useAuth();
  const { activeContext, isContextSet } = useOrganization();

  // 미로그인
  if (!user) {
    return <Navigate to="/demo/login" replace />;
  }

  // 컨텍스트 미설정
  if (!isContextSet || !activeContext) {
    return <Navigate to={fallbackPath} replace />;
  }

  // 컨텍스트 유형 확인
  const requiredTypes = Array.isArray(requiredType) ? requiredType : [requiredType];
  if (!requiredTypes.includes(activeContext.contextType)) {
    return <Navigate to={fallbackPath} replace />;
  }

  return <>{children}</>;
}

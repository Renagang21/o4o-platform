/**
 * OperatorRoutes - 서비스 운영자 라우트 설정
 *
 * WO-KPA-A-HUB-ARCHITECTURE-RESTRUCTURE-V1:
 * - OperatorLayout 제거 (중복 네비게이션 제거)
 * - /operator 루트 → /hub 리다이렉트
 * - 서브 페이지는 main Layout에서 렌더 (App.tsx에서 Layout 래핑)
 */

import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { OperatorAiReportPage, ForumManagementPage, LegalManagementPage, OperatorManagementPage, ForumAnalyticsDashboard, MemberManagementPage, ContentManagementPage, AuditLogPage } from '../pages/operator';
import ContentHubPage from '../pages/signage/ContentHubPage';
import { useAuth } from '../contexts';
import type { User } from '../contexts/AuthContext';
import { LoadingSpinner } from '../components/common';
import { colors } from '../styles/theme';

/**
 * KPA-a 운영자 역할 확인
 *
 * WO-OPERATOR-GUARD-UNIFICATION-P0:
 * Backend isKpaOperator()와 동일한 역할 목록 (kpa.routes.ts 참조)
 */
function checkKpaOperatorRole(user: User): boolean {
  const allowedRoles = [
    'kpa:admin',
    'kpa:operator',
  ];

  if (user.role && allowedRoles.includes(user.role)) {
    return true;
  }

  if (user.roles && user.roles.some(r => allowedRoles.includes(r))) {
    return true;
  }

  return false;
}

export function OperatorRoutes() {
  const navigate = useNavigate();
  const { user, isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return <LoadingSpinner message="권한을 확인하는 중..." />;
  }

  if (!isAuthenticated || !user) {
    return (
      <div style={guardStyles.container}>
        <div style={guardStyles.card}>
          <div style={guardStyles.icon}>🔒</div>
          <h2 style={guardStyles.title}>로그인이 필요합니다</h2>
          <p style={guardStyles.message}>운영자 페이지에 접근하려면 로그인이 필요합니다.</p>
          <button
            style={guardStyles.loginButton}
            onClick={() => navigate('/login', { state: { from: window.location.pathname } })}
          >
            로그인하기
          </button>
        </div>
      </div>
    );
  }

  if (!checkKpaOperatorRole(user)) {
    return (
      <div style={guardStyles.container}>
        <div style={guardStyles.card}>
          <div style={guardStyles.icon}>🚫</div>
          <h2 style={guardStyles.title}>접근 권한이 없습니다</h2>
          <p style={guardStyles.message}>운영자 권한이 필요합니다.</p>
          <button
            style={guardStyles.backButton}
            onClick={() => navigate('/')}
          >
            메인으로 돌아가기
          </button>
        </div>
      </div>
    );
  }

  return (
    <Routes>
      {/* /operator → /hub 리다이렉트 (WO-KPA-A-HUB-ARCHITECTURE-RESTRUCTURE-V1) */}
      <Route index element={<Navigate to="/hub" replace />} />

      {/* AI 리포트 */}
      <Route path="ai-report" element={<OperatorAiReportPage />} />

      {/* 포럼 관리 */}
      <Route path="forum-management" element={<ForumManagementPage />} />

      {/* 포럼 통계 */}
      <Route path="forum-analytics" element={<ForumAnalyticsDashboard />} />

      {/* 회원 관리 (WO-KPA-A-MEMBER-APPROVAL-UI-PHASE1-V1) */}
      <Route path="members" element={<MemberManagementPage />} />

      {/* 콘텐츠 관리 (WO-KPA-A-CONTENT-CMS-PHASE1-V1) */}
      <Route path="content" element={<ContentManagementPage />} />

      {/* 사이니지 콘텐츠 허브 */}
      <Route path="signage/content" element={<ContentHubPage />} />

      {/* 약관 관리 (WO-KPA-LEGAL-PAGES-V1) */}
      <Route path="legal" element={<LegalManagementPage />} />

      {/* 감사 로그 (WO-KPA-A-OPERATOR-AUDIT-LOG-PHASE1-V1) */}
      <Route path="audit-logs" element={<AuditLogPage />} />

      {/* 운영자 관리 - WO-KPA-A-ADMIN-OPERATOR-REALIGNMENT-V1: Admin only */}
      <Route path="operators" element={
        (user?.roles || []).includes('kpa:admin')
          ? <OperatorManagementPage />
          : <Navigate to="/hub" replace />
      } />

      {/* 404 → /hub */}
      <Route path="*" element={<Navigate to="/hub" replace />} />
    </Routes>
  );
}

const guardStyles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '100vh',
    backgroundColor: colors.neutral100,
    padding: '20px',
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: '16px',
    padding: '48px',
    textAlign: 'center',
    maxWidth: '400px',
    boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
  },
  icon: {
    fontSize: '48px',
    marginBottom: '20px',
  },
  title: {
    fontSize: '20px',
    fontWeight: 600,
    color: colors.neutral900,
    marginBottom: '12px',
  },
  message: {
    fontSize: '14px',
    color: colors.neutral600,
    marginBottom: '24px',
    lineHeight: 1.6,
  },
  loginButton: {
    padding: '12px 24px',
    backgroundColor: colors.primary,
    color: '#ffffff',
    border: 'none',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: 500,
    cursor: 'pointer',
  },
  backButton: {
    padding: '12px 24px',
    backgroundColor: colors.neutral200,
    color: colors.neutral700,
    border: 'none',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: 500,
    cursor: 'pointer',
  },
};

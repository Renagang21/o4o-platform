/**
 * OperatorRoutes - 서비스 운영자 라우트 설정
 * WO-AI-SERVICE-OPERATOR-REPORT-V1: 운영자 AI 리포트 추가
 * WO-SIGNAGE-CONTENT-HUB-V1-A: 사이니지 콘텐츠 허브 추가
 * WO-KPA-A-OPERATOR-DASHBOARD-UX-V1: Signal 기반 대시보드 도입
 * WO-OPERATOR-GUARD-UNIFICATION-P0: 운영자 접근 권한 가드 추가
 * WO-KPA-A-OPERATOR-SECURITY-ALIGNMENT-PHASE1: 보안 정렬
 */

import { Routes, Route, Navigate, useNavigate, Link } from 'react-router-dom';
import { KpaOperatorDashboard, OperatorAiReportPage, ForumManagementPage, LegalManagementPage, OperatorManagementPage, ForumAnalyticsDashboard, MemberManagementPage, ContentManagementPage, AuditLogPage } from '../pages/operator';
import ContentHubPage from '../pages/signage/ContentHubPage';
import { useAuth } from '../contexts';
import type { User } from '../contexts/AuthContext';
import { LoadingSpinner } from '../components/common';
import { colors } from '../styles/theme';

// 간단한 Operator Layout
function OperatorLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link to="/" className="text-xl font-bold text-blue-600">
              KPA Society
            </Link>
            <span className="text-slate-300">|</span>
            <span className="text-slate-600 font-medium">운영자</span>
          </div>
          <nav className="flex items-center gap-6">
            <Link to="/operator" className="text-sm text-slate-600 hover:text-blue-600">
              대시보드
            </Link>
            <Link to="/operator/ai-report" className="text-sm text-slate-600 hover:text-blue-600">
              AI 리포트
            </Link>
            <Link to="/operator/forum-management" className="text-sm text-slate-600 hover:text-blue-600">
              포럼 관리
            </Link>
            <Link to="/operator/forum-analytics" className="text-sm text-slate-600 hover:text-blue-600">
              포럼 통계
            </Link>
            <Link to="/operator/members" className="text-sm text-slate-600 hover:text-blue-600">
              회원 관리
            </Link>
            <Link to="/operator/content" className="text-sm text-slate-600 hover:text-blue-600">
              콘텐츠 관리
            </Link>
            <Link to="/operator/signage/content" className="text-sm text-slate-600 hover:text-blue-600">
              콘텐츠 허브
            </Link>
            <Link to="/operator/legal" className="text-sm text-slate-600 hover:text-blue-600">
              약관 관리
            </Link>
            <Link to="/operator/audit-logs" className="text-sm text-slate-600 hover:text-blue-600">
              감사 로그
            </Link>
            <Link to="/operator/operators" className="text-sm text-slate-600 hover:text-blue-600">
              운영자 관리
            </Link>
            <Link to="/" className="text-sm text-slate-500 hover:text-slate-700">
              메인으로
            </Link>
          </nav>
        </div>
      </header>

      {/* Content */}
      <main className="pb-20">
        {children}
      </main>
    </div>
  );
}

/**
 * KPA-a 운영자 역할 확인
 *
 * WO-OPERATOR-GUARD-UNIFICATION-P0:
 * Backend isKpaOperator()와 동일한 역할 목록 (kpa.routes.ts 참조)
 */
function checkKpaOperatorRole(user: User): boolean {
  // KPA-specific prefixed roles ONLY (matches backend requireKpaScope + isKpaOperator)
  // platform:* roles are explicitly denied by backend — do not allow in frontend
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
    <OperatorLayout>
      <Routes>
        {/* 기본 경로 → Signal 기반 대시보드 (WO-KPA-A-OPERATOR-DASHBOARD-UX-V1) */}
        <Route index element={<KpaOperatorDashboard />} />

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
            : <Navigate to="" replace />
        } />

        {/* 404 */}
        <Route path="*" element={<Navigate to="" replace />} />
      </Routes>
    </OperatorLayout>
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

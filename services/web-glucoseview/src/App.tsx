import { BrowserRouter, Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { LoginModalProvider } from './contexts/LoginModalContext';
import Layout from './components/Layout';
import LoginModal from './components/LoginModal';
import HomePage from './pages/HomePage';
import PatientsPage from './pages/PatientsPage';
import InsightsPage from './pages/InsightsPage';
import SettingsPage from './pages/SettingsPage';
import AboutPage from './pages/AboutPage';
import RegisterPage from './pages/RegisterPage';
import PendingPage from './pages/PendingPage';
import AdminPage from './pages/AdminPage';
import MyPage from './pages/MyPage';
import DashboardPage from './pages/DashboardPage';
import CareDashboardPage from './pages/CareDashboardPage';
import ApplyPage from './pages/apply/ApplyPage';
import MyApplicationsPage from './pages/apply/MyApplicationsPage';
import OperatorApplicationsPage from './pages/operator/ApplicationsPage';
import OperatorApplicationDetailPage from './pages/operator/ApplicationDetailPage';
import OperatorAiReportPage from './pages/operator/AiReportPage';
import { TestGuidePage, PharmacistManualPage, AdminManualPage } from './pages/test-guide';
import TestCenterPage from './pages/TestCenterPage';

// Partner Dashboard
import PartnerLayout from './components/layouts/PartnerLayout';
import PartnerIndex from './pages/partner/index';
import PartnerOverviewPage from './pages/partner/OverviewPage';
import PartnerTargetsPage from './pages/partner/TargetsPage';
import PartnerContentPage from './pages/partner/ContentPage';
import PartnerEventsPage from './pages/partner/EventsPage';
import PartnerStatusPage from './pages/partner/StatusPage';

// Partner Application (WO-PARTNER-APPLICATION-V1)
import PartnerApplyPage from './pages/partners/ApplyPage';

// Operator Layout
import OperatorLayout from './components/layouts/OperatorLayout';

// Store Dashboard (WO-O4O-STORE-DASHBOARD-ARCHITECTURE-UNIFICATION-V1)
import { StoreDashboardLayout, StorePlaceholderPage, GLUCOSEVIEW_STORE_CONFIG } from '@o4o/operator-core';
import StoreOverviewPage from './pages/store/StoreOverviewPage';

import './index.css';

// 인증이 필요한 라우트를 보호하는 컴포넌트
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isPending, isRejected } = useAuth();
  const location = useLocation();

  if (!isAuthenticated) {
    return <Navigate to="/" state={{ from: location.pathname + location.search, requireLogin: true }} replace />;
  }

  // 승인 대기 중이거나 거절된 경우 pending 페이지로 이동
  if (isPending || isRejected) {
    return <Navigate to="/pending" replace />;
  }

  return <>{children}</>;
}

// 승인 대기/거절 사용자용 라우트
function PendingRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isPending, isRejected } = useAuth();

  if (!isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  if (!isPending && !isRejected) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}

// 역할 기반 보호 라우트
function RoleProtectedRoute({ children, allowedRoles }: { children: React.ReactNode; allowedRoles: string[] }) {
  const { isAuthenticated, user, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/" state={{ from: location.pathname + location.search, requireLogin: true }} replace />;
  }

  if (user && !allowedRoles.includes(user.role)) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}

/** Store Dashboard Layout Wrapper - connects auth context to shared layout */
function StoreLayoutWrapper() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  return (
    <StoreDashboardLayout
      config={GLUCOSEVIEW_STORE_CONFIG}
      userName={user?.displayName || user?.name || ''}
      homeLink="/"
      onLogout={() => { logout(); navigate('/'); }}
    />
  );
}

function AppRoutes() {
  const { isAuthenticated } = useAuth();

  return (
    <Routes>
      {/* 공개 페이지 */}
      <Route path="/register" element={
        isAuthenticated ? <Navigate to="/" replace /> : <RegisterPage />
      } />

      {/* 승인 대기 페이지 */}
      <Route path="/pending" element={
        <PendingRoute>
          <PendingPage />
        </PendingRoute>
      } />

      {/* 관리자 페이지 */}
      <Route path="/admin" element={<AdminPage />} />

      {/* 서비스 신청 페이지 (Phase C-4) */}
      <Route path="/apply" element={<ApplyPage />} />
      <Route path="/apply/my-applications" element={<MyApplicationsPage />} />

      {/* 대시보드 (Phase C-4) */}
      <Route path="/dashboard" element={
        <ProtectedRoute>
          <DashboardPage />
        </ProtectedRoute>
      } />

      {/* 운영자 페이지 (Phase C-4) */}
      <Route path="/operator/glucoseview" element={<OperatorLayout />}>
        <Route path="applications" element={<OperatorApplicationsPage />} />
        <Route path="applications/:id" element={<OperatorApplicationDetailPage />} />
        {/* AI Report (WO-AI-SERVICE-OPERATOR-REPORT-V1) */}
        <Route path="ai-report" element={<OperatorAiReportPage />} />
      </Route>

      {/* Test Center (WO-TEST-CENTER-SEPARATION-V1) */}
      <Route path="/test-center" element={<TestCenterPage />} />

      {/* Test Guide */}
      <Route path="/test-guide" element={<TestGuidePage />} />
      <Route path="/test-guide/manual/pharmacist" element={<PharmacistManualPage />} />
      <Route path="/test-guide/manual/admin" element={<AdminManualPage />} />

      {/* Partner Application (WO-PARTNER-APPLICATION-V1) */}
      <Route path="/partners/apply" element={<PartnerApplyPage />} />

      {/* Partner Dashboard */}
      <Route
        path="/partner"
        element={
          <RoleProtectedRoute allowedRoles={['partner']}>
            <PartnerLayout />
          </RoleProtectedRoute>
        }
      >
        <Route index element={<PartnerIndex />} />
        <Route path="overview" element={<PartnerOverviewPage />} />
        <Route path="targets" element={<PartnerTargetsPage />} />
        <Route path="content" element={<PartnerContentPage />} />
        <Route path="events" element={<PartnerEventsPage />} />
        <Route path="status" element={<PartnerStatusPage />} />
      </Route>

      {/* Store Owner Dashboard (WO-O4O-STORE-DASHBOARD-ARCHITECTURE-UNIFICATION-V1) */}
      <Route
        path="/store"
        element={
          <ProtectedRoute>
            <StoreLayoutWrapper />
          </ProtectedRoute>
        }
      >
        <Route index element={<StoreOverviewPage />} />
        <Route path="services" element={<StorePlaceholderPage title="서비스 관리" />} />
        <Route path="settings" element={<StorePlaceholderPage title="설정" />} />
      </Route>

      {/* 메인 레이아웃 (홈은 공개, 나머지는 보호) */}
      <Route path="/" element={<Layout />}>
        <Route index element={<HomePage />} />
        <Route path="patients" element={
          <ProtectedRoute>
            <PatientsPage />
          </ProtectedRoute>
        } />
        <Route path="insights" element={
          <ProtectedRoute>
            <InsightsPage />
          </ProtectedRoute>
        } />
        <Route path="care/dashboard" element={
          <ProtectedRoute>
            <CareDashboardPage />
          </ProtectedRoute>
        } />
        <Route path="settings" element={
          <ProtectedRoute>
            <SettingsPage />
          </ProtectedRoute>
        } />
        <Route path="mypage" element={
          <ProtectedRoute>
            <MyPage />
          </ProtectedRoute>
        } />
        <Route path="about" element={<AboutPage />} />
      </Route>
    </Routes>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <LoginModalProvider>
          <LoginModal />
          <AppRoutes />
        </LoginModalProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;

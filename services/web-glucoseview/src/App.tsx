import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Layout from './components/Layout';
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
import ApplyPage from './pages/apply/ApplyPage';
import MyApplicationsPage from './pages/apply/MyApplicationsPage';
import OperatorApplicationsPage from './pages/operator/ApplicationsPage';
import OperatorApplicationDetailPage from './pages/operator/ApplicationDetailPage';
import { TestGuidePage, PharmacistManualPage, AdminManualPage } from './pages/test-guide';

// Partner Dashboard
import PartnerLayout from './components/layouts/PartnerLayout';
import PartnerIndex from './pages/partner/index';
import PartnerOverviewPage from './pages/partner/OverviewPage';
import PartnerTargetsPage from './pages/partner/TargetsPage';
import PartnerContentPage from './pages/partner/ContentPage';
import PartnerEventsPage from './pages/partner/EventsPage';
import PartnerStatusPage from './pages/partner/StatusPage';

import './index.css';

// 인증이 필요한 라우트를 보호하는 컴포넌트
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isPending, isRejected } = useAuth();

  if (!isAuthenticated) {
    return <Navigate to="/" replace />;
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

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  if (user && !allowedRoles.includes(user.role)) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
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
      <Route path="/operator/glucoseview/applications" element={<OperatorApplicationsPage />} />
      <Route path="/operator/glucoseview/applications/:id" element={<OperatorApplicationDetailPage />} />

      {/* Test Guide */}
      <Route path="/test-guide" element={<TestGuidePage />} />
      <Route path="/test-guide/manual/pharmacist" element={<PharmacistManualPage />} />
      <Route path="/test-guide/manual/admin" element={<AdminManualPage />} />

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
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;

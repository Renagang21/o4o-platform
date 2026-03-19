import { BrowserRouter, Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { LoginModalProvider } from './contexts/LoginModalContext';
import { O4OErrorBoundary, O4OToastProvider } from '@o4o/error-handling';
import Layout from './components/Layout';
import LoginModal from './components/LoginModal';
import PatientsPage from './pages/PatientsPage';
import InsightsPage from './pages/InsightsPage';
import SettingsPage from './pages/SettingsPage';
import AboutPage from './pages/AboutPage';
import RegisterPage from './pages/RegisterPage';
import LoginPage from './pages/LoginPage';
import HandoffPage from './pages/HandoffPage';
import AccountRecoveryPage from './pages/auth/AccountRecoveryPage';
import ResetPasswordPage from './pages/auth/ResetPasswordPage';
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
import OperatorRoleManagementPage from './pages/operator/RoleManagementPage';
import OperatorUsersPage from './pages/operator/UsersPage';
import OperatorUserDetailPage from './pages/operator/UserDetailPage';
import OperatorProductsPage from './pages/operator/ProductsPage';
import OperatorProductDetailPage from './pages/operator/ProductDetailPage';
import OperatorStoresPage from './pages/operator/StoresPage';
import OperatorStoreDetailPage from './pages/operator/StoreDetailPage';
// Operator Layout
import OperatorLayout from './components/layouts/OperatorLayout';
// Operator Dashboard (WO-O4O-OPERATOR-DASHBOARD-DATA-NORMALIZATION-V1)
import GlucoseViewOperatorDashboard from './pages/operator/GlucoseViewOperatorDashboard';
// Patient Layout (WO-GLUCOSEVIEW-PATIENT-MOBILE-UX-V1)
import PatientLayout from './components/layouts/PatientLayout';

// Store Dashboard (WO-O4O-STORE-DASHBOARD-ARCHITECTURE-UNIFICATION-V1)
import { StoreDashboardLayout, StorePlaceholderPage, GLUCOSEVIEW_STORE_CONFIG } from '@o4o/store-ui-core';
import StoreOverviewPage from './pages/store/StoreOverviewPage';

// Patient Pages (WO-GLUCOSEVIEW-PATIENT-MODULE-EXTRACT-V1)
import PatientMainPage from './pages/patient/PatientMainPage';
import PatientLandingPage from './pages/patient/PatientLandingPage';
import PatientProfilePage from './pages/patient/ProfilePage';
import GlucoseInputPage from './pages/patient/GlucoseInputPage';
import DataAnalysisPage from './pages/patient/DataAnalysisPage';
import PharmacistCoachingPage from './pages/patient/PharmacistCoachingPage';
import SelectPharmacyPage from './pages/patient/SelectPharmacyPage';
import PatientAppointmentsPage from './pages/patient/AppointmentsPage';
import CareGuidelinePage from './pages/patient/CareGuidelinePage';

import { RoleGuard, OperatorRoute } from './components/auth/RoleGuard';
import PwaInstallPrompt from './components/common/PwaInstallPrompt';
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

/**
 * RoleProtectedRoute → RoleGuard alias
 * WO-O4O-GUARD-PATTERN-NORMALIZATION-V1: 통일된 인터페이스 사용
 * 실제 로직은 components/auth/RoleGuard.tsx
 */
const RoleProtectedRoute = RoleGuard;

/**
 * HomeRedirect — WO-O4O-GLUCOSEVIEW-BOOTSTRAP-FIX-V1
 * 로그인 당뇨인 → /patient, 그 외 → AboutPage
 */
function HomeRedirect() {
  const { isAuthenticated, user } = useAuth();

  if (isAuthenticated && user?.roles.includes('patient')) {
    return <Navigate to="/patient" replace />;
  }

  return <PatientLandingPage />;
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
      <Route path="/handoff" element={<HandoffPage />} />
      <Route path="/login" element={
        isAuthenticated ? <Navigate to="/" replace /> : <LoginPage />
      } />
      <Route path="/register" element={
        isAuthenticated ? <Navigate to="/" replace /> : <RegisterPage />
      } />
      <Route path="/forgot-password" element={<AccountRecoveryPage />} />
      <Route path="/reset-password" element={<ResetPasswordPage />} />

      {/* 승인 대기 페이지 */}
      <Route path="/pending" element={
        <PendingRoute>
          <PendingPage />
        </PendingRoute>
      } />

      {/* 관리자 페이지 — WO-SECURITY-GLUCOSEVIEW-GUARD-FIX-V1: admin 역할 보호 */}
      <Route path="/admin" element={
        <RoleProtectedRoute allowedRoles={['admin']}>
          <AdminPage />
        </RoleProtectedRoute>
      } />

      {/* 서비스 신청 페이지 (Phase C-4) */}
      <Route path="/apply" element={<ApplyPage />} />
      <Route path="/apply/my-applications" element={<MyApplicationsPage />} />

      {/* 대시보드 (Phase C-4) */}
      <Route path="/dashboard" element={
        <ProtectedRoute>
          <DashboardPage />
        </ProtectedRoute>
      } />

      {/* 운영자 페이지 — WO-O4O-OPERATOR-CONSOLE-ARCHITECTURE-V1: /operator 표준 경로 */}
      <Route path="/operator" element={
        <OperatorRoute>
          <OperatorLayout />
        </OperatorRoute>
      }>
        {/* Dashboard (WO-O4O-OPERATOR-DASHBOARD-DATA-NORMALIZATION-V1) */}
        <Route index element={<GlucoseViewOperatorDashboard />} />
        <Route path="applications" element={<OperatorApplicationsPage />} />
        <Route path="applications/:id" element={<OperatorApplicationDetailPage />} />
        {/* 회원 관리 (WO-O4O-MEMBERSHIP-CONSOLE-V1) */}
        <Route path="users" element={<OperatorUsersPage />} />
        <Route path="users/:id" element={<OperatorUserDetailPage />} />
        {/* 상품 관리 (WO-O4O-PRODUCT-MASTER-CONSOLE-V1) */}
        <Route path="products" element={<OperatorProductsPage />} />
        <Route path="products/:productId" element={<OperatorProductDetailPage />} />
        {/* 매장 관리 (WO-O4O-STORE-CONSOLE-V1) */}
        <Route path="stores" element={<OperatorStoresPage />} />
        <Route path="stores/:storeId" element={<OperatorStoreDetailPage />} />
        {/* AI Report (WO-AI-SERVICE-OPERATOR-REPORT-V1) */}
        <Route path="ai-report" element={<OperatorAiReportPage />} />
        {/* 역할 관리 (WO-O4O-ROLE-MANAGEMENT-UI-V1) */}
        <Route path="roles" element={<OperatorRoleManagementPage />} />
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

      {/* 당뇨인 서비스 — PatientLayout 중첩 (WO-GLUCOSEVIEW-PATIENT-MOBILE-UX-V1) */}
      <Route path="/patient" element={
        <RoleProtectedRoute allowedRoles={['patient']}>
          <PatientLayout />
        </RoleProtectedRoute>
      }>
        <Route index element={<PatientMainPage />} />
        <Route path="profile" element={<PatientProfilePage />} />
        <Route path="glucose-input" element={<GlucoseInputPage />} />
        <Route path="data-analysis" element={<DataAnalysisPage />} />
        <Route path="pharmacist-coaching" element={<PharmacistCoachingPage />} />
        <Route path="select-pharmacy" element={<SelectPharmacyPage />} />
        <Route path="appointments" element={<PatientAppointmentsPage />} />
        <Route path="care-guideline" element={<CareGuidelinePage />} />
      </Route>

      {/* 메인 레이아웃 (WO-O4O-GLUCOSEVIEW-BOOTSTRAP-FIX-V1) */}
      <Route path="/" element={<Layout />}>
        <Route index element={<HomeRedirect />} />
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
    <O4OErrorBoundary>
      <BrowserRouter>
        <AuthProvider>
          <LoginModalProvider>
            <O4OToastProvider />
            <PwaInstallPrompt />
            <LoginModal />
            <AppRoutes />
          </LoginModalProvider>
        </AuthProvider>
      </BrowserRouter>
    </O4OErrorBoundary>
  );
}

export default App;

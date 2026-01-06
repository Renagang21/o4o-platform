import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';

// Layouts
import MainLayout from '@/components/layouts/MainLayout';
import DashboardLayout from '@/components/layouts/DashboardLayout';
import StoreLayout from '@/components/layouts/StoreLayout';
import KioskLayout from '@/components/layouts/KioskLayout';
import TabletLayout from '@/components/layouts/TabletLayout';

// Public Pages
import HomePage from '@/pages/HomePage';
import ContactPage from '@/pages/ContactPage';
import LoginPage from '@/pages/auth/LoginPage';
import RegisterPage from '@/pages/auth/RegisterPage';
import RoleSelectPage from '@/pages/auth/RoleSelectPage';

// Pharmacy Dashboard
import PharmacyDashboard from '@/pages/pharmacy/PharmacyDashboard';
import PharmacyProducts from '@/pages/pharmacy/PharmacyProducts';
import PharmacyOrders from '@/pages/pharmacy/PharmacyOrders';
import PharmacyPatients from '@/pages/pharmacy/PharmacyPatients';
import PharmacySettings from '@/pages/pharmacy/PharmacySettings';

// Smart Display (Legacy)
import SmartDisplayPage from '@/pages/pharmacy/smart-display/SmartDisplayPage';
import PlaylistsPage from '@/pages/pharmacy/smart-display/PlaylistsPage';
import SchedulesPage from '@/pages/pharmacy/smart-display/SchedulesPage';
import MediaLibraryPage from '@/pages/pharmacy/smart-display/MediaLibraryPage';
import PlaylistForumPage from '@/pages/pharmacy/smart-display/PlaylistForumPage';

// Signage Extension (New)
import { ContentLibraryPage, MySignagePage, SignagePreviewPage } from '@/pages/pharmacy/signage';

// Market Trial Extension
import { MarketTrialListPage } from '@/pages/pharmacy/market-trial';
import { OperatorTrialSelectorPage } from '@/pages/operator/market-trial';

// B2B Order
import { B2BOrderPage } from '@/pages/pharmacy/b2b-order';

// Forum Extension
import { ForumListPage, ForumFeedPage } from '@/pages/forum-ext';
import { OperatorForumManagementPage } from '@/pages/operator/forum-management';

// Role Not Available Page (공급자/파트너는 Neture에서 관리)
import RoleNotAvailablePage from '@/pages/RoleNotAvailablePage';

// Operator Dashboard
import OperatorDashboard from '@/pages/operator/OperatorDashboard';
import ForumRequestsPage from '@/pages/operator/ForumRequestsPage';
import ApplicationsPage from '@/pages/operator/ApplicationsPage';
import ApplicationDetailPage from '@/pages/operator/ApplicationDetailPage';
import StoreApprovalsPage from '@/pages/operator/StoreApprovalsPage';
import StoreApprovalDetailPage from '@/pages/operator/StoreApprovalDetailPage';
import { StoreTemplateManagerPage } from '@/pages/operator/store-template';

// Pharmacy Store Apply
import StoreApplyPage from '@/pages/pharmacy/StoreApplyPage';

// Consumer Store
import StoreFront from '@/pages/store/StoreFront';
import StoreProducts from '@/pages/store/StoreProducts';
import StoreProductDetail from '@/pages/store/StoreProductDetail';
import StoreCart from '@/pages/store/StoreCart';

// Forum & Education
import ForumPage from '@/pages/forum/ForumPage';
import RequestCategoryPage from '@/pages/forum/RequestCategoryPage';
import MyRequestsPage from '@/pages/forum/MyRequestsPage';
import EducationPage from '@/pages/education/EducationPage';

// Common Pages
import MyPage from '@/pages/MyPage';
import NotFoundPage from '@/pages/NotFoundPage';

// Test Page
import NavLinkTestPage from '@/pages/NavLinkTestPage';

// Apply Pages (API 연동)
import PharmacyApplyPage from '@/pages/apply/PharmacyApplyPage';
import MyApplicationsPage from '@/pages/apply/MyApplicationsPage';

// Protected Route Component
function ProtectedRoute({ children, allowedRoles }: { children: React.ReactNode; allowedRoles?: string[] }) {
  const { isAuthenticated, user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && user && !allowedRoles.includes(user.role)) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}

// App Routes
function AppRoutes() {
  return (
    <Routes>
      {/* Public Routes with MainLayout */}
      <Route element={<MainLayout />}>
        <Route index element={<HomePage />} />
        <Route path="login" element={<LoginPage />} />
        <Route path="register" element={<RegisterPage />} />
        <Route path="role-select" element={<RoleSelectPage />} />
        <Route path="forum" element={<ForumPage />} />
        <Route path="forum/request-category" element={<RequestCategoryPage />} />
        <Route path="forum/my-requests" element={<MyRequestsPage />} />
        {/* Forum Extension */}
        <Route path="forum-ext" element={<ForumListPage />} />
        <Route path="forum-ext/:forumId" element={<ForumFeedPage />} />
        <Route path="education" element={<EducationPage />} />
        <Route path="contact" element={<ContactPage />} />
        <Route path="navlink-test" element={<NavLinkTestPage />} />
        <Route path="apply" element={<PharmacyApplyPage />} />
        <Route path="apply/my-applications" element={<MyApplicationsPage />} />
        <Route path="mypage" element={
          <ProtectedRoute>
            <MyPage />
          </ProtectedRoute>
        } />
      </Route>

      {/* Pharmacy Dashboard */}
      <Route
        path="pharmacy"
        element={
          <ProtectedRoute allowedRoles={['pharmacy']}>
            <DashboardLayout role="pharmacy" />
          </ProtectedRoute>
        }
      >
        <Route index element={<PharmacyDashboard />} />
        <Route path="products" element={<PharmacyProducts />} />
        <Route path="orders" element={<PharmacyOrders />} />
        <Route path="patients" element={<PharmacyPatients />} />
        <Route path="smart-display" element={<SmartDisplayPage />} />
        <Route path="smart-display/playlists" element={<PlaylistsPage />} />
        <Route path="smart-display/schedules" element={<SchedulesPage />} />
        <Route path="smart-display/media" element={<MediaLibraryPage />} />
        <Route path="smart-display/forum" element={<PlaylistForumPage />} />
        {/* Signage Extension (New) */}
        <Route path="signage/library" element={<ContentLibraryPage />} />
        <Route path="signage/my" element={<MySignagePage />} />
        <Route path="signage/preview" element={<SignagePreviewPage />} />
        {/* Market Trial Extension */}
        <Route path="market-trial" element={<MarketTrialListPage />} />
        {/* B2B Order */}
        <Route path="b2b-order" element={<B2BOrderPage />} />
        {/* Store Apply */}
        <Route path="store-apply" element={<StoreApplyPage />} />
        <Route path="settings" element={<PharmacySettings />} />
      </Route>

      {/* Supplier Dashboard - Neture에서 관리 */}
      <Route
        path="supplier"
        element={<RoleNotAvailablePage role="supplier" />}
      />
      <Route
        path="supplier/*"
        element={<RoleNotAvailablePage role="supplier" />}
      />

      {/* Partner Dashboard - Neture에서 관리 */}
      <Route
        path="partner"
        element={<RoleNotAvailablePage role="partner" />}
      />
      <Route
        path="partner/*"
        element={<RoleNotAvailablePage role="partner" />}
      />

      {/* Operator Dashboard */}
      <Route
        path="operator"
        element={
          <ProtectedRoute allowedRoles={['operator']}>
            <DashboardLayout role="operator" />
          </ProtectedRoute>
        }
      >
        <Route index element={<OperatorDashboard />} />
        <Route path="forum-requests" element={<ForumRequestsPage />} />
        <Route path="applications" element={<ApplicationsPage />} />
        <Route path="applications/:id" element={<ApplicationDetailPage />} />
        {/* Market Trial Extension */}
        <Route path="market-trial" element={<OperatorTrialSelectorPage />} />
        {/* Forum Extension */}
        <Route path="forum-management" element={<OperatorForumManagementPage />} />
        {/* Store Approvals */}
        <Route path="store-approvals" element={<StoreApprovalsPage />} />
        <Route path="store-approvals/:id" element={<StoreApprovalDetailPage />} />
        {/* Store Template Manager */}
        <Route path="store-template" element={<StoreTemplateManagerPage />} />
      </Route>

      {/* Consumer Store (Subdirectory) */}
      <Route path="store/:pharmacyId" element={<StoreLayout />}>
        <Route index element={<StoreFront />} />
        <Route path="products" element={<StoreProducts />} />
        <Route path="products/:productId" element={<StoreProductDetail />} />
        <Route path="cart" element={<StoreCart />} />
      </Route>

      {/* Kiosk Store Mode - 매장 내 키오스크 */}
      <Route path="store/:pharmacyId/kiosk" element={<KioskLayout />}>
        <Route index element={<StoreFront />} />
        <Route path="products" element={<StoreProducts />} />
        <Route path="products/:productId" element={<StoreProductDetail />} />
        <Route path="cart" element={<StoreCart />} />
      </Route>

      {/* Tablet Store Mode - 직원 보조 태블릿 */}
      <Route path="store/:pharmacyId/tablet" element={<TabletLayout />}>
        <Route index element={<StoreFront />} />
        <Route path="products" element={<StoreProducts />} />
        <Route path="products/:productId" element={<StoreProductDetail />} />
        <Route path="cart" element={<StoreCart />} />
      </Route>

      {/* 404 */}
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}

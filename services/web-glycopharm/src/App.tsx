import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';

// Layouts
import MainLayout from '@/components/layouts/MainLayout';
import DashboardLayout from '@/components/layouts/DashboardLayout';
import StoreLayout from '@/components/layouts/StoreLayout';
import KioskLayout from '@/components/layouts/KioskLayout';
import TabletLayout from '@/components/layouts/TabletLayout';
import PartnerLayout from '@/components/layouts/PartnerLayout';

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

// B2B Supply
import { SupplyPage } from '@/pages/b2b';

// Forum Extension
import { ForumListPage, ForumFeedPage } from '@/pages/forum-ext';
import { OperatorForumManagementPage } from '@/pages/operator/forum-management';

// Role Not Available Page (공급자/파트너는 Neture에서 관리)
import RoleNotAvailablePage from '@/pages/RoleNotAvailablePage';
import PartnerInfoPage from '@/pages/PartnerInfoPage';

// Operator Dashboard
import OperatorDashboard from '@/pages/operator/OperatorDashboard';
import ForumRequestsPage from '@/pages/operator/ForumRequestsPage';
import ApplicationsPage from '@/pages/operator/ApplicationsPage';
import ApplicationDetailPage from '@/pages/operator/ApplicationDetailPage';
import StoreApprovalsPage from '@/pages/operator/StoreApprovalsPage';
import StoreApprovalDetailPage from '@/pages/operator/StoreApprovalDetailPage';
import { StoreTemplateManagerPage } from '@/pages/operator/store-template';
import UsersPage from '@/pages/operator/UsersPage';
import SettingsPage from '@/pages/operator/SettingsPage';
import AiReportPage from '@/pages/operator/AiReportPage';

// Operator Semi-Franchise Pages
import PharmaciesPage from '@/pages/operator/PharmaciesPage';
import ProductsPage from '@/pages/operator/ProductsPage';
import OrdersPage from '@/pages/operator/OrdersPage';
import InventoryPage from '@/pages/operator/InventoryPage';
import SettlementsPage from '@/pages/operator/SettlementsPage';
import AnalyticsPage from '@/pages/operator/AnalyticsPage';
import MarketingPage from '@/pages/operator/MarketingPage';
import SupportPage from '@/pages/operator/SupportPage';

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

// Partner Application (WO-PARTNER-APPLICATION-V1)
import PartnerApplyPage from '@/pages/partners/ApplyPage';

// Apply Pages (API 연동)
import PharmacyApplyPage from '@/pages/apply/PharmacyApplyPage';
import MyApplicationsPage from '@/pages/apply/MyApplicationsPage';

// Test Guide Pages
import {
  TestGuidePage,
  PharmacyManualPage,
  ConsumerManualPage,
  OperatorManualPage,
} from '@/pages/test-guide';

// Partner Dashboard Pages
import PartnerIndex from '@/pages/partner/index';
import PartnerOverviewPage from '@/pages/partner/OverviewPage';
import PartnerTargetsPage from '@/pages/partner/TargetsPage';
import PartnerContentPage from '@/pages/partner/ContentPage';
import PartnerEventsPage from '@/pages/partner/EventsPage';
import PartnerStatusPage from '@/pages/partner/StatusPage';

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
        <Route path="partners" element={<PartnerInfoPage />} />
        <Route path="partners/apply" element={<PartnerApplyPage />} />
        <Route path="apply" element={<PharmacyApplyPage />} />

        {/* Test Guide */}
        <Route path="test-guide" element={<TestGuidePage />} />
        <Route path="test-guide/manual/pharmacy" element={<PharmacyManualPage />} />
        <Route path="test-guide/manual/consumer" element={<ConsumerManualPage />} />
        <Route path="test-guide/manual/operator" element={<OperatorManualPage />} />
        <Route path="apply/my-applications" element={<MyApplicationsPage />} />
        {/* B2B Supply */}
        <Route path="b2b/supply" element={<SupplyPage />} />
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

      {/* Partner Dashboard */}
      <Route
        path="partner"
        element={
          <ProtectedRoute allowedRoles={['partner']}>
            <PartnerLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<PartnerIndex />} />
        <Route path="overview" element={<PartnerOverviewPage />} />
        <Route path="targets" element={<PartnerTargetsPage />} />
        <Route path="content" element={<PartnerContentPage />} />
        <Route path="events" element={<PartnerEventsPage />} />
        <Route path="status" element={<PartnerStatusPage />} />
      </Route>

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
        {/* Semi-Franchise Management */}
        <Route path="pharmacies" element={<PharmaciesPage />} />
        <Route path="applications" element={<ApplicationsPage />} />
        <Route path="applications/:id" element={<ApplicationDetailPage />} />
        <Route path="products" element={<ProductsPage />} />
        <Route path="orders" element={<OrdersPage />} />
        <Route path="inventory" element={<InventoryPage />} />
        <Route path="settlements" element={<SettlementsPage />} />
        <Route path="analytics" element={<AnalyticsPage />} />
        <Route path="marketing" element={<MarketingPage />} />
        {/* Forum */}
        <Route path="forum-requests" element={<ForumRequestsPage />} />
        <Route path="forum-management" element={<OperatorForumManagementPage />} />
        {/* Market Trial Extension */}
        <Route path="market-trial" element={<OperatorTrialSelectorPage />} />
        {/* Store Approvals */}
        <Route path="store-approvals" element={<StoreApprovalsPage />} />
        <Route path="store-approvals/:id" element={<StoreApprovalDetailPage />} />
        {/* Store Template Manager */}
        <Route path="store-template" element={<StoreTemplateManagerPage />} />
        {/* Users & Support & Settings */}
        <Route path="users" element={<UsersPage />} />
        <Route path="support" element={<SupportPage />} />
        <Route path="settings" element={<SettingsPage />} />
        {/* AI Report (WO-AI-SERVICE-OPERATOR-REPORT-V1) */}
        <Route path="ai-report" element={<AiReportPage />} />
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

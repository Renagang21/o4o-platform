import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, AdminProtectedRoute, SessionManager } from '@o4o/auth-context';
import { AuthClient } from '@o4o/auth-client';
import toast from 'react-hot-toast';
import { useEffect, Suspense, lazy } from 'react';
import ErrorBoundary from '@/components/ErrorBoundary';
import { EnvBadge } from '@/components/EnvBadge';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { ToastProvider } from '@/contexts/ToastContext';
import { useAuthStore } from '@/stores/authStore';
import '@/styles/wordpress-theme.css';
import '@/styles/wordpress-sidebar.css';
import '@/styles/admin-layout-fixed.css';
import '@/styles/block-toolbar.css';
import '@/styles/block-selection.css';
import '@/styles/inspector-sidebar.css';
import '@/styles/block-placeholder.css';
import '@/styles/block-inserter.css';
import '@/styles/inner-blocks.css';

// Register Dynamic Shortcodes
import '@/utils/register-dynamic-shortcodes';

// AI Config Migration - Fix old gemini-pro references
import '@/utils/aiMigration';

// Layout Components
import AdminLayout from '@/components/layout/AdminLayout';
import EditorLayout from '@/layouts/EditorLayout';
import InitialRedirect from '@/components/InitialRedirect';
import { AppRouteGuard } from '@/components/AppRouteGuard';

/**
 * Phase P0 Task B: Dynamic Routing Infrastructure
 *
 * DynamicRouteLoader and ViewComponentRegistry provide the foundation for
 * manifest-based dynamic routing. Routes defined in app manifests (viewTemplates)
 * can be automatically loaded via the Routes API.
 *
 * MIGRATION PATH:
 * 1. Apps define routes in manifest.viewTemplates
 * 2. Components are registered in ViewComponentRegistry
 * 3. DynamicRouteLoader fetches and renders routes
 * 4. Gradually move hardcoded routes below to dynamic
 * 5. Eventually remove hardcoded routes when migration complete
 *
 * @see apps/api-server/src/routes/routes.routes.ts - Routes API
 * @see apps/admin-dashboard/src/components/routing/ViewComponentRegistry.ts
 * @see apps/admin-dashboard/src/components/routing/DynamicRouteLoader.tsx
 */
// Dynamic Routing exports (for future use when migrating routes)
export { viewComponentRegistry, DynamicRouteLoader, useDynamicRoutes } from '@/components/routing';

// Import EditorRouteWrapper to handle route-based remounting
import EditorRouteWrapper from '@/pages/editor/EditorRouteWrapper';

/**
 * @deprecated Phase P0 Task B: Hardcoded lazy imports will be migrated to ViewComponentRegistry.
 *
 * Page Components - Lazy loaded (FALLBACK during transition)
 *
 * MIGRATION: Move lazy imports to ViewComponentRegistry.ts and remove from here.
 * System routes (Login, ForgotPassword, etc.) will remain hardcoded.
 */
// Page Components - Lazy loaded
const Login = lazy(() => import('@/pages/auth/Login'));
const ForgotPassword = lazy(() => import('@/pages/auth/ForgotPassword'));
const ResetPassword = lazy(() => import('@/pages/auth/ResetPassword'));
const AdminHome = lazy(() => import('@/pages/AdminHome'));
const WordPressDashboard = lazy(() => import('@/pages/WordPressDashboard'));
const DashboardSimple = lazy(() => import('@/pages/dashboard/DashboardSimple'));
// P1 Phase C: Widget-based Dashboard
const AdminDashboardPageWrapper = lazy(() => import('@/pages/dashboard/AdminDashboardPageWrapper'));
const UsersPage = lazy(() => import('@/pages/users'));
const UserForm = lazy(() => import('@/pages/users/UserForm'));
const UserDetail = lazy(() => import('@/pages/users/UserDetail'));
const RoleManagement = lazy(() => import('@/pages/users/RoleManagement'));
const UserStatistics = lazy(() => import('@/pages/users/UserStatistics'));
const ActiveUsers = lazy(() => import('@/pages/users/ActiveUsers'));
// P0 RBAC: Enrollment Management
const EnrollmentManagement = lazy(() => import('@/pages/enrollments/EnrollmentManagement'));
// P4-Admin: Role Applications Management
const RoleApplicationsAdminPage = lazy(() => import('@/pages/RoleApplicationsAdminPage'));
// Membership-Yaksa: Membership Management
const MembershipDashboard = lazy(() => import('@/pages/membership/dashboard/MembershipDashboard'));
const MemberManagement = lazy(() => import('@/pages/membership/members/MemberManagement'));
const MemberDetail = lazy(() => import('@/pages/membership/members/MemberDetail'));
const VerificationManagement = lazy(() => import('@/pages/membership/verifications/VerificationManagement'));
const CategoryManagement = lazy(() => import('@/pages/membership/categories/CategoryManagement'));
const AuditLogManagement = lazy(() => import('@/pages/membership/audit-logs/AuditLogManagement'));
const AffiliationManagement = lazy(() => import('@/pages/membership/affiliations/AffiliationManagement'));
// Reporting-Yaksa: Annual Report Management
const ReportingDashboard = lazy(() => import('@/pages/reporting/dashboard/ReportingDashboard'));
const ReportList = lazy(() => import('@/pages/reporting/reports/ReportList'));
const TemplateList = lazy(() => import('@/pages/reporting/templates/TemplateList'));
// const Content = lazy(() => import(/* webpackChunkName: "content" */ '@/pages/content/Content')); // Removed - replaced by CPT Engine
// const SettlementDashboard = lazy(() => import('@/pages/ecommerce/SettlementDashboard'));
// const SettlementReports = lazy(() => import('@/pages/ecommerce/SettlementReports'));
const Analytics = lazy(() => import('@/pages/analytics/Analytics'));
const Settings = lazy(() => import('@/pages/settings/Settings'));
const EmailSettings = lazy(() => import('@/pages/mail/MailManagement'));
const PagesRouter = lazy(() => import('@/pages/pages/PagesRouter'));
const MediaLibrary = lazy(() => import('@/pages/media/Media'));
const CustomFields = lazy(() => import('@/pages/custom-fields/CustomFields'));
// const ReusableBlocksPage = lazy(() =>
//   import(/* webpackChunkName: "reusable-blocks" */ '@/pages/content/ReusableBlocksPage')
// ); // Removed - content directory deleted
const Posts = lazy(() => import('@/pages/posts/Posts'));
const Categories = lazy(() => import('@/pages/posts/Categories'));
const CategoryEdit = lazy(() => import('@/pages/posts/CategoryEdit'));
const Tags = lazy(() => import('@/pages/posts/Tags'));
const PostPreview = lazy(() => import('@/pages/preview/PostPreview'));
const ViewPreview = lazy(() => import('@/pages/preview/ViewPreview'));
// const Shortcodes = lazy(() => import('@/pages/documentation/Shortcodes'));
const NavigationMenus = lazy(() => import('@/pages/menus/Menus'));
// const TestPage = lazy(() => import('@/pages/test/TestPage')); // Removed test page
// const SystemMonitoring = lazy(() => import('@/pages/monitoring/SystemMonitoring'));

// Appearance Pages
const TemplateParts = lazy(() => import('@/pages/appearance/TemplateParts'));
const TemplatePartEditor = lazy(() => import(/* webpackChunkName: "template-editor" */ '@/pages/appearance/TemplatePartEditor'));
const GeneralSettings = lazy(() => import('@/pages/settings/GeneralSettings'));
const SiteThemeSettings = lazy(() => import('@/pages/appearance/SiteThemeSettings'));
const IntegratedMonitoring = lazy(() => import('@/pages/monitoring/IntegratedMonitoring'));
const PerformanceDashboard = lazy(() => import('@/pages/monitoring/PerformanceDashboard'));
const OperationsDashboard = lazy(() => import('@/pages/dashboard/phase2.4'));

// Service Monitoring (Phase 9 Task 3)
const ServiceOverview = lazy(() => import('@/pages/services/ServiceOverview'));
// const WidgetManager = lazy(() => import('@/pages/content/WidgetManager')); // Loaded via Content router


// Affiliate Management Pages

// App Pages
const ToolsPage = lazy(() => import('@/pages/ToolsPage'));
const FileReplaceTools = lazy(() => import('@/pages/tools/MediaFileReplace'));
const AppStorePage = lazy(() => import('@/pages/apps/AppStorePage'));

// Site Builder - REMOVED (WO-ADMIN-LEGACY-CLEANUP-V2)
// Moved to individual service responsibility per Goal State Definition

// Forum Pages (from @o4o/forum-core package - source imports)
const ForumBoardList = lazy(() => import('@o4o/forum-core/src/admin-ui/pages/ForumBoardList'));
const ForumCategories = lazy(() => import('@o4o/forum-core/src/admin-ui/pages/ForumCategories'));
const ForumPostDetail = lazy(() => import('@o4o/forum-core/src/admin-ui/pages/ForumPostDetail'));
const ForumPostForm = lazy(() => import('@o4o/forum-core/src/admin-ui/pages/ForumPostForm'));

// Yaksa Community Pages (from @o4o/forum-core-yaksa package - source imports)
const YaksaCommunityList = lazy(() => import('@o4o/forum-core-yaksa/src/admin-ui/pages/YaksaCommunityList'));
const YaksaCommunityDetail = lazy(() => import('@o4o/forum-core-yaksa/src/admin-ui/pages/YaksaCommunityDetail'));
const YaksaCommunityFeed = lazy(() => import('@o4o/forum-core-yaksa/src/admin-ui/pages/YaksaCommunityFeed'));

// Groupbuy Pages
const GroupbuyCampaignListPage = lazy(() => import('@/pages/groupbuy/GroupbuyCampaignListPage'));
const GroupbuyCampaignDetailPage = lazy(() => import('@/pages/groupbuy/GroupbuyCampaignDetailPage'));
const GroupbuyParticipantsPage = lazy(() => import('@/pages/groupbuy/GroupbuyParticipantsPage'));
const GroupbuySettlementPage = lazy(() => import('@/pages/groupbuy/GroupbuySettlementPage'));

// SellerOps Pages
const SellerOpsRouter = lazy(() => import('@/pages/sellerops/SellerOpsRouter'));

// SupplierOps Pages
const SupplierOpsRouter = lazy(() => import('@/pages/supplierops/SupplierOpsRouter'));

// PartnerOps Pages
const PartnerOpsRouter = lazy(() => import('@/pages/partnerops/PartnerOpsRouter'));

// Cosmetics Partner Extension Pages
const CosmeticsPartnerRouter = lazy(() => import('@/pages/cosmetics-partner/CosmeticsPartnerRouter'));

// Cosmetics Products Pages (Phase 7-H)
const CosmeticsProductsRouter = lazy(() => import('@/pages/cosmetics-products/CosmeticsProductsRouter'));

// Glycopharm Pages (Phase B-3)
const GlycopharmRouter = lazy(() => import('@/pages/glycopharm/GlycopharmRouter'));

// GlucoseView Pages (Phase C-3)
const GlucoseViewRouter = lazy(() => import('@/pages/glucoseview/GlucoseViewRouter'));

// Service Applications Admin Pages (Phase C-4)
const ServiceApplicationsPage = lazy(() => import('@/pages/service-applications/ServiceApplicationsPage'));
const ServiceApplicationDetailPage = lazy(() => import('@/pages/service-applications/ServiceApplicationDetailPage'));

// Neture Pages (Phase D-3)
const NetureRouter = lazy(() => import('@/pages/neture/NetureRouter'));

// Service Content Manager (WO-ADMIN-CONTENT-SLOT-V1)
const ServiceContentManagerPage = lazy(() => import('@/pages/service-content-manager/ServiceContentManagerPage'));

// Storefront Pages (Phase 7-I)
const StorefrontRouter = lazy(() => import('@/pages/storefront/StorefrontRouter'));

// Pharmacy AI Insight (Phase 5 - Active)
const PharmacyAiInsightSummary = lazy(() => import('@o4o/pharmacy-ai-insight').then(m => ({ default: m.SummaryPage })));

// CGM Pharmacist App (Phase 1 - Development)
const CGMPatientListPage = lazy(() => import('@o4o/cgm-pharmacist-app').then(m => ({ default: m.PatientListPage })));
const CGMPatientDetailPage = lazy(() => import('@o4o/cgm-pharmacist-app').then(m => ({ default: m.PatientDetailPage })));
const CGMCoachingPage = lazy(() => import('@o4o/cgm-pharmacist-app').then(m => ({ default: m.CoachingPage })));
const CGMAlertsPage = lazy(() => import('@o4o/cgm-pharmacist-app').then(m => ({ default: m.AlertsPage })));

// LMS-Yaksa Pages
const LmsYaksaRouter = lazy(() => import('@/pages/lms-yaksa/LmsYaksaRouter'));

// LMS-Marketing Pages (Phase R10 & R11)
const MarketingPublisherRouter = lazy(() => import('@/pages/marketing/publisher/MarketingPublisherRouter'));
const OnboardingHome = lazy(() => import('@/pages/marketing/onboarding/OnboardingHome'));
const SupplierProfileForm = lazy(() => import('@/pages/marketing/onboarding/SupplierProfileForm'));
const AutomationSettings = lazy(() => import('@/pages/marketing/automation/AutomationSettings'));

// Digital Signage Management (Phase 6)
const DigitalSignageRouter = lazy(() => import('@/pages/digital-signage/DigitalSignageRouter'));

// Yaksa Admin Hub (Phase 19-D)
const YaksaAdminHub = lazy(() => import('@/pages/yaksa/YaksaAdminHub'));

// Yaksa Admin - Phase 1 Approval & Overview UI
const YaksaAdminDashboard = lazy(() => import('@/pages/yaksa-admin/YaksaAdminDashboard'));
const MemberApprovalPage = lazy(() => import('@/pages/yaksa-admin/MemberApprovalPage'));
const ReportReviewPage = lazy(() => import('@/pages/yaksa-admin/ReportReviewPage'));
const OfficerManagePage = lazy(() => import('@/pages/yaksa-admin/OfficerManagePage'));
const EducationOverviewPage = lazy(() => import('@/pages/yaksa-admin/EducationOverviewPage'));
const FeeOverviewPage = lazy(() => import('@/pages/yaksa-admin/FeeOverviewPage'));

// Yaksa Accounting - Phase 2 Expense UI & Export
const AccountingDashboard = lazy(() => import('@/pages/yaksa-admin/accounting/AccountingDashboard'));
const ExpenseListPage = lazy(() => import('@/pages/yaksa-admin/accounting/ExpenseListPage'));
const ClosingPage = lazy(() => import('@/pages/yaksa-admin/accounting/ClosingPage'));
const ExportPage = lazy(() => import('@/pages/yaksa-admin/accounting/ExportPage'));

// UI Showcase
const UIShowcase = lazy(() => import('@/pages/UIShowcase'));

// Error Pages
const AppDisabled = lazy(() => import('@/pages/error/AppDisabled'));

// Debug Pages
const AuthBootstrapDebug = lazy(() => import('@/pages/__debug__/AuthBootstrapDebug'));

// CPT Engine
const CPTEngine = lazy(() => import('@/pages/cpt-engine'));

// CPT Presets
const FormPresets = lazy(() => import('@/pages/cpt-engine/presets/FormPresets'));
const ViewPresets = lazy(() => import('@/pages/cpt-engine/presets/ViewPresets'));
const TemplatePresets = lazy(() => import('@/pages/cpt-engine/presets/TemplatePresets'));

// CPT/ACF Router
const CPTACFRouter = lazy(() => import('@/pages/cpt-acf/CPTACFRouter'));

// CMS V2 Pages (Phase C-2.5 & C-3)
const CMSCPTList = lazy(() => import('@/pages/cms/cpts/CMSCPTList'));
const CMSCPTForm = lazy(() => import('@/pages/cms/cpts/CPTForm'));
const CMSFieldList = lazy(() => import('@/pages/cms/fields/CMSFieldList'));
const CMSFieldForm = lazy(() => import('@/pages/cms/fields/FieldForm'));
const CMSViewList = lazy(() => import('@/pages/cms/views/CMSViewList'));
const CMSViewForm = lazy(() => import('@/pages/cms/views/ViewForm'));
const CMSPageList = lazy(() => import('@/pages/cms/pages/CMSPageList'));
const CMSPageForm = lazy(() => import('@/pages/cms/pages/PageForm'));

// CMS V2 Visual Designer (Phase C-3)
const ViewDesigner = lazy(() => import('@/pages/cms/designer/ViewDesigner'));

// Dropshipping Pages - REMOVED (archived to legacy/packages/dropshipping-core)
// const DropshippingRouter = lazy(() => import('@o4o/dropshipping-core/admin-ui').then(module => ({ default: module.DropshippingRouter })));

// DS-4: Dropshipping Admin Pages (Order Relay & Settlement)
const DropshippingOrderRelayListPage = lazy(() => import('@/pages/dropshipping/OrderRelayListPage'));
const DropshippingOrderRelayDetailPage = lazy(() => import('@/pages/dropshipping/OrderRelayDetailPage'));
const DropshippingSettlementListPage = lazy(() => import('@/pages/dropshipping/SettlementListPage'));
const DropshippingSettlementDetailPage = lazy(() => import('@/pages/dropshipping/SettlementDetailPage'));

// Admin Order Pages (Phase 4)
const OrderListPage = lazy(() => import('@/pages/admin/orders/OrderListPage'));
const OrderDetailPage = lazy(() => import('@/pages/admin/orders/OrderDetailPage'));

// PD-3: Seller Pages
const SellerCatalog = lazy(() => import('@/pages/dashboard/seller/SellerCatalog'));
const SellerProducts = lazy(() => import('@/pages/dashboard/seller/SellerProducts'));
// PD-4: Orders Pages
const SellerOrders = lazy(() => import('@/pages/dashboard/seller/SellerOrders'));
const SupplierOrders = lazy(() => import('@/pages/dashboard/supplier/SupplierOrders'));
// PD-5: Settlement Pages
const SellerSettlements = lazy(() => import('@/pages/dashboard/seller/SellerSettlements'));
const SupplierSettlements = lazy(() => import('@/pages/dashboard/supplier/SupplierSettlements'));

// Test Page - Minimal Editor
const EditorTest = lazy(() => import('@/pages/test/MinimalEditor'));
const AIPageGeneratorTest = lazy(() => import('@/pages/test/AIPageGeneratorTest'));
const FocusRestorationTest = lazy(() => import('@/pages/test/FocusRestorationTest'));
const AIBlockDebug = lazy(() => import('@/pages/test/AIBlockDebug'));
const SeedPresets = lazy(() => import('@/pages/test/SeedPresets'));
const PresetIntegrationTest = lazy(() => import('@/pages/test/PresetIntegrationTest'));
const DeleteCustomizerTest = lazy(() => import('@/pages/test/DeleteCustomizerTest'));
const AuthDebug = lazy(() => import('@/pages/test/AuthDebug'));
const AuthInspector = lazy(() => import('@/pages/test/AuthInspector'));
const DropshippingUsersTest = lazy(() => import('@/pages/test/DropshippingUsersTest'));
const UserEditTest = lazy(() => import('@/pages/test/UserEditTest'));
const ApiResponseChecker = lazy(() => import('@/pages/test/ApiResponseChecker'));
const MenuDebug = lazy(() => import('@/pages/test/MenuDebug'));
// SiteBuilderTest - REMOVED (WO-ADMIN-LEGACY-CLEANUP-V2)
const CMSFieldsDebug = lazy(() => import('@/pages/test/CMSFieldsDebug'));
const CMSViewCreateTest = lazy(() => import('@/pages/test/CMSViewCreateTest'));
const CMSViewListDebug = lazy(() => import('@/pages/test/CMSViewListDebug'));

// Removed Apps Manager - using WordPress style menu

// Appearance Pages (WordPress Style)
const HeaderBuilder = lazy(() => import('@/pages/appearance/header-builder/HeaderBuilderPage'));

// Shortcode Management - REMOVED

// Loading component
const PageLoader = () => (
  <div className="flex items-center justify-center h-screen">
    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-admin-blue"></div>
  </div>
);

// SSO 클라이언트 인스턴스 생성
const ssoClient = new AuthClient(
  import.meta.env.VITE_API_URL || 'https://api.neture.co.kr'
);

/**
 * 관리자 대시보드 메인 앱
 * SSO 인증 시스템 통합
 */
function App() {
  // Initialize auth on app start
  useEffect(() => {
    // SSO 체크 비활성화 - 로컬 인증만 사용
    // SSO는 백엔드 구현 완료 후 활성화
  }, []);
  
  // 인증 오류 처리
  const handleAuthError = (error: string) => {
    // Error logging - use proper error handler
    
    switch (error) {
      case 'token_refresh_failed':
        toast.error('세션이 만료되었습니다. 다시 로그인해 주세요.');
        break;
      case 'insufficient_permissions':
        toast.error('관리자 권한이 필요합니다.');
        break;
      case 'account_locked':
        toast.error('계정이 잠겨있습니다. 관리자에게 문의하세요.');
        break;
      default:
        toast.error('인증 오류가 발생했습니다.');
    }
  };

  // 세션 만료 경고 처리
  const handleSessionExpiring = (remainingSeconds: number) => {
    const minutes = Math.floor(remainingSeconds / 60);
    toast(`${minutes}분 후 세션이 만료됩니다.`, {
      icon: '⏰',
      duration: 5000,
    });
  };


  return (
    <ErrorBoundary>
      <EnvBadge />
      <ThemeProvider>
        <ToastProvider>
          <AuthProvider
            ssoClient={ssoClient}
            autoRefresh={true}
            onAuthError={handleAuthError}
            onSessionExpiring={handleSessionExpiring}
          >
          <SessionManager
            warningBeforeExpiry={5 * 60 * 1000} // 5분 전 경고
            onSessionExpiring={handleSessionExpiring}
          >
            <Routes>
            {/* 공개 라우트 - 로그인 페이지 */}
            <Route path="/login" element={
              <Suspense fallback={<PageLoader />}>
                <Login />
              </Suspense>
            } />
            
            {/* 비밀번호 재설정 페이지 */}
            <Route path="/forgot-password" element={
              <Suspense fallback={<PageLoader />}>
                <ForgotPassword />
              </Suspense>
            } />
            
            <Route path="/reset-password" element={
              <Suspense fallback={<PageLoader />}>
                <ResetPassword />
              </Suspense>
            } />

            {/* Auth Inspector - Public test page for debugging auth issues */}
            <Route path="/auth-inspector" element={
              <Suspense fallback={<PageLoader />}>
                <AuthInspector />
              </Suspense>
            } />

            {/* Auth Bootstrap Debug - WO-DEBUG-ADMIN-AUTH-BOOTSTRAP-001 */}
            <Route path="/__debug__/auth-bootstrap" element={
              <Suspense fallback={<PageLoader />}>
                <AuthBootstrapDebug />
              </Suspense>
            } />

            {/* 루트 경로 - 인증 상태에 따라 리다이렉트 */}
            <Route path="/" element={<InitialRedirect />} />
            
            {/* 미리보기 페이지 - 인증 불필요 (sessionStorage 기반) */}
            <Route path="/admin/preview" element={
              <Suspense fallback={<PageLoader />}>
                <PostPreview />
              </Suspense>
            } />

            
            {/* 독립형 편집기 라우트 - 관리자 레이아웃 밖에서 실행 */}
            <Route path="/editor/*" element={
              <AdminProtectedRoute 
                requiredRoles={['admin']}
                requiredPermissions={['content:write']}
              >
                <EditorLayout>
                  <Routes>
                    <Route path="posts/new" element={
                      <Suspense fallback={<PageLoader />}>
                        <EditorRouteWrapper mode="post" />
                      </Suspense>
                    } />
                    <Route path="posts/:id" element={
                      <Suspense fallback={<PageLoader />}>
                        <EditorRouteWrapper mode="post" />
                      </Suspense>
                    } />
                    <Route path="pages/new" element={
                      <Suspense fallback={<PageLoader />}>
                        <EditorRouteWrapper mode="page" />
                      </Suspense>
                    } />
                    <Route path="pages/:id" element={
                      <Suspense fallback={<PageLoader />}>
                        <EditorRouteWrapper mode="page" />
                      </Suspense>
                    } />
                    <Route path="templates/:id" element={
                      <Suspense fallback={<PageLoader />}>
                        <EditorRouteWrapper mode="template" />
                      </Suspense>
                    } />
                    <Route path="patterns/:id" element={
                      <Suspense fallback={<PageLoader />}>
                        <EditorRouteWrapper mode="pattern" />
                      </Suspense>
                    } />
                  </Routes>
                </EditorLayout>
              </AdminProtectedRoute>
            } />
            
            {/* Preview Routes */}
            <Route path="/preview/posts/:id" element={
              <Suspense fallback={<PageLoader />}>
                <PostPreview />
              </Suspense>
            } />
            <Route path="/preview/pages/:id" element={
              <Suspense fallback={<PageLoader />}>
                <PostPreview />
              </Suspense>
            } />
            <Route path="/preview/:slug" element={
              <Suspense fallback={<PageLoader />}>
                <ViewPreview />
              </Suspense>
            } />

            {/* Storefront Routes (Phase 7-I) - Consumer-facing, no auth required */}
            <Route path="/storefront/*" element={
              <Suspense fallback={<PageLoader />}>
                <StorefrontRouter />
              </Suspense>
            } />

            {/* 보호된 관리자 라우트들 */}
            <Route path="/*" element={
              <AdminProtectedRoute 
                requiredRoles={['admin']}
                showContactAdmin={true}
              >
                <AdminLayout>
                  <Routes>
                    {/* Error Pages - No permission required */}
                    <Route path="/error/app-disabled" element={
                      <Suspense fallback={<PageLoader />}>
                        <AppDisabled />
                      </Suspense>
                    } />

                    {/* WordPress 스타일 메인 대시보드 */}
                    <Route path="/admin" element={
                      <Suspense fallback={<PageLoader />}>
                        <WordPressDashboard />
                      </Suspense>
                    } />
                    
                    <Route path="/home" element={
                      <Suspense fallback={<PageLoader />}>
                        <AdminHome />
                      </Suspense>
                    } />
                    
                    <Route path="/dashboard" element={
                      <Suspense fallback={<PageLoader />}>
                        <DashboardSimple />
                      </Suspense>
                    } />

                    {/* WO-ADMIN-CONTENT-SLOT-V1: Service Content Manager */}
                    <Route path="/admin/service-content-manager" element={
                      <AdminProtectedRoute requiredRoles={['admin', 'super_admin', 'platform_admin']}>
                        <Suspense fallback={<PageLoader />}>
                          <ServiceContentManagerPage />
                        </Suspense>
                      </AdminProtectedRoute>
                    } />

                    {/* P1 Phase C: Widget-based Admin Dashboard */}
                    <Route path="/admin/dashboard/widgets" element={
                      <AdminProtectedRoute requiredRoles={['admin']}>
                        <Suspense fallback={<PageLoader />}>
                          <AdminDashboardPageWrapper />
                        </Suspense>
                      </AdminProtectedRoute>
                    } />

                    {/* PD-3: Seller Dashboard Routes */}
                    <Route path="/dashboard/seller/catalog" element={
                      <AdminProtectedRoute requiredRoles={['seller']}>
                        <Suspense fallback={<PageLoader />}>
                          <SellerCatalog />
                        </Suspense>
                      </AdminProtectedRoute>
                    } />
                    <Route path="/dashboard/seller/products" element={
                      <AdminProtectedRoute requiredRoles={['seller']}>
                        <Suspense fallback={<PageLoader />}>
                          <SellerProducts />
                        </Suspense>
                      </AdminProtectedRoute>
                    } />

                    {/* PD-4: Seller Orders */}
                    <Route path="/dashboard/seller/orders" element={
                      <AdminProtectedRoute requiredRoles={['seller']}>
                        <Suspense fallback={<PageLoader />}>
                          <SellerOrders />
                        </Suspense>
                      </AdminProtectedRoute>
                    } />

                    {/* PD-5: Seller Settlements */}
                    <Route path="/dashboard/seller/settlements" element={
                      <AdminProtectedRoute requiredRoles={['seller']}>
                        <Suspense fallback={<PageLoader />}>
                          <SellerSettlements />
                        </Suspense>
                      </AdminProtectedRoute>
                    } />

                    {/* PD-4: Supplier Orders */}
                    <Route path="/dashboard/supplier/orders" element={
                      <AdminProtectedRoute requiredRoles={['supplier']}>
                        <Suspense fallback={<PageLoader />}>
                          <SupplierOrders />
                        </Suspense>
                      </AdminProtectedRoute>
                    } />

                    {/* PD-5: Supplier Settlements */}
                    <Route path="/dashboard/supplier/settlements" element={
                      <AdminProtectedRoute requiredRoles={['supplier']}>
                        <Suspense fallback={<PageLoader />}>
                          <SupplierSettlements />
                        </Suspense>
                      </AdminProtectedRoute>
                    } />

                    {/* 현재 접속자 */}
                    <Route path="/active-users" element={
                      <AdminProtectedRoute requiredRoles={['admin', 'super_admin']}>
                        <Suspense fallback={<PageLoader />}>
                          <ActiveUsers />
                        </Suspense>
                      </AdminProtectedRoute>
                    } />

                    {/* 사용자 관리 */}
                    <Route path="/users" element={
                      <AdminProtectedRoute requiredPermissions={['users:read']}>
                        <Suspense fallback={<PageLoader />}>
                          <UsersPage />
                        </Suspense>
                      </AdminProtectedRoute>
                    } />
                    <Route path="/users/add" element={
                      <AdminProtectedRoute requiredPermissions={['users:create']}>
                        <Suspense fallback={<PageLoader />}>
                          <UserForm />
                        </Suspense>
                      </AdminProtectedRoute>
                    } />
                    <Route path="/users/new" element={
                      <AdminProtectedRoute requiredPermissions={['users:create']}>
                        <Suspense fallback={<PageLoader />}>
                          <UserForm />
                        </Suspense>
                      </AdminProtectedRoute>
                    } />

                    <Route path="/users/roles" element={
                      <AdminProtectedRoute requiredPermissions={['users:update']}>
                        <Suspense fallback={<PageLoader />}>
                          <RoleManagement />
                        </Suspense>
                      </AdminProtectedRoute>
                    } />
                    <Route path="/users/statistics" element={
                      <AdminProtectedRoute requiredPermissions={['users:read']}>
                        <Suspense fallback={<PageLoader />}>
                          <UserStatistics />
                        </Suspense>
                      </AdminProtectedRoute>
                    } />
                    <Route path="/users/:id" element={
                      <AdminProtectedRoute requiredPermissions={['users:read']}>
                        <Suspense fallback={<PageLoader />}>
                          <UserDetail />
                        </Suspense>
                      </AdminProtectedRoute>
                    } />
                    <Route path="/users/:id/edit" element={
                      <AdminProtectedRoute requiredPermissions={['users:update']}>
                        <Suspense fallback={<PageLoader />}>
                          <UserForm />
                        </Suspense>
                      </AdminProtectedRoute>
                    } />

                    {/* P0 RBAC: 역할 신청 관리 */}
                    <Route path="/enrollments" element={
                      <AdminProtectedRoute requiredPermissions={['users:update']}>
                        <Suspense fallback={<PageLoader />}>
                          <EnrollmentManagement />
                        </Suspense>
                      </AdminProtectedRoute>
                    } />
                    <Route path="/admin/enrollments" element={
                      <AdminProtectedRoute requiredPermissions={['users:update']}>
                        <Suspense fallback={<PageLoader />}>
                          <EnrollmentManagement />
                        </Suspense>
                      </AdminProtectedRoute>
                    } />

                    {/* P4-Admin: 역할 신청 관리 */}
                    <Route path="/admin/role-applications" element={
                      <AdminProtectedRoute requiredPermissions={['users:update']}>
                        <Suspense fallback={<PageLoader />}>
                          <RoleApplicationsAdminPage />
                        </Suspense>
                      </AdminProtectedRoute>
                    } />

                    {/* Membership-Yaksa: 회원 관리 */}
                    <Route path="/admin/membership/dashboard" element={
                      <AdminProtectedRoute requiredPermissions={['membership:view']}>
                        <Suspense fallback={<PageLoader />}>
                          <MembershipDashboard />
                        </Suspense>
                      </AdminProtectedRoute>
                    } />
                    <Route path="/admin/membership/members" element={
                      <AdminProtectedRoute requiredPermissions={['membership:view', 'membership:manage']}>
                        <Suspense fallback={<PageLoader />}>
                          <MemberManagement />
                        </Suspense>
                      </AdminProtectedRoute>
                    } />
                    <Route path="/admin/membership/members/:id" element={
                      <AdminProtectedRoute requiredPermissions={['membership:view']}>
                        <Suspense fallback={<PageLoader />}>
                          <MemberDetail />
                        </Suspense>
                      </AdminProtectedRoute>
                    } />
                    <Route path="/admin/membership/verifications" element={
                      <AdminProtectedRoute requiredPermissions={['membership:verify']}>
                        <Suspense fallback={<PageLoader />}>
                          <VerificationManagement />
                        </Suspense>
                      </AdminProtectedRoute>
                    } />
                    <Route path="/admin/membership/categories" element={
                      <AdminProtectedRoute requiredPermissions={['membership:manage']}>
                        <Suspense fallback={<PageLoader />}>
                          <CategoryManagement />
                        </Suspense>
                      </AdminProtectedRoute>
                    } />
                    <Route path="/admin/membership/audit-logs" element={
                      <AdminProtectedRoute requiredPermissions={['membership:view']}>
                        <Suspense fallback={<PageLoader />}>
                          <AuditLogManagement />
                        </Suspense>
                      </AdminProtectedRoute>
                    } />
                    <Route path="/admin/membership/affiliations" element={
                      <AdminProtectedRoute requiredPermissions={['membership:manage']}>
                        <Suspense fallback={<PageLoader />}>
                          <AffiliationManagement />
                        </Suspense>
                      </AdminProtectedRoute>
                    } />

                    {/* Reporting-Yaksa: 신상신고 관리 */}
                    <Route path="/admin/reporting" element={
                      <AdminProtectedRoute requiredPermissions={['reporting:view']}>
                        <Suspense fallback={<PageLoader />}>
                          <ReportingDashboard />
                        </Suspense>
                      </AdminProtectedRoute>
                    } />
                    <Route path="/admin/reporting/dashboard" element={
                      <AdminProtectedRoute requiredPermissions={['reporting:view']}>
                        <Suspense fallback={<PageLoader />}>
                          <ReportingDashboard />
                        </Suspense>
                      </AdminProtectedRoute>
                    } />
                    <Route path="/admin/reporting/reports" element={
                      <AdminProtectedRoute requiredPermissions={['reporting:view', 'reporting:manage']}>
                        <Suspense fallback={<PageLoader />}>
                          <ReportList />
                        </Suspense>
                      </AdminProtectedRoute>
                    } />
                    <Route path="/admin/reporting/templates" element={
                      <AdminProtectedRoute requiredPermissions={['reporting:manage']}>
                        <Suspense fallback={<PageLoader />}>
                          <TemplateList />
                        </Suspense>
                      </AdminProtectedRoute>
                    } />

                    {/* 글 관리 */}
                    <Route path="/posts" element={
                      <AdminProtectedRoute requiredPermissions={['content:read']}>
                        <Suspense fallback={<PageLoader />}>
                          <Posts />
                        </Suspense>
                      </AdminProtectedRoute>
                    } />
                    
                    {/* 카테고리 & 태그 */}
                    <Route path="/posts/categories" element={
                      <AdminProtectedRoute requiredPermissions={['categories:read']}>
                        <Suspense fallback={<PageLoader />}>
                          <Categories />
                        </Suspense>
                      </AdminProtectedRoute>
                    } />
                    <Route path="/categories" element={
                      <AdminProtectedRoute requiredPermissions={['categories:read']}>
                        <Suspense fallback={<PageLoader />}>
                          <Categories />
                        </Suspense>
                      </AdminProtectedRoute>
                    } />
                    <Route path="/categories/new" element={
                      <AdminProtectedRoute requiredPermissions={['categories:write']}>
                        <Suspense fallback={<PageLoader />}>
                          <CategoryEdit />
                        </Suspense>
                      </AdminProtectedRoute>
                    } />
                    <Route path="/categories/edit/:id" element={
                      <AdminProtectedRoute requiredPermissions={['categories:write']}>
                        <Suspense fallback={<PageLoader />}>
                          <CategoryEdit />
                        </Suspense>
                      </AdminProtectedRoute>
                    } />
                    <Route path="/posts/tags" element={
                      <AdminProtectedRoute requiredPermissions={['categories:read']}>
                        <Suspense fallback={<PageLoader />}>
                          <Tags />
                        </Suspense>
                      </AdminProtectedRoute>
                    } />
                    
                    {/* 페이지 관리 */}
                    <Route path="/pages/*" element={
                      <AdminProtectedRoute requiredPermissions={['pages:read']}>
                        <Suspense fallback={<PageLoader />}>
                          <PagesRouter />
                        </Suspense>
                      </AdminProtectedRoute>
                    } />

                    {/* CMS V2 관리 (Phase C-2.5) */}
                    {/* CPT Routes */}
                    <Route path="/admin/cms/cpts" element={
                      <AdminProtectedRoute requiredRoles={['admin']}>
                        <Suspense fallback={<PageLoader />}>
                          <CMSCPTList />
                        </Suspense>
                      </AdminProtectedRoute>
                    } />
                    <Route path="/admin/cms/cpts/new" element={
                      <AdminProtectedRoute requiredRoles={['admin']}>
                        <Suspense fallback={<PageLoader />}>
                          <CMSCPTForm />
                        </Suspense>
                      </AdminProtectedRoute>
                    } />
                    <Route path="/admin/cms/cpts/:id/edit" element={
                      <AdminProtectedRoute requiredRoles={['admin']}>
                        <Suspense fallback={<PageLoader />}>
                          <CMSCPTForm />
                        </Suspense>
                      </AdminProtectedRoute>
                    } />

                    {/* Field Routes */}
                    <Route path="/admin/cms/fields" element={
                      <AdminProtectedRoute requiredRoles={['admin']}>
                        <Suspense fallback={<PageLoader />}>
                          <CMSFieldList />
                        </Suspense>
                      </AdminProtectedRoute>
                    } />
                    <Route path="/admin/cms/fields/new" element={
                      <AdminProtectedRoute requiredRoles={['admin']}>
                        <Suspense fallback={<PageLoader />}>
                          <CMSFieldForm />
                        </Suspense>
                      </AdminProtectedRoute>
                    } />
                    <Route path="/admin/cms/fields/:id/edit" element={
                      <AdminProtectedRoute requiredRoles={['admin']}>
                        <Suspense fallback={<PageLoader />}>
                          <CMSFieldForm />
                        </Suspense>
                      </AdminProtectedRoute>
                    } />

                    {/* View Routes */}
                    <Route path="/admin/cms/views" element={
                      <AdminProtectedRoute requiredRoles={['admin']}>
                        <Suspense fallback={<PageLoader />}>
                          <CMSViewList />
                        </Suspense>
                      </AdminProtectedRoute>
                    } />
                    <Route path="/admin/cms/views/new" element={
                      <AdminProtectedRoute requiredRoles={['admin']}>
                        <Suspense fallback={<PageLoader />}>
                          <CMSViewForm />
                        </Suspense>
                      </AdminProtectedRoute>
                    } />
                    <Route path="/admin/cms/views/:id/edit" element={
                      <AdminProtectedRoute requiredRoles={['admin']}>
                        <Suspense fallback={<PageLoader />}>
                          <CMSViewForm />
                        </Suspense>
                      </AdminProtectedRoute>
                    } />

                    {/* Visual Designer Route (Phase C-3) */}
                    <Route path="/admin/cms/views/:id/designer" element={
                      <AdminProtectedRoute requiredRoles={['admin']}>
                        <Suspense fallback={<PageLoader />}>
                          <ViewDesigner />
                        </Suspense>
                      </AdminProtectedRoute>
                    } />

                    {/* Page Routes */}
                    <Route path="/admin/cms/pages" element={
                      <AdminProtectedRoute requiredRoles={['admin']}>
                        <Suspense fallback={<PageLoader />}>
                          <CMSPageList />
                        </Suspense>
                      </AdminProtectedRoute>
                    } />
                    <Route path="/admin/cms/pages/new" element={
                      <AdminProtectedRoute requiredRoles={['admin']}>
                        <Suspense fallback={<PageLoader />}>
                          <CMSPageForm />
                        </Suspense>
                      </AdminProtectedRoute>
                    } />
                    <Route path="/admin/cms/pages/:id/edit" element={
                      <AdminProtectedRoute requiredRoles={['admin']}>
                        <Suspense fallback={<PageLoader />}>
                          <CMSPageForm />
                        </Suspense>
                      </AdminProtectedRoute>
                    } />

                    {/* 재사용 블록 관리 */}
                    <Route path="/reusable-blocks" element={
                      <AdminProtectedRoute requiredPermissions={['content:read']}>
                        <Suspense fallback={<PageLoader />}>
                          <div>Reusable Blocks - Coming Soon</div>
                        </Suspense>
                      </AdminProtectedRoute>
                    } />
                    
                    {/* 외모 관리 (WordPress Style) */}
                    <Route path="/appearance/theme" element={
                      <AdminProtectedRoute requiredPermissions={['settings:read']}>
                        <Suspense fallback={<PageLoader />}>
                          <SiteThemeSettings />
                        </Suspense>
                      </AdminProtectedRoute>
                    } />

                    <Route path="/appearance/settings" element={
                      <AdminProtectedRoute requiredPermissions={['settings:read']}>
                        <Suspense fallback={<PageLoader />}>
                          <GeneralSettings />
                        </Suspense>
                      </AdminProtectedRoute>
                    } />

                    <Route path="/appearance/header-builder" element={
                      <AdminProtectedRoute requiredPermissions={['templates:write']}>
                        <Suspense fallback={<PageLoader />}>
                          <HeaderBuilder />
                        </Suspense>
                      </AdminProtectedRoute>
                    } />

                    <Route path="/appearance/menus/*" element={
                      <AdminProtectedRoute requiredRoles={['admin']}>
                        <Suspense fallback={<PageLoader />}>
                          <NavigationMenus />
                        </Suspense>
                      </AdminProtectedRoute>
                    } />


                    {/* Appearance - Template Parts */}
                    <Route path="/appearance/template-parts" element={
                      <AdminProtectedRoute requiredPermissions={['templates:read']}>
                        <Suspense fallback={<PageLoader />}>
                          <TemplateParts />
                        </Suspense>
                      </AdminProtectedRoute>
                    } />
                    <Route path="/appearance/template-parts/new" element={
                      <AdminProtectedRoute requiredPermissions={['templates:write']}>
                        <Suspense fallback={<PageLoader />}>
                          <TemplatePartEditor />
                        </Suspense>
                      </AdminProtectedRoute>
                    } />
                    <Route path="/appearance/template-parts/:id/edit" element={
                      <AdminProtectedRoute requiredPermissions={['templates:write']}>
                        <Suspense fallback={<PageLoader />}>
                          <TemplatePartEditor />
                        </Suspense>
                      </AdminProtectedRoute>
                    } />
                    
                    {/* 미디어 관리 */}
                    <Route path="/media/*" element={
                      <AdminProtectedRoute requiredPermissions={['media:read']}>
                        <Suspense fallback={<PageLoader />}>
                          <MediaLibrary />
                        </Suspense>
                      </AdminProtectedRoute>
                    } />
                    
                    {/* E-commerce 관리 */}
                    
                    
                    
                    {/* 분석 */}
                    <Route path="/analytics/*" element={
                      <AdminProtectedRoute requiredPermissions={['analytics:read']}>
                        <Suspense fallback={<PageLoader />}>
                          <Analytics />
                        </Suspense>
                      </AdminProtectedRoute>
                    } />
                    
                    
                    {/* CPT Engine - New Unified Dashboard */}
                    <Route path="/cpt-engine/*" element={
                      <AdminProtectedRoute requiredPermissions={['content:read']}>
                        <Suspense fallback={<PageLoader />}>
                          <CPTEngine />
                        </Suspense>
                      </AdminProtectedRoute>
                    } />

                    {/* CPT Presets */}
                    <Route path="/cpt-engine/presets/forms" element={
                      <AdminProtectedRoute requiredPermissions={['content:read']}>
                        <Suspense fallback={<PageLoader />}>
                          <FormPresets />
                        </Suspense>
                      </AdminProtectedRoute>
                    } />
                    <Route path="/cpt-engine/presets/views" element={
                      <AdminProtectedRoute requiredPermissions={['content:read']}>
                        <Suspense fallback={<PageLoader />}>
                          <ViewPresets />
                        </Suspense>
                      </AdminProtectedRoute>
                    } />
                    <Route path="/cpt-engine/presets/templates" element={
                      <AdminProtectedRoute requiredPermissions={['content:read']}>
                        <Suspense fallback={<PageLoader />}>
                          <TemplatePresets />
                        </Suspense>
                      </AdminProtectedRoute>
                    } />

                    {/* CPT/ACF Archive & Forms */}
                    <Route path="/admin/cpt-acf/*" element={
                      <AdminProtectedRoute requiredPermissions={['content:read']}>
                        <Suspense fallback={<PageLoader />}>
                          <CPTACFRouter />
                        </Suspense>
                      </AdminProtectedRoute>
                    } />

                    {/* Dropshipping Routes - REMOVED (archived to legacy/packages/dropshipping-core) */}
                    {/* <Route path="/dropshipping/*" element={
                      <AdminProtectedRoute requiredRoles={['admin', 'super_admin']}>
                        <Suspense fallback={<PageLoader />}>
                          <DropshippingRouter />
                        </Suspense>
                      </AdminProtectedRoute>
                    } /> */}

                    {/* DS-4: Dropshipping Admin Routes (Order Relay & Settlement) */}
                    <Route path="/admin/dropshipping/order-relays" element={
                      <AdminProtectedRoute requiredRoles={['admin', 'super_admin']}>
                        <Suspense fallback={<PageLoader />}>
                          <DropshippingOrderRelayListPage />
                        </Suspense>
                      </AdminProtectedRoute>
                    } />
                    <Route path="/admin/dropshipping/order-relays/:id" element={
                      <AdminProtectedRoute requiredRoles={['admin', 'super_admin']}>
                        <Suspense fallback={<PageLoader />}>
                          <DropshippingOrderRelayDetailPage />
                        </Suspense>
                      </AdminProtectedRoute>
                    } />
                    <Route path="/admin/dropshipping/settlements" element={
                      <AdminProtectedRoute requiredRoles={['admin', 'super_admin']}>
                        <Suspense fallback={<PageLoader />}>
                          <DropshippingSettlementListPage />
                        </Suspense>
                      </AdminProtectedRoute>
                    } />
                    <Route path="/admin/dropshipping/settlements/:id" element={
                      <AdminProtectedRoute requiredRoles={['admin', 'super_admin']}>
                        <Suspense fallback={<PageLoader />}>
                          <DropshippingSettlementDetailPage />
                        </Suspense>
                      </AdminProtectedRoute>
                    } />

                    {/* Admin Order Management (Phase 4) */}
                    <Route path="/admin/orders" element={
                      <AdminProtectedRoute requiredPermissions={['content:read']}>
                        <Suspense fallback={<PageLoader />}>
                          <OrderListPage />
                        </Suspense>
                      </AdminProtectedRoute>
                    } />
                    <Route path="/admin/orders/:id" element={
                      <AdminProtectedRoute requiredPermissions={['content:read']}>
                        <Suspense fallback={<PageLoader />}>
                          <OrderDetailPage />
                        </Suspense>
                      </AdminProtectedRoute>
                    } />

                    {/* Groupbuy Management */}
                    <Route path="/admin/groupbuy" element={
                      <AdminProtectedRoute requiredPermissions={['content:read']}>
                        <Suspense fallback={<PageLoader />}>
                          <GroupbuyCampaignListPage />
                        </Suspense>
                      </AdminProtectedRoute>
                    } />
                    <Route path="/admin/groupbuy/settlement" element={
                      <AdminProtectedRoute requiredPermissions={['content:read']}>
                        <Suspense fallback={<PageLoader />}>
                          <GroupbuySettlementPage />
                        </Suspense>
                      </AdminProtectedRoute>
                    } />
                    <Route path="/admin/groupbuy/:id" element={
                      <AdminProtectedRoute requiredPermissions={['content:read']}>
                        <Suspense fallback={<PageLoader />}>
                          <GroupbuyCampaignDetailPage />
                        </Suspense>
                      </AdminProtectedRoute>
                    } />
                    <Route path="/admin/groupbuy/:id/participants" element={
                      <AdminProtectedRoute requiredPermissions={['content:read']}>
                        <Suspense fallback={<PageLoader />}>
                          <GroupbuyParticipantsPage />
                        </Suspense>
                      </AdminProtectedRoute>
                    } />

                    {/* CPT & ACF - Legacy Routes - Removed (replaced by CPT Engine) */}
                    
                    <Route path="/acf/*" element={
                      <AdminProtectedRoute requiredPermissions={['custom_fields:read']}>
                        <Suspense fallback={<PageLoader />}>
                          <CustomFields />
                        </Suspense>
                      </AdminProtectedRoute>
                    } />
                    
                    <Route path="/acf/groups" element={
                      <AdminProtectedRoute requiredPermissions={['custom_fields:read']}>
                        <Suspense fallback={<PageLoader />}>
                          <CustomFields />
                        </Suspense>
                      </AdminProtectedRoute>
                    } />
                    
                    {/* 메일 관리 */}
                    <Route path="/mail/*" element={
                      <AdminProtectedRoute requiredPermissions={['settings:read']}>
                        <Suspense fallback={<PageLoader />}>
                          <EmailSettings />
                        </Suspense>
                      </AdminProtectedRoute>
                    } />

                    {/* 도구 */}
                    <Route path="/tools" element={
                      <AdminProtectedRoute requiredPermissions={['tools:read']}>
                        <Suspense fallback={<PageLoader />}>
                          <ToolsPage />
                        </Suspense>
                      </AdminProtectedRoute>
                    } />
                    <Route path="/tools/media-replace" element={
                      <AdminProtectedRoute requiredPermissions={['tools:read']}>
                        <Suspense fallback={<PageLoader />}>
                          <FileReplaceTools />
                        </Suspense>
                      </AdminProtectedRoute>
                    } />

                    {/* 앱 장터 */}
                    <Route path="/apps/store" element={
                      <AdminProtectedRoute requiredRoles={['admin']}>
                        <Suspense fallback={<PageLoader />}>
                          <AppStorePage />
                        </Suspense>
                      </AdminProtectedRoute>
                    } />

                    {/* 설치된 앱 */}
                    <Route path="/admin/appstore/installed" element={
                      <AdminProtectedRoute requiredRoles={['admin']}>
                        <Suspense fallback={<PageLoader />}>
                          <AppStorePage defaultTab="installed" />
                        </Suspense>
                      </AdminProtectedRoute>
                    } />

                    {/* Site Builder - REMOVED (WO-ADMIN-LEGACY-CLEANUP-V2) */}

                    {/* 포럼 - App-based routes with AppRouteGuard */}
                    <Route path="/forum/boards" element={
                      <AdminProtectedRoute requiredPermissions={['forum:read']}>
                        <AppRouteGuard appId="forum">
                          <Suspense fallback={<PageLoader />}>
                            <ForumBoardList />
                          </Suspense>
                        </AppRouteGuard>
                      </AdminProtectedRoute>
                    } />
                    <Route path="/forum/categories" element={
                      <AdminProtectedRoute requiredPermissions={['forum:read']}>
                        <AppRouteGuard appId="forum">
                          <Suspense fallback={<PageLoader />}>
                            <ForumCategories />
                          </Suspense>
                        </AppRouteGuard>
                      </AdminProtectedRoute>
                    } />
                    <Route path="/forum/posts/:id" element={
                      <AdminProtectedRoute requiredPermissions={['forum:read']}>
                        <AppRouteGuard appId="forum">
                          <Suspense fallback={<PageLoader />}>
                            <ForumPostDetail />
                          </Suspense>
                        </AppRouteGuard>
                      </AdminProtectedRoute>
                    } />
                    <Route path="/forum/posts/new" element={
                      <AdminProtectedRoute requiredPermissions={['forum:write']}>
                        <AppRouteGuard appId="forum">
                          <Suspense fallback={<PageLoader />}>
                            <ForumPostForm />
                          </Suspense>
                        </AppRouteGuard>
                      </AdminProtectedRoute>
                    } />
                    <Route path="/forum/posts/:id/edit" element={
                      <AdminProtectedRoute requiredPermissions={['forum:write']}>
                        <AppRouteGuard appId="forum">
                          <Suspense fallback={<PageLoader />}>
                            <ForumPostForm />
                          </Suspense>
                        </AppRouteGuard>
                      </AdminProtectedRoute>
                    } />

                    {/* Yaksa Community - App-based routes with AppRouteGuard */}
                    <Route path="/yaksa/communities" element={
                      <AdminProtectedRoute requiredPermissions={['forum:read']}>
                        <AppRouteGuard appId="forum-yaksa">
                          <Suspense fallback={<PageLoader />}>
                            <YaksaCommunityList />
                          </Suspense>
                        </AppRouteGuard>
                      </AdminProtectedRoute>
                    } />
                    <Route path="/yaksa/communities/:id" element={
                      <AdminProtectedRoute requiredPermissions={['forum:read']}>
                        <AppRouteGuard appId="forum-yaksa">
                          <Suspense fallback={<PageLoader />}>
                            <YaksaCommunityDetail />
                          </Suspense>
                        </AppRouteGuard>
                      </AdminProtectedRoute>
                    } />
                    <Route path="/yaksa/communities/:id/feed" element={
                      <AdminProtectedRoute requiredPermissions={['forum:read']}>
                        <AppRouteGuard appId="forum-yaksa">
                          <Suspense fallback={<PageLoader />}>
                            <YaksaCommunityFeed />
                          </Suspense>
                        </AppRouteGuard>
                      </AdminProtectedRoute>
                    } />

                    {/* Pharmacy AI Insight - 약사 전용 AI 인사이트 (Phase 5) */}
                    <Route path="/pharmacy-ai-insight" element={
                      <AdminProtectedRoute requiredPermissions={['pharmacy-ai-insight.read']}>
                        <AppRouteGuard appId="pharmacy-ai-insight">
                          <Suspense fallback={<PageLoader />}>
                            <PharmacyAiInsightSummary />
                          </Suspense>
                        </AppRouteGuard>
                      </AdminProtectedRoute>
                    } />
                    <Route path="/pharmacy-ai-insight/summary" element={
                      <AdminProtectedRoute requiredPermissions={['pharmacy-ai-insight.read']}>
                        <AppRouteGuard appId="pharmacy-ai-insight">
                          <Suspense fallback={<PageLoader />}>
                            <PharmacyAiInsightSummary />
                          </Suspense>
                        </AppRouteGuard>
                      </AdminProtectedRoute>
                    } />

                    {/* CGM Pharmacist App - 약사용 CGM 환자 관리 (Phase 1 - Development) */}
                    <Route path="/cgm-pharmacist" element={
                      <AdminProtectedRoute requiredPermissions={['cgm-pharmacist.patients.read']}>
                        <AppRouteGuard appId="cgm-pharmacist-app">
                          <Suspense fallback={<PageLoader />}>
                            <CGMPatientListPage />
                          </Suspense>
                        </AppRouteGuard>
                      </AdminProtectedRoute>
                    } />
                    <Route path="/cgm-pharmacist/patients" element={
                      <AdminProtectedRoute requiredPermissions={['cgm-pharmacist.patients.read']}>
                        <AppRouteGuard appId="cgm-pharmacist-app">
                          <Suspense fallback={<PageLoader />}>
                            <CGMPatientListPage />
                          </Suspense>
                        </AppRouteGuard>
                      </AdminProtectedRoute>
                    } />
                    <Route path="/cgm-pharmacist/patients/:patientId" element={
                      <AdminProtectedRoute requiredPermissions={['cgm-pharmacist.patients.read']}>
                        <AppRouteGuard appId="cgm-pharmacist-app">
                          <Suspense fallback={<PageLoader />}>
                            <CGMPatientDetailPage />
                          </Suspense>
                        </AppRouteGuard>
                      </AdminProtectedRoute>
                    } />
                    <Route path="/cgm-pharmacist/patients/:patientId/coaching" element={
                      <AdminProtectedRoute requiredPermissions={['cgm-pharmacist.coaching.write']}>
                        <AppRouteGuard appId="cgm-pharmacist-app">
                          <Suspense fallback={<PageLoader />}>
                            <CGMCoachingPage />
                          </Suspense>
                        </AppRouteGuard>
                      </AdminProtectedRoute>
                    } />
                    <Route path="/cgm-pharmacist/alerts" element={
                      <AdminProtectedRoute requiredPermissions={['cgm-pharmacist.alerts.read']}>
                        <AppRouteGuard appId="cgm-pharmacist-app">
                          <Suspense fallback={<PageLoader />}>
                            <CGMAlertsPage />
                          </Suspense>
                        </AppRouteGuard>
                      </AdminProtectedRoute>
                    } />

                    {/* SellerOps - Seller Operations App */}
                    <Route path="/sellerops/*" element={
                      <AdminProtectedRoute requiredRoles={['seller', 'admin']}>
                        <AppRouteGuard appId="sellerops">
                          <Suspense fallback={<PageLoader />}>
                            <SellerOpsRouter />
                          </Suspense>
                        </AppRouteGuard>
                      </AdminProtectedRoute>
                    } />

                    {/* SupplierOps - Supplier Operations App */}
                    <Route path="/supplierops/*" element={
                      <AdminProtectedRoute requiredRoles={['supplier', 'admin']}>
                        <AppRouteGuard appId="supplierops">
                          <Suspense fallback={<PageLoader />}>
                            <SupplierOpsRouter />
                          </Suspense>
                        </AppRouteGuard>
                      </AdminProtectedRoute>
                    } />

                    {/* PartnerOps - Partner/Affiliate Operations App */}
                    <Route path="/partnerops/*" element={
                      <AdminProtectedRoute requiredRoles={['partner', 'admin']}>
                        <AppRouteGuard appId="partnerops">
                          <Suspense fallback={<PageLoader />}>
                            <PartnerOpsRouter />
                          </Suspense>
                        </AppRouteGuard>
                      </AdminProtectedRoute>
                    } />

                    {/* Cosmetics Partner Extension - Partner/Influencer for Cosmetics */}
                    <Route path="/cosmetics-partner/*" element={
                      <AdminProtectedRoute requiredRoles={['partner', 'admin']}>
                        <AppRouteGuard appId="cosmetics-partner-extension">
                          <Suspense fallback={<PageLoader />}>
                            <CosmeticsPartnerRouter />
                          </Suspense>
                        </AppRouteGuard>
                      </AdminProtectedRoute>
                    } />

                    {/* Cosmetics Products - Products/Brands Management (Phase 7-H) */}
                    <Route path="/cosmetics-products/*" element={
                      <AdminProtectedRoute requiredRoles={['admin']}>
                        <Suspense fallback={<PageLoader />}>
                          <CosmeticsProductsRouter />
                        </Suspense>
                      </AdminProtectedRoute>
                    } />

                    {/* Glycopharm - Pharmacy Blood Glucose Products (Phase B-3) */}
                    <Route path="/glycopharm/*" element={
                      <AdminProtectedRoute requiredRoles={['admin']}>
                        <Suspense fallback={<PageLoader />}>
                          <GlycopharmRouter />
                        </Suspense>
                      </AdminProtectedRoute>
                    } />

                    {/* GlucoseView - CGM Data View Configuration (Phase C-3) */}
                    <Route path="/glucoseview/*" element={
                      <AdminProtectedRoute requiredRoles={['admin']}>
                        <Suspense fallback={<PageLoader />}>
                          <GlucoseViewRouter />
                        </Suspense>
                      </AdminProtectedRoute>
                    } />

                    {/* Service Applications Admin (Phase C-4) */}
                    <Route path="/admin/service-applications/:service" element={
                      <AdminProtectedRoute requiredRoles={['admin', 'operator']}>
                        <Suspense fallback={<PageLoader />}>
                          <ServiceApplicationsPage />
                        </Suspense>
                      </AdminProtectedRoute>
                    } />
                    <Route path="/admin/service-applications/:service/:id" element={
                      <AdminProtectedRoute requiredRoles={['admin', 'operator']}>
                        <Suspense fallback={<PageLoader />}>
                          <ServiceApplicationDetailPage />
                        </Suspense>
                      </AdminProtectedRoute>
                    } />

                    {/* Neture - B2C Reference Service Management (Phase D-3) */}
                    <Route path="/neture/*" element={
                      <AdminProtectedRoute requiredRoles={['admin']}>
                        <Suspense fallback={<PageLoader />}>
                          <NetureRouter />
                        </Suspense>
                      </AdminProtectedRoute>
                    } />

                    {/* LMS-Yaksa - Pharmacist LMS Extension */}
                    <Route path="/admin/lms-yaksa/*" element={
                      <AdminProtectedRoute requiredPermissions={['lms-yaksa.license.read']}>
                        <AppRouteGuard appId="lms-yaksa">
                          <Suspense fallback={<PageLoader />}>
                            <LmsYaksaRouter />
                          </Suspense>
                        </AppRouteGuard>
                      </AdminProtectedRoute>
                    } />

                    {/* Yaksa Admin Hub - Integrated Dashboard (Phase 19-D) */}
                    <Route path="/admin/yaksa-hub" element={
                      <AdminProtectedRoute requiredPermissions={['yaksa-scheduler.job.read']}>
                        <AppRouteGuard appId="yaksa-scheduler">
                          <Suspense fallback={<PageLoader />}>
                            <YaksaAdminHub />
                          </Suspense>
                        </AppRouteGuard>
                      </AdminProtectedRoute>
                    } />

                    {/* Yaksa Admin - Phase 1 Approval & Overview UI */}
                    <Route path="/admin/yaksa" element={
                      <AdminProtectedRoute requiredPermissions={['yaksa-admin.access']}>
                        <Suspense fallback={<PageLoader />}>
                          <YaksaAdminDashboard />
                        </Suspense>
                      </AdminProtectedRoute>
                    } />
                    <Route path="/admin/yaksa/members" element={
                      <AdminProtectedRoute requiredPermissions={['yaksa-admin.members.approve']}>
                        <Suspense fallback={<PageLoader />}>
                          <MemberApprovalPage />
                        </Suspense>
                      </AdminProtectedRoute>
                    } />
                    <Route path="/admin/yaksa/reports" element={
                      <AdminProtectedRoute requiredPermissions={['yaksa-admin.reports.review']}>
                        <Suspense fallback={<PageLoader />}>
                          <ReportReviewPage />
                        </Suspense>
                      </AdminProtectedRoute>
                    } />
                    <Route path="/admin/yaksa/officers" element={
                      <AdminProtectedRoute requiredPermissions={['yaksa-admin.officers.assign']}>
                        <Suspense fallback={<PageLoader />}>
                          <OfficerManagePage />
                        </Suspense>
                      </AdminProtectedRoute>
                    } />
                    <Route path="/admin/yaksa/education" element={
                      <AdminProtectedRoute requiredPermissions={['yaksa-admin.education.view']}>
                        <Suspense fallback={<PageLoader />}>
                          <EducationOverviewPage />
                        </Suspense>
                      </AdminProtectedRoute>
                    } />
                    <Route path="/admin/yaksa/fees" element={
                      <AdminProtectedRoute requiredPermissions={['yaksa-admin.fees.view']}>
                        <Suspense fallback={<PageLoader />}>
                          <FeeOverviewPage />
                        </Suspense>
                      </AdminProtectedRoute>
                    } />
                    <Route path="/admin/yaksa/forum" element={
                      <AdminProtectedRoute requiredPermissions={['yaksa-admin.access']}>
                        <Navigate to="/forum/boards" replace />
                      </AdminProtectedRoute>
                    } />

                    {/* Yaksa Accounting - Phase 2 */}
                    <Route path="/admin/yaksa/accounting" element={
                      <AdminProtectedRoute requiredPermissions={['yaksa-admin.access']}>
                        <Suspense fallback={<PageLoader />}>
                          <AccountingDashboard />
                        </Suspense>
                      </AdminProtectedRoute>
                    } />
                    <Route path="/admin/yaksa/accounting/expenses" element={
                      <AdminProtectedRoute requiredPermissions={['yaksa-admin.access']}>
                        <Suspense fallback={<PageLoader />}>
                          <ExpenseListPage />
                        </Suspense>
                      </AdminProtectedRoute>
                    } />
                    <Route path="/admin/yaksa/accounting/close" element={
                      <AdminProtectedRoute requiredPermissions={['yaksa-admin.access']}>
                        <Suspense fallback={<PageLoader />}>
                          <ClosingPage />
                        </Suspense>
                      </AdminProtectedRoute>
                    } />
                    <Route path="/admin/yaksa/accounting/export" element={
                      <AdminProtectedRoute requiredPermissions={['yaksa-admin.access']}>
                        <Suspense fallback={<PageLoader />}>
                          <ExportPage />
                        </Suspense>
                      </AdminProtectedRoute>
                    } />

                    {/* LMS-Marketing - Publisher (Phase R10) */}
                    <Route path="/admin/marketing/publisher/*" element={
                      <AdminProtectedRoute requiredPermissions={['marketing.write']}>
                        <Suspense fallback={<PageLoader />}>
                          <MarketingPublisherRouter />
                        </Suspense>
                      </AdminProtectedRoute>
                    } />

                    {/* LMS-Marketing - Onboarding & Automation (Phase R11) */}
                    <Route path="/admin/marketing/onboarding" element={
                      <AdminProtectedRoute requiredPermissions={['marketing.read']}>
                        <Suspense fallback={<PageLoader />}>
                          <OnboardingHome />
                        </Suspense>
                      </AdminProtectedRoute>
                    } />
                    <Route path="/admin/marketing/onboarding/profile" element={
                      <AdminProtectedRoute requiredPermissions={['marketing.write']}>
                        <Suspense fallback={<PageLoader />}>
                          <SupplierProfileForm />
                        </Suspense>
                      </AdminProtectedRoute>
                    } />
                    <Route path="/admin/marketing/automation" element={
                      <AdminProtectedRoute requiredPermissions={['marketing.manage']}>
                        <Suspense fallback={<PageLoader />}>
                          <AutomationSettings />
                        </Suspense>
                      </AdminProtectedRoute>
                    } />

                    {/* Digital Signage Management (Phase 6) */}
                    <Route path="/admin/digital-signage/*" element={
                      <AdminProtectedRoute requiredRoles={['admin']}>
                        <Suspense fallback={<PageLoader />}>
                          <DigitalSignageRouter />
                        </Suspense>
                      </AdminProtectedRoute>
                    } />

                    {/* 설정 */}
                    <Route path="/settings/*" element={
                      <AdminProtectedRoute requiredPermissions={['settings:read']}>
                        <Suspense fallback={<PageLoader />}>
                          <Settings />
                        </Suspense>
                      </AdminProtectedRoute>
                    } />
                    
                    {/* Test routes removed for production */}
                    
                    {/* Gutenberg Editor - Using Standalone Full Screen Editor */}
                    <Route path="/gutenberg" element={
                      <AdminProtectedRoute requiredPermissions={['content:write']}>
                        <Suspense fallback={<PageLoader />}>
                          <EditorRouteWrapper mode="post" />
                        </Suspense>
                      </AdminProtectedRoute>
                    } />
                    
                    {/* UI Showcase */}
                    <Route path="/ui-showcase" element={
                      <AdminProtectedRoute requiredPermissions={['admin']}>
                        <Suspense fallback={<PageLoader />}>
                          <UIShowcase />
                        </Suspense>
                      </AdminProtectedRoute>
                    } />

                    {/* Test - Minimal Editor (inside AdminLayout, requires login) */}
                    <Route path="/admin/test/minimal-editor" element={
                      <Suspense fallback={<PageLoader />}>
                        <EditorTest />
                      </Suspense>
                    } />
                    {/* Test - AI Page Generator */}
                    <Route path="/admin/test/ai-page-generator-test" element={
                      <Suspense fallback={<PageLoader />}>
                        <AIPageGeneratorTest />
                      </Suspense>
                    } />
                    {/* Test - Focus Restoration */}
                    <Route path="/admin/test/focus-restoration" element={
                      <Suspense fallback={<PageLoader />}>
                        <FocusRestorationTest />
                      </Suspense>
                    } />
                    {/* Test - AI Block Debug */}
                    <Route path="/admin/test/ai-block-debug" element={
                      <Suspense fallback={<PageLoader />}>
                        <AIBlockDebug />
                      </Suspense>
                    } />
                    {/* Test - Seed Presets */}
                    <Route path="/admin/test/seed-presets" element={
                      <Suspense fallback={<PageLoader />}>
                        <SeedPresets />
                      </Suspense>
                    } />
                    {/* Test - Preset Integration */}
                    <Route path="/admin/test/preset-integration" element={
                      <Suspense fallback={<PageLoader />}>
                        <PresetIntegrationTest />
                      </Suspense>
                    } />
                    {/* Test - Delete Customizer */}
                    <Route path="/admin/test/delete-customizer" element={
                      <Suspense fallback={<PageLoader />}>
                        <DeleteCustomizerTest />
                      </Suspense>
                    } />
                    {/* Test - Auth Debug */}
                    <Route path="/admin/test/auth-debug" element={
                      <Suspense fallback={<PageLoader />}>
                        <AuthDebug />
                      </Suspense>
                    } />
                    {/* Test - Dropshipping Users */}
                    <Route path="/admin/test/dropshipping-users" element={
                      <Suspense fallback={<PageLoader />}>
                        <DropshippingUsersTest />
                      </Suspense>
                    } />
                    {/* Test - User Edit */}
                    <Route path="/admin/test/user-edit" element={
                      <Suspense fallback={<PageLoader />}>
                        <UserEditTest />
                      </Suspense>
                    } />
                    {/* Test - API Response Checker */}
                    <Route path="/test/api-response-checker" element={
                      <Suspense fallback={<PageLoader />}>
                        <ApiResponseChecker />
                      </Suspense>
                    } />
                    <Route path="/test/menu-debug" element={
                      <Suspense fallback={<PageLoader />}>
                        <MenuDebug />
                      </Suspense>
                    } />
                    {/* Test - Site Builder - REMOVED (WO-ADMIN-LEGACY-CLEANUP-V2) */}
                    {/* Test - CMS Fields Debug */}
                    <Route path="/admin/test/cms-fields" element={
                      <Suspense fallback={<PageLoader />}>
                        <CMSFieldsDebug />
                      </Suspense>
                    } />
                    {/* Test - CMS View Create */}
                    <Route path="/admin/test/cms-view-test" element={
                      <Suspense fallback={<PageLoader />}>
                        <CMSViewCreateTest />
                      </Suspense>
                    } />
                    {/* Test - CMS View List Debug */}
                    <Route path="/admin/test/cms-view-list-debug" element={
                      <Suspense fallback={<PageLoader />}>
                        <CMSViewListDebug />
                      </Suspense>
                    } />


                    {/* System Monitoring */}
                    <Route path="/monitoring" element={
                      <AdminProtectedRoute requiredPermissions={['admin']}>
                        <Suspense fallback={<PageLoader />}>
                          <IntegratedMonitoring />
                        </Suspense>
                      </AdminProtectedRoute>
                    } />
                    
                    <Route path="/monitoring/performance" element={
                      <AdminProtectedRoute requiredPermissions={['admin']}>
                        <Suspense fallback={<PageLoader />}>
                          <PerformanceDashboard />
                        </Suspense>
                      </AdminProtectedRoute>
                    } />
                    
                    <Route path="/monitoring/security" element={
                      <AdminProtectedRoute requiredPermissions={['admin']}>
                        <Suspense fallback={<PageLoader />}>
                          <IntegratedMonitoring />
                        </Suspense>
                      </AdminProtectedRoute>
                    } />

                    {/* Phase 2.4 - Operations Dashboard */}
                    <Route path="/admin/dashboard/operations" element={
                      <AdminProtectedRoute requiredPermissions={['admin']}>
                        <Suspense fallback={<PageLoader />}>
                          <OperationsDashboard />
                        </Suspense>
                      </AdminProtectedRoute>
                    } />

                    {/* Phase 9 Task 3 - Service Monitoring Dashboard */}
                    <Route path="/admin/services/overview" element={
                      <AdminProtectedRoute requiredRoles={['admin', 'super_admin']}>
                        <Suspense fallback={<PageLoader />}>
                          <ServiceOverview />
                        </Suspense>
                      </AdminProtectedRoute>
                    } />
                    <Route path="/admin/services" element={
                      <AdminProtectedRoute requiredRoles={['admin', 'super_admin']}>
                        <Suspense fallback={<PageLoader />}>
                          <ServiceOverview />
                        </Suspense>
                      </AdminProtectedRoute>
                    } />

                    {/* 404 핸들링 */}
                    <Route path="*" element={<Navigate to="/" replace />} />
                  </Routes>
                </AdminLayout>
              </AdminProtectedRoute>
            } />
        </Routes>
      </SessionManager>
    </AuthProvider>
        </ToastProvider>
    </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;

// Deployment trigger: 2025-08-21 20:45 UTC - Trigger after PM2 cleanup on webserver

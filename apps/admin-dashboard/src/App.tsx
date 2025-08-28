import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, AdminProtectedRoute, SessionManager } from '@o4o/auth-context';
import { AuthClient } from '@o4o/auth-client';
import toast from 'react-hot-toast';
import { useEffect, Suspense, lazy } from 'react';
import ErrorBoundary from '@/components/ErrorBoundary';
import AppGuard from '@/components/AppGuard';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { useAuthStore } from '@/stores/authStore';
import '@/styles/wordpress-theme.css';
import '@/styles/wordpress-sidebar.css';

// Layout Components
import AdminLayout from '@/components/layout/AdminLayout';
import EditorLayout from '@/layouts/EditorLayout';
import InitialRedirect from '@/components/InitialRedirect';

// Page Components - Lazy loaded
const Login = lazy(() => import('@/pages/auth/Login'));
const ForgotPassword = lazy(() => import('@/pages/auth/ForgotPassword'));
const ResetPassword = lazy(() => import('@/pages/auth/ResetPassword'));
const AdminHome = lazy(() => import('@/pages/AdminHome'));
const WordPressDashboard = lazy(() => import('@/pages/WordPressDashboard'));
// const Dashboard = lazy(() => import('@/pages/dashboard/Dashboard')); // Not used
const DashboardSimple = lazy(() => import('@/pages/dashboard/DashboardSimple'));
const UsersPage = lazy(() => import('@/pages/users'));
const UserForm = lazy(() => import('@/pages/users/UserForm'));
const UserDetail = lazy(() => import('@/pages/users/UserDetail'));
const Content = lazy(() => import(/* webpackChunkName: "content" */ '@/pages/content/Content'));
const Products = lazy(() => import('@/pages/ecommerce/Products'));
const Orders = lazy(() => import('@/pages/ecommerce/Orders'));
const OrderDetail = lazy(() => import('@/pages/ecommerce/OrderDetail'));
const OrderStatusManagement = lazy(() => import('@/pages/ecommerce/OrderStatusManagement'));
const InventoryManagement = lazy(() => import('@/pages/ecommerce/InventoryManagement'));
const TossPaymentsSettings = lazy(() => import('@/pages/ecommerce/TossPaymentsSettings'));
const RefundManagement = lazy(() => import('@/pages/ecommerce/RefundManagement'));
const Coupons = lazy(() => import('@/pages/ecommerce/Coupons'));
const CouponForm = lazy(() => import('@/pages/ecommerce/CouponForm'));
const EcommerceSettings = lazy(() => import('@/pages/ecommerce/EcommerceSettings'));
// const SettlementDashboard = lazy(() => import('@/pages/ecommerce/SettlementDashboard'));
const VendorSettlements = lazy(() => import('@/pages/ecommerce/VendorSettlements'));
const FeeManagement = lazy(() => import('@/pages/ecommerce/FeeManagement'));
// const SettlementReports = lazy(() => import('@/pages/ecommerce/SettlementReports'));
const Analytics = lazy(() => import('@/pages/analytics/Analytics'));
const Settings = lazy(() => import('@/pages/settings/Settings'));
const MailManagement = lazy(() => import('@/pages/mail/MailManagement'));
const PagesRouter = lazy(() => import('@/pages/pages/PagesRouter'));
const Media = lazy(() => import('@/pages/media/Media'));
const CustomFields = lazy(() => import('@/pages/custom-fields/CustomFields'));
const ReusableBlocksPage = lazy(() => 
  import(/* webpackChunkName: "reusable-blocks" */ '@/pages/content/ReusableBlocksPage')
);
const Categories = lazy(() => import('@/pages/categories/Categories'));
const Tags = lazy(() => import('@/pages/posts/Tags'));
const HomepageEditor = lazy(() => 
  import(/* webpackChunkName: "homepage-editor" */ '@/pages/templates/HomepageEditor')
);
const Shortcodes = lazy(() => import('@/pages/documentation/Shortcodes'));
const ProductForm = lazy(() => import('@/pages/ecommerce/ProductForm'));
const ProductCategories = lazy(() => import('@/pages/ecommerce/ProductCategories'));
const Menus = lazy(() => import('@/pages/menus/Menus'));
const TestPage = lazy(() => import('@/pages/test/TestPage'));
// const SystemMonitoring = lazy(() => import('@/pages/monitoring/SystemMonitoring'));

// Appearance Pages
const TemplateParts = lazy(() => import('@/pages/appearance/TemplateParts'));
const TemplatePartEditor = lazy(() => import(/* webpackChunkName: "template-editor" */ '@/pages/appearance/TemplatePartEditor'));
const IntegratedMonitoring = lazy(() => import('@/pages/monitoring/IntegratedMonitoring'));
const PerformanceDashboard = lazy(() => import('@/pages/monitoring/PerformanceDashboard'));
// const WidgetManager = lazy(() => import('@/pages/content/WidgetManager')); // Loaded via Content router

// Vendor Management Pages
const VendorsList = lazy(() => import('@/pages/vendors/VendorsList'));
const VendorsPending = lazy(() => import('@/pages/vendors/VendorsPending'));
const VendorsCommission = lazy(() => import('@/pages/vendors/VendorsCommission'));
const VendorsReports = lazy(() => import('@/pages/vendors/VendorsReports'));

// Affiliate Management Pages
const AffiliatePartners = lazy(() => import('@/pages/affiliate/AffiliatePartners'));
const AffiliatePartnerForm = lazy(() => import('@/pages/affiliate/AffiliatePartnerForm'));
const AffiliateLinks = lazy(() => import('@/pages/affiliate/AffiliateLinks'));
const AffiliateCommission = lazy(() => import('@/pages/affiliate/AffiliateCommission'));
const AffiliateAnalytics = lazy(() => import('@/pages/affiliate/AffiliateAnalytics'));

// App Pages
const ForumApp = lazy(() => import('@/pages/apps/ForumApp'));
const SignageApp = lazy(() => import('@/pages/apps/SignageApp'));
const CrowdfundingApp = lazy(() => import('@/pages/apps/CrowdfundingApp'));
const CrowdfundingProjects = lazy(() => import('@/pages/apps/CrowdfundingProjects'));
const CrowdfundingProjectDetail = lazy(() => import('@/pages/apps/CrowdfundingProjectDetail'));
const CrowdfundingProjectForm = lazy(() => import('@/pages/apps/CrowdfundingProjectForm'));
const ToolsPage = lazy(() => import('@/pages/ToolsPage'));

// User Management Pages
const RolePermissions = lazy(() => import('@/pages/users/RolePermissions'));

// UI Showcase
const UIShowcase = lazy(() => import('@/pages/UIShowcase'));
const GutenbergPage = lazy(() => 
  import(/* webpackChunkName: "gutenberg" */ '@/pages/test/GutenbergPageWrapped')
);
const StandaloneEditor = lazy(() => 
  import(/* webpackChunkName: "standalone-editor" */ '@/pages/editor/StandaloneEditor')
);
const LoopBlockTest = lazy(() => import('@/pages/test/LoopBlockTest'));
const ParagraphTestDemo = lazy(() => import('@/components/editor/blocks/test/ParagraphTestDemo'));

// Apps Manager
const AppsManager = lazy(() => import('@/pages/apps/AppsManagerV2'));
const AppSettings = lazy(() => import('@/pages/apps/AppSettings'));

// Theme Pages
const ThemeMarketplace = lazy(() => import('@/pages/themes/ThemeMarketplace'));
const ThemeEditor = lazy(() => 
  import(/* webpackChunkName: "theme-editor" */ '@/pages/themes/ThemeEditor')
);
const ThemePreview = lazy(() => import('@/pages/themes/ThemePreview'));

// Plugin Management
const WordPressPluginManager = lazy(() => import('@/pages/apps/WordPressPluginManager'));

// Shortcode Management
const ShortcodeManagement = lazy(() => import('@/pages/shortcodes/ShortcodeManagement'));

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
  const checkSSOSession = useAuthStore(state => state.checkSSOSession);
  
  // Initialize SSO on app start
  useEffect(() => {
    // 앱 시작 시 즉시 토큰 복원 시도
    const initializeAuth = async () => {
      try {
        // 먼저 저장된 인증 정보로 상태 복원
        await checkSSOSession();
      } catch (error) {
        // SSO session check failed - clear local storage only if it's a 401 error
        if ((error as any)?.response?.status === 401) {
          localStorage.removeItem('admin-auth-storage');
          localStorage.removeItem('authToken');
          localStorage.removeItem('accessToken');
        }
      }
    };

    // 즉시 초기화 실행
    initializeAuth();
    
    // SSO 세션 모니터링 비활성화 (SSO 엔드포인트가 구현되지 않음)
    // TODO: SSO 엔드포인트 구현 후 활성화
    // ssoService.startSessionCheck((isAuthenticated) => {
    //   if (!isAuthenticated) {
    //     toast.error('Session expired. Please log in again.');
    //     checkSSOSession();
    //   }
    // });
    
    return () => {
      // ssoService.stopSessionCheck();
    };
  }, [checkSSOSession]);
  
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
      <ThemeProvider>
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
            
            {/* 루트 경로 - 인증 상태에 따라 리다이렉트 */}
            <Route path="/" element={<InitialRedirect />} />
            
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
                        <StandaloneEditor mode="post" />
                      </Suspense>
                    } />
                    <Route path="posts/:id" element={
                      <Suspense fallback={<PageLoader />}>
                        <StandaloneEditor mode="post" />
                      </Suspense>
                    } />
                    <Route path="pages/new" element={
                      <Suspense fallback={<PageLoader />}>
                        <StandaloneEditor mode="page" />
                      </Suspense>
                    } />
                    <Route path="pages/:id" element={
                      <Suspense fallback={<PageLoader />}>
                        <StandaloneEditor mode="page" />
                      </Suspense>
                    } />
                    <Route path="templates/:id" element={
                      <Suspense fallback={<PageLoader />}>
                        <StandaloneEditor mode="template" />
                      </Suspense>
                    } />
                    <Route path="patterns/:id" element={
                      <Suspense fallback={<PageLoader />}>
                        <StandaloneEditor mode="pattern" />
                      </Suspense>
                    } />
                  </Routes>
                </EditorLayout>
              </AdminProtectedRoute>
            } />
            
            {/* 보호된 관리자 라우트들 */}
            <Route path="/*" element={
              <AdminProtectedRoute 
                requiredRoles={['admin']}
                showContactAdmin={true}
              >
                <AdminLayout>
                  <Routes>
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
                    
                    <Route path="/users/profile" element={
                      <AdminProtectedRoute requiredPermissions={['users:read']}>
                        <Suspense fallback={<PageLoader />}>
                          <UserDetail />
                        </Suspense>
                      </AdminProtectedRoute>
                    } />
                    
                    <Route path="/users/roles" element={
                      <AdminProtectedRoute requiredPermissions={['users:update']}>
                        <Suspense fallback={<PageLoader />}>
                          <RolePermissions />
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
                    
                    {/* 글 관리 */}
                    <Route path="/posts/*" element={
                      <AdminProtectedRoute requiredPermissions={['content:read']}>
                        <Suspense fallback={<PageLoader />}>
                          <Content />
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
                    
                    {/* 재사용 블록 관리 */}
                    <Route path="/reusable-blocks" element={
                      <AdminProtectedRoute requiredPermissions={['content:read']}>
                        <Suspense fallback={<PageLoader />}>
                          <ReusableBlocksPage />
                        </Suspense>
                      </AdminProtectedRoute>
                    } />
                    
                    {/* 테마 관리 */}
                    <Route path="/themes/*" element={
                      <AdminProtectedRoute requiredPermissions={['templates:write']}>
                        <Suspense fallback={<PageLoader />}>
                          <HomepageEditor />
                        </Suspense>
                      </AdminProtectedRoute>
                    } />
                    
                    <Route path="/themes/customize" element={
                      <AdminProtectedRoute requiredPermissions={['templates:write']}>
                        <Suspense fallback={<PageLoader />}>
                          <HomepageEditor />
                        </Suspense>
                      </AdminProtectedRoute>
                    } />
                    
                    <Route path="/themes/homepage" element={
                      <AdminProtectedRoute requiredPermissions={['templates:write']}>
                        <Suspense fallback={<PageLoader />}>
                          <HomepageEditor />
                        </Suspense>
                      </AdminProtectedRoute>
                    } />
                    
                    <Route path="/themes/menus/*" element={
                      <AdminProtectedRoute requiredPermissions={['menus:read']}>
                        <Suspense fallback={<PageLoader />}>
                          <Menus />
                        </Suspense>
                      </AdminProtectedRoute>
                    } />
                    
                    <Route path="/themes/marketplace" element={
                      <AdminProtectedRoute requiredPermissions={['templates:read']}>
                        <Suspense fallback={<PageLoader />}>
                          <ThemeMarketplace />
                        </Suspense>
                      </AdminProtectedRoute>
                    } />
                    
                    {/* 플러그인 관리 */}
                    <Route path="/plugins" element={
                      <AdminProtectedRoute requiredPermissions={['apps:manage']}>
                        <Suspense fallback={<PageLoader />}>
                          <WordPressPluginManager />
                        </Suspense>
                      </AdminProtectedRoute>
                    } />
                    
                    <Route path="/plugins/add" element={
                      <AdminProtectedRoute requiredPermissions={['apps:manage']}>
                        <Suspense fallback={<PageLoader />}>
                          <WordPressPluginManager />
                        </Suspense>
                      </AdminProtectedRoute>
                    } />
                    
                    <Route path="/themes/:id/editor" element={
                      <AdminProtectedRoute requiredPermissions={['templates:write']}>
                        <Suspense fallback={<PageLoader />}>
                          <ThemeEditor />
                        </Suspense>
                      </AdminProtectedRoute>
                    } />
                    
                    <Route path="/themes/:id/preview" element={
                      <AdminProtectedRoute requiredPermissions={['templates:read']}>
                        <Suspense fallback={<PageLoader />}>
                          <ThemePreview />
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
                          <Media />
                        </Suspense>
                      </AdminProtectedRoute>
                    } />
                    
                    {/* E-commerce 관리 */}
                    <Route path="/ecommerce" element={
                      <AdminProtectedRoute requiredPermissions={['products:read']}>
                        <Suspense fallback={<PageLoader />}>
                          <DashboardSimple />
                        </Suspense>
                      </AdminProtectedRoute>
                    } />
                    
                    <Route path="/ecommerce/products" element={
                      <AdminProtectedRoute requiredPermissions={['products:read']}>
                        <Suspense fallback={<PageLoader />}>
                          <Products />
                        </Suspense>
                      </AdminProtectedRoute>
                    } />
                    
                    <Route path="/ecommerce/categories" element={
                      <AdminProtectedRoute requiredPermissions={['products:write']}>
                        <Suspense fallback={<PageLoader />}>
                          <ProductCategories />
                        </Suspense>
                      </AdminProtectedRoute>
                    } />
                    
                    <Route path="/ecommerce/products/new" element={
                      <AdminProtectedRoute requiredPermissions={['products:write']}>
                        <Suspense fallback={<PageLoader />}>
                          <ProductForm />
                        </Suspense>
                      </AdminProtectedRoute>
                    } />
                    
                    <Route path="/ecommerce/products/:id/edit" element={
                      <AdminProtectedRoute requiredPermissions={['products:write']}>
                        <Suspense fallback={<PageLoader />}>
                          <ProductForm />
                        </Suspense>
                      </AdminProtectedRoute>
                    } />
                    
                    <Route path="/ecommerce/orders" element={
                      <AdminProtectedRoute requiredPermissions={['orders:read']}>
                        <Suspense fallback={<PageLoader />}>
                          <Orders />
                        </Suspense>
                      </AdminProtectedRoute>
                    } />
                    <Route path="/ecommerce/orders/:id" element={
                      <AdminProtectedRoute requiredPermissions={['orders:read']}>
                        <Suspense fallback={<PageLoader />}>
                          <OrderDetail />
                        </Suspense>
                      </AdminProtectedRoute>
                    } />
                    
                    <Route path="/ecommerce/order-status" element={
                      <AdminProtectedRoute requiredPermissions={['orders:write']}>
                        <Suspense fallback={<PageLoader />}>
                          <OrderStatusManagement />
                        </Suspense>
                      </AdminProtectedRoute>
                    } />
                    
                    <Route path="/ecommerce/inventory" element={
                      <AdminProtectedRoute requiredPermissions={['products:write']}>
                        <Suspense fallback={<PageLoader />}>
                          <InventoryManagement />
                        </Suspense>
                      </AdminProtectedRoute>
                    } />
                    
                    <Route path="/ecommerce/coupons" element={
                      <AdminProtectedRoute requiredPermissions={['products:write']}>
                        <Suspense fallback={<PageLoader />}>
                          <Coupons />
                        </Suspense>
                      </AdminProtectedRoute>
                    } />
                    <Route path="/ecommerce/coupons/new" element={
                      <AdminProtectedRoute requiredPermissions={['products:write']}>
                        <Suspense fallback={<PageLoader />}>
                          <CouponForm />
                        </Suspense>
                      </AdminProtectedRoute>
                    } />
                    <Route path="/ecommerce/coupons/:id/edit" element={
                      <AdminProtectedRoute requiredPermissions={['products:write']}>
                        <Suspense fallback={<PageLoader />}>
                          <CouponForm />
                        </Suspense>
                      </AdminProtectedRoute>
                    } />
                    
                    <Route path="/ecommerce/payments/toss" element={
                      <AdminProtectedRoute requiredPermissions={['settings:write']}>
                        <Suspense fallback={<PageLoader />}>
                          <TossPaymentsSettings />
                        </Suspense>
                      </AdminProtectedRoute>
                    } />
                    
                    <Route path="/ecommerce/refunds" element={
                      <AdminProtectedRoute requiredPermissions={['orders:write']}>
                        <Suspense fallback={<PageLoader />}>
                          <RefundManagement />
                        </Suspense>
                      </AdminProtectedRoute>
                    } />
                    
                    <Route path="/ecommerce/settlements" element={
                      <AdminProtectedRoute requiredPermissions={['analytics:read']}>
                        <Suspense fallback={<PageLoader />}>
                          {/* <SettlementDashboard /> */}
                          <div>정산 대시보드는 준비 중입니다.</div>
                        </Suspense>
                      </AdminProtectedRoute>
                    } />
                    
                    <Route path="/ecommerce/vendor-settlements" element={
                      <AdminProtectedRoute requiredPermissions={['vendors:write']}>
                        <Suspense fallback={<PageLoader />}>
                          <VendorSettlements />
                        </Suspense>
                      </AdminProtectedRoute>
                    } />
                    
                    <Route path="/ecommerce/fee-management" element={
                      <AdminProtectedRoute requiredPermissions={['settings:write']}>
                        <Suspense fallback={<PageLoader />}>
                          <FeeManagement />
                        </Suspense>
                      </AdminProtectedRoute>
                    } />
                    
                    <Route path="/ecommerce/settlement-reports" element={
                      <AdminProtectedRoute requiredPermissions={['analytics:read']}>
                        <Suspense fallback={<PageLoader />}>
                          {/* <SettlementReports /> */}
                          <div>정산 리포트는 준비 중입니다.</div>
                        </Suspense>
                      </AdminProtectedRoute>
                    } />
                    
                    <Route path="/ecommerce/reports" element={
                      <AdminProtectedRoute requiredPermissions={['analytics:read']}>
                        <Suspense fallback={<PageLoader />}>
                          <Analytics />
                        </Suspense>
                      </AdminProtectedRoute>
                    } />
                    
                    <Route path="/ecommerce/settings" element={
                      <AdminProtectedRoute requiredPermissions={['settings:write']}>
                        <Suspense fallback={<PageLoader />}>
                          <EcommerceSettings />
                        </Suspense>
                      </AdminProtectedRoute>
                    } />
                    
                    {/* 분석 */}
                    <Route path="/analytics/*" element={
                      <AdminProtectedRoute requiredPermissions={['analytics:read']}>
                        <Suspense fallback={<PageLoader />}>
                          <Analytics />
                        </Suspense>
                      </AdminProtectedRoute>
                    } />
                    
                    {/* 판매자/공급자 관리 */}
                    <Route path="/vendors" element={
                      <AdminProtectedRoute requiredPermissions={['vendors:read']}>
                        <Suspense fallback={<PageLoader />}>
                          <VendorsList />
                        </Suspense>
                      </AdminProtectedRoute>
                    } />
                    <Route path="/vendors/pending" element={
                      <AdminProtectedRoute requiredPermissions={['vendors:write']}>
                        <Suspense fallback={<PageLoader />}>
                          <VendorsPending />
                        </Suspense>
                      </AdminProtectedRoute>
                    } />
                    <Route path="/vendors/commission" element={
                      <AdminProtectedRoute requiredPermissions={['vendors:write']}>
                        <Suspense fallback={<PageLoader />}>
                          <VendorsCommission />
                        </Suspense>
                      </AdminProtectedRoute>
                    } />
                    <Route path="/vendors/reports" element={
                      <AdminProtectedRoute requiredPermissions={['vendors:read']}>
                        <Suspense fallback={<PageLoader />}>
                          <VendorsReports />
                        </Suspense>
                      </AdminProtectedRoute>
                    } />
                    
                    {/* 제휴 마케팅 - App Guard 적용 */}
                    <Route path="/affiliate/partners" element={
                      <AdminProtectedRoute requiredPermissions={['affiliate:read']}>
                        <AppGuard appName="affiliate">
                          <Suspense fallback={<PageLoader />}>
                            <AffiliatePartners />
                          </Suspense>
                        </AppGuard>
                      </AdminProtectedRoute>
                    } />
                    <Route path="/affiliate/partners/new" element={
                      <AdminProtectedRoute requiredPermissions={['affiliate:write']}>
                        <AppGuard appName="affiliate">
                          <Suspense fallback={<PageLoader />}>
                            <AffiliatePartnerForm />
                          </Suspense>
                        </AppGuard>
                      </AdminProtectedRoute>
                    } />
                    <Route path="/affiliate/partners/:id/edit" element={
                      <AdminProtectedRoute requiredPermissions={['affiliate:write']}>
                        <AppGuard appName="affiliate">
                          <Suspense fallback={<PageLoader />}>
                            <AffiliatePartnerForm />
                          </Suspense>
                        </AppGuard>
                      </AdminProtectedRoute>
                    } />
                    <Route path="/affiliate/links" element={
                      <AdminProtectedRoute requiredPermissions={['affiliate:read']}>
                        <AppGuard appName="affiliate">
                          <Suspense fallback={<PageLoader />}>
                            <AffiliateLinks />
                          </Suspense>
                        </AppGuard>
                      </AdminProtectedRoute>
                    } />
                    <Route path="/affiliate/commission" element={
                      <AdminProtectedRoute requiredPermissions={['affiliate:write']}>
                        <AppGuard appName="affiliate">
                          <Suspense fallback={<PageLoader />}>
                            <AffiliateCommission />
                          </Suspense>
                        </AppGuard>
                      </AdminProtectedRoute>
                    } />
                    <Route path="/affiliate/analytics" element={
                      <AdminProtectedRoute requiredPermissions={['affiliate:read']}>
                        <AppGuard appName="affiliate">
                          <Suspense fallback={<PageLoader />}>
                            <AffiliateAnalytics />
                          </Suspense>
                        </AppGuard>
                      </AdminProtectedRoute>
                    } />
                    
                    {/* CPT & ACF */}
                    <Route path="/cpt/*" element={
                      <AdminProtectedRoute requiredPermissions={['content:read']}>
                        <Suspense fallback={<PageLoader />}>
                          <Content />
                        </Suspense>
                      </AdminProtectedRoute>
                    } />
                    
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
                          <MailManagement />
                        </Suspense>
                      </AdminProtectedRoute>
                    } />
                    
                    {/* Forum, Signage, Crowdfunding - App Guard 적용 */}
                    <Route path="/forum/*" element={
                      <AdminProtectedRoute requiredPermissions={['forum:read']}>
                        <AppGuard appName="forum">
                          <Suspense fallback={<PageLoader />}>
                            <ForumApp />
                          </Suspense>
                        </AppGuard>
                      </AdminProtectedRoute>
                    } />
                    
                    <Route path="/signage/*" element={
                      <AdminProtectedRoute requiredPermissions={['signage:read']}>
                        <AppGuard appName="signage">
                          <Suspense fallback={<PageLoader />}>
                            <SignageApp />
                          </Suspense>
                        </AppGuard>
                      </AdminProtectedRoute>
                    } />
                    
                    <Route path="/crowdfunding/*" element={
                      <AdminProtectedRoute requiredPermissions={['crowdfunding:read']}>
                        <AppGuard appName="crowdfunding">
                          <Suspense fallback={<PageLoader />}>
                            <CrowdfundingApp />
                          </Suspense>
                        </AppGuard>
                      </AdminProtectedRoute>
                    } />
                    <Route path="/crowdfunding/projects" element={
                      <AdminProtectedRoute requiredPermissions={['crowdfunding:read']}>
                        <AppGuard appName="crowdfunding">
                          <Suspense fallback={<PageLoader />}>
                            <CrowdfundingProjects />
                          </Suspense>
                        </AppGuard>
                      </AdminProtectedRoute>
                    } />
                    <Route path="/crowdfunding/projects/new" element={
                      <AdminProtectedRoute requiredPermissions={['crowdfunding:write']}>
                        <AppGuard appName="crowdfunding">
                          <Suspense fallback={<PageLoader />}>
                            <CrowdfundingProjectForm />
                          </Suspense>
                        </AppGuard>
                      </AdminProtectedRoute>
                    } />
                    <Route path="/crowdfunding/projects/:id" element={
                      <AdminProtectedRoute requiredPermissions={['crowdfunding:read']}>
                        <AppGuard appName="crowdfunding">
                          <Suspense fallback={<PageLoader />}>
                            <CrowdfundingProjectDetail />
                          </Suspense>
                        </AppGuard>
                      </AdminProtectedRoute>
                    } />
                    <Route path="/crowdfunding/projects/:id/edit" element={
                      <AdminProtectedRoute requiredPermissions={['crowdfunding:write']}>
                        <AppGuard appName="crowdfunding">
                          <Suspense fallback={<PageLoader />}>
                            <CrowdfundingProjectForm />
                          </Suspense>
                        </AppGuard>
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
                    
                    <Route path="/tools/shortcodes" element={
                      <AdminProtectedRoute requiredPermissions={['tools:read']}>
                        <Suspense fallback={<PageLoader />}>
                          <ShortcodeManagement />
                        </Suspense>
                      </AdminProtectedRoute>
                    } />
                    
                    {/* Apps Manager */}
                    <Route path="/apps" element={
                      <AdminProtectedRoute requiredPermissions={['admin']}>
                        <Suspense fallback={<PageLoader />}>
                          <AppsManager />
                        </Suspense>
                      </AdminProtectedRoute>
                    } />
                    <Route path="/apps/settings" element={
                      <AdminProtectedRoute requiredPermissions={['admin']}>
                        <Suspense fallback={<PageLoader />}>
                          <AppSettings />
                        </Suspense>
                      </AdminProtectedRoute>
                    } />
                    
                    <Route path="/apps/marketplace" element={
                      <AdminProtectedRoute requiredPermissions={['apps:read']}>
                        <Suspense fallback={<PageLoader />}>
                          <AppsManager />
                        </Suspense>
                      </AdminProtectedRoute>
                    } />
                    
                    {/* Shortcode 관리 */}
                    <Route path="/shortcodes" element={
                      <AdminProtectedRoute requiredPermissions={['shortcodes:read']}>
                        <Suspense fallback={<PageLoader />}>
                          <ShortcodeManagement />
                        </Suspense>
                      </AdminProtectedRoute>
                    } />
                    
                    <Route path="/shortcodes/by-app" element={
                      <AdminProtectedRoute requiredPermissions={['shortcodes:read']}>
                        <Suspense fallback={<PageLoader />}>
                          <ShortcodeManagement />
                        </Suspense>
                      </AdminProtectedRoute>
                    } />
                    
                    <Route path="/shortcodes/by-category" element={
                      <AdminProtectedRoute requiredPermissions={['shortcodes:read']}>
                        <Suspense fallback={<PageLoader />}>
                          <ShortcodeManagement />
                        </Suspense>
                      </AdminProtectedRoute>
                    } />
                    
                    <Route path="/shortcodes/stats" element={
                      <AdminProtectedRoute requiredPermissions={['shortcodes:read']}>
                        <Suspense fallback={<PageLoader />}>
                          <ShortcodeManagement />
                        </Suspense>
                      </AdminProtectedRoute>
                    } />
                    
                    <Route path="/shortcodes/settings" element={
                      <AdminProtectedRoute requiredPermissions={['shortcodes:write']}>
                        <Suspense fallback={<PageLoader />}>
                          <ShortcodeManagement />
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
                    
                    {/* 도움말 */}
                    <Route path="/shortcodes" element={
                      <AdminProtectedRoute requiredPermissions={['content:read']}>
                        <Suspense fallback={<PageLoader />}>
                          <Shortcodes />
                        </Suspense>
                      </AdminProtectedRoute>
                    } />
                    
                    {/* 테스트 페이지 */}
                    <Route path="/test" element={
                      <AdminProtectedRoute requiredPermissions={['admin']}>
                        <Suspense fallback={<PageLoader />}>
                          <TestPage />
                        </Suspense>
                      </AdminProtectedRoute>
                    } />
                    
                    {/* Gutenberg Editor */}
                    <Route path="/gutenberg" element={
                      <AdminProtectedRoute requiredPermissions={['content:write']}>
                        <Suspense fallback={<PageLoader />}>
                          <GutenbergPage />
                        </Suspense>
                      </AdminProtectedRoute>
                    } />
                    
                    {/* Loop Block Test */}
                    <Route path="/loop-block-test" element={
                      <AdminProtectedRoute requiredPermissions={['content:read']}>
                        <Suspense fallback={<PageLoader />}>
                          <LoopBlockTest />
                        </Suspense>
                      </AdminProtectedRoute>
                    } />
                    
                    {/* Paragraph Test Block Demo */}
                    <Route path="/paragraph-test" element={
                      <AdminProtectedRoute requiredPermissions={['content:write']}>
                        <Suspense fallback={<PageLoader />}>
                          <ParagraphTestDemo />
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
                    
                    {/* 404 핸들링 */}
                    <Route path="*" element={<Navigate to="/" replace />} />
                  </Routes>
                </AdminLayout>
              </AdminProtectedRoute>
            } />
        </Routes>
      </SessionManager>
    </AuthProvider>
    </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;

// Deployment trigger: 2025-08-21 20:45 UTC - Trigger after PM2 cleanup on webserver
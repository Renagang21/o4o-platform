import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, AdminProtectedRoute, SessionManager } from '@o4o/auth-context';
import { AuthClient } from '@o4o/auth-client';
import toast from 'react-hot-toast';
import { useEffect, Suspense, lazy } from 'react';
import ErrorBoundary from '@/components/ErrorBoundary';
import { ThemeProvider } from '@/contexts/ThemeContext';
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

// Import EditorRouteWrapper to handle route-based remounting
import EditorRouteWrapper from '@/pages/editor/EditorRouteWrapper';

// Page Components - Lazy loaded
const Login = lazy(() => import('@/pages/auth/Login'));
const ForgotPassword = lazy(() => import('@/pages/auth/ForgotPassword'));
const ResetPassword = lazy(() => import('@/pages/auth/ResetPassword'));
const AdminHome = lazy(() => import('@/pages/AdminHome'));
const WordPressDashboard = lazy(() => import('@/pages/WordPressDashboard'));
const DashboardSimple = lazy(() => import('@/pages/dashboard/DashboardSimple'));
const UsersPage = lazy(() => import('@/pages/users'));
const UserForm = lazy(() => import('@/pages/users/UserForm'));
const UserDetail = lazy(() => import('@/pages/users/UserDetail'));
const RoleManagement = lazy(() => import('@/pages/users/RoleManagement'));
const UserStatistics = lazy(() => import('@/pages/users/UserStatistics'));
// const Content = lazy(() => import(/* webpackChunkName: "content" */ '@/pages/content/Content')); // Removed - replaced by CPT Engine
// const SettlementDashboard = lazy(() => import('@/pages/ecommerce/SettlementDashboard'));
// const SettlementReports = lazy(() => import('@/pages/ecommerce/SettlementReports'));
const Analytics = lazy(() => import('@/pages/analytics/Analytics'));
const Settings = lazy(() => import('@/pages/settings/Settings'));
const MailManagement = lazy(() => import('@/pages/mail/MailManagement'));
const PagesRouter = lazy(() => import('@/pages/pages/PagesRouter'));
const AdminMediaLibrary = lazy(() => import('@/pages/media/Media'));
const CustomFields = lazy(() => import('@/pages/custom-fields/CustomFields'));
// const ReusableBlocksPage = lazy(() =>
//   import(/* webpackChunkName: "reusable-blocks" */ '@/pages/content/ReusableBlocksPage')
// ); // Removed - content directory deleted
const Posts = lazy(() => import('@/pages/posts/Posts'));
const Categories = lazy(() => import('@/pages/posts/Categories'));
const CategoryEdit = lazy(() => import('@/pages/posts/CategoryEdit'));
const Tags = lazy(() => import('@/pages/posts/Tags'));
const PostPreview = lazy(() => import('@/pages/preview/PostPreview'));
// const Shortcodes = lazy(() => import('@/pages/documentation/Shortcodes'));
const NavigationMenusPage = lazy(() => import('@/pages/menus/Menus'));
// const TestPage = lazy(() => import('@/pages/test/TestPage')); // Removed test page
// const SystemMonitoring = lazy(() => import('@/pages/monitoring/SystemMonitoring'));

// Appearance Pages
const TemplateParts = lazy(() => import('@/pages/appearance/TemplateParts'));
const TemplatePartEditor = lazy(() => import(/* webpackChunkName: "template-editor" */ '@/pages/appearance/TemplatePartEditor'));
const IntegratedMonitoring = lazy(() => import('@/pages/monitoring/IntegratedMonitoring'));
const PerformanceDashboard = lazy(() => import('@/pages/monitoring/PerformanceDashboard'));
// const WidgetManager = lazy(() => import('@/pages/content/WidgetManager')); // Loaded via Content router


// Affiliate Management Pages

// Forum Pages
const ForumRouter = lazy(() => import('@/pages/forum/ForumRouter'));

// Digital Signage Pages
const SignageRouter = lazy(() => import('@/pages/signage/SignageRouter'));

// Crowdfunding Pages
const CrowdfundingRouter = lazy(() => import('@/pages/crowdfunding/CrowdfundingRouter'));

// App Pages
const ToolsPage = lazy(() => import('@/pages/ToolsPage'));
const ToolsMediaReplace = lazy(() => import('@/pages/tools/MediaFileReplace'));


// UI Showcase
const UIShowcase = lazy(() => import('@/pages/UIShowcase'));

// CPT Engine
const CPTEngine = lazy(() => import('@/pages/cpt-engine'));

// CPT/ACF Router
const CPTACFRouter = lazy(() => import('@/pages/cpt-acf/CPTACFRouter'));

// Dropshipping Pages
const DropshippingRouter = lazy(() => import('@/pages/dropshipping'));

// Test Page - Minimal Editor
const MinimalEditor = lazy(() => import('@/pages/test/MinimalEditor'));

// Removed Apps Manager - using WordPress style menu

// Appearance Pages (WordPress Style)
const Customize = lazy(() => import('@/pages/appearance/Customize'));

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
                    
                    {/* 재사용 블록 관리 */}
                    <Route path="/reusable-blocks" element={
                      <AdminProtectedRoute requiredPermissions={['content:read']}>
                        <Suspense fallback={<PageLoader />}>
                          <div>Reusable Blocks - Coming Soon</div>
                        </Suspense>
                      </AdminProtectedRoute>
                    } />
                    
                    {/* 외모 관리 (WordPress Style) */}
                    <Route path="/customize" element={
                      <AdminProtectedRoute requiredPermissions={['templates:write']}>
                        <Suspense fallback={<PageLoader />}>
                          <Customize />
                        </Suspense>
                      </AdminProtectedRoute>
                    } />
                    
                    <Route path="/appearance/menus/*" element={
                      <AdminProtectedRoute requiredRoles={['admin']}>
                        <Suspense fallback={<PageLoader />}>
                          <NavigationMenusPage />
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
                          <AdminMediaLibrary />
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

                    {/* CPT/ACF Archive & Forms */}
                    <Route path="/admin/cpt-acf/*" element={
                      <AdminProtectedRoute requiredPermissions={['content:read']}>
                        <Suspense fallback={<PageLoader />}>
                          <CPTACFRouter />
                        </Suspense>
                      </AdminProtectedRoute>
                    } />

                    {/* Dropshipping Routes */}
                    <Route path="/dropshipping/*" element={
                      <AdminProtectedRoute requiredPermissions={['content:read']}>
                        <Suspense fallback={<PageLoader />}>
                          <DropshippingRouter />
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
                          <MailManagement />
                        </Suspense>
                      </AdminProtectedRoute>
                    } />
                    
                    {/* Forum - App Guard 적용 */}
                    <Route path="/forum/*" element={
                      <AdminProtectedRoute requiredPermissions={['forum:read']}>
                        <Suspense fallback={<PageLoader />}>
                          <ForumRouter />
                        </Suspense>
                      </AdminProtectedRoute>
                    } />
                    
                    {/* Digital Signage - App Guard 적용 */}
                    <Route path="/signage/*" element={
                      <AdminProtectedRoute requiredPermissions={['signage:read']}>
                        <Suspense fallback={<PageLoader />}>
                          <SignageRouter />
                        </Suspense>
                      </AdminProtectedRoute>
                    } />
                    
                    {/* Crowdfunding - App Guard 적용 */}
                    <Route path="/crowdfunding/*" element={
                      <AdminProtectedRoute requiredPermissions={['crowdfunding:read']}>
                        <Suspense fallback={<PageLoader />}>
                          <CrowdfundingRouter />
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
                          <ToolsMediaReplace />
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
                        <MinimalEditor />
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

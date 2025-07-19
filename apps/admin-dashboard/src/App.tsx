import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, AdminProtectedRoute, SessionManager } from '@o4o/auth-context';
import { AuthClient } from '@o4o/auth-client';
import toast from 'react-hot-toast';
import { DevAuthProvider } from '@/lib/DevAuthProvider';
import { lazy, Suspense } from 'react';

// Layout Components
import AdminLayout from '@/components/layout/AdminLayout';

// Page Components - Lazy loaded
const Login = lazy(() => import('@/pages/auth/Login'));
const AdminHome = lazy(() => import('@/pages/AdminHome'));
const Dashboard = lazy(() => import('@/pages/dashboard/Dashboard'));
const UsersList = lazy(() => import('@/pages/Users/UsersList'));
const UserCreate = lazy(() => import('@/pages/Users/UserCreate'));
const UserEdit = lazy(() => import('@/pages/Users/UserEdit'));
const UserDetail = lazy(() => import('@/pages/Users/UserDetail'));
const Content = lazy(() => import('@/pages/content/Content'));
const Products = lazy(() => import('@/pages/ecommerce/Products'));
const Orders = lazy(() => import('@/pages/ecommerce/Orders'));
const OrderDetail = lazy(() => import('@/pages/ecommerce/OrderDetail'));
const Analytics = lazy(() => import('@/pages/analytics/Analytics'));
const Settings = lazy(() => import('@/pages/settings/Settings'));
const Pages = lazy(() => import('@/pages/pages/Pages'));
const Media = lazy(() => import('@/pages/media/Media'));
const CustomFields = lazy(() => import('@/pages/custom-fields/CustomFields'));
const Categories = lazy(() => import('@/pages/categories/Categories'));
const HomepageEditor = lazy(() => import('@/pages/templates/HomepageEditor'));
const Shortcodes = lazy(() => import('@/pages/documentation/Shortcodes'));
const ProductForm = lazy(() => import('@/pages/ecommerce/ProductForm'));

// Loading component
const PageLoader = () => (
  <div className="flex items-center justify-center h-screen">
    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-admin-blue"></div>
  </div>
);

// SSO 클라이언트 인스턴스 생성
const ssoClient = new AuthClient(
  import.meta.env.VITE_API_URL || 'http://localhost:4000'
);

/**
 * 관리자 대시보드 메인 앱
 * SSO 인증 시스템 통합
 */
function App() {
  // 인증 오류 처리
  const handleAuthError = (error: string) => {
    console.error('Auth error:', error);
    
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

  // 개발 환경에서는 DevAuthProvider 사용
  const AuthProviderComponent = import.meta.env.DEV ? DevAuthProvider : AuthProvider;
  
  return (
    <AuthProviderComponent 
      {...(!import.meta.env.DEV ? {
        ssoClient,
        autoRefresh: true,
        onAuthError: handleAuthError,
        onSessionExpiring: handleSessionExpiring
      } : {})}
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
            
            {/* 보호된 관리자 라우트들 */}
            <Route path="/*" element={
              <AdminProtectedRoute 
                requiredRoles={['admin']}
                showContactAdmin={true}
              >
                <AdminLayout>
                  <Routes>
                    <Route path="/" element={
                      <Suspense fallback={<PageLoader />}>
                        <AdminHome />
                      </Suspense>
                    } />
                    <Route path="/dashboard" element={
                      <Suspense fallback={<PageLoader />}>
                        <Dashboard />
                      </Suspense>
                    } />
                    
                    {/* 사용자 관리 */}
                    <Route path="/users" element={
                      <AdminProtectedRoute requiredPermissions={['users:read']}>
                        <Suspense fallback={<PageLoader />}>
                          <UsersList />
                        </Suspense>
                      </AdminProtectedRoute>
                    } />
                    <Route path="/users/create" element={
                      <AdminProtectedRoute requiredPermissions={['users:create']}>
                        <Suspense fallback={<PageLoader />}>
                          <UserCreate />
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
                          <UserEdit />
                        </Suspense>
                      </AdminProtectedRoute>
                    } />
                    
                    {/* 콘텐츠 관리 */}
                    <Route path="/content/*" element={
                      <AdminProtectedRoute requiredPermissions={['content:read']}>
                        <Suspense fallback={<PageLoader />}>
                          <Content />
                        </Suspense>
                      </AdminProtectedRoute>
                    } />
                    
                    {/* 페이지 관리 */}
                    <Route path="/pages/*" element={
                      <AdminProtectedRoute requiredPermissions={['pages:read']}>
                        <Suspense fallback={<PageLoader />}>
                          <Pages />
                        </Suspense>
                      </AdminProtectedRoute>
                    } />
                    
                    {/* 홈페이지 편집기 */}
                    <Route path="/homepage-editor" element={
                      <AdminProtectedRoute requiredPermissions={['templates:write']}>
                        <Suspense fallback={<PageLoader />}>
                          <HomepageEditor />
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
                    
                    {/* 이커머스 관리 */}
                    <Route path="/products" element={
                      <AdminProtectedRoute requiredPermissions={['products:read']}>
                        <Suspense fallback={<PageLoader />}>
                          <Products />
                        </Suspense>
                      </AdminProtectedRoute>
                    } />
                    
                    <Route path="/products/new" element={
                      <AdminProtectedRoute requiredPermissions={['products:write']}>
                        <Suspense fallback={<PageLoader />}>
                          <ProductForm />
                        </Suspense>
                      </AdminProtectedRoute>
                    } />
                    
                    <Route path="/products/:id/edit" element={
                      <AdminProtectedRoute requiredPermissions={['products:write']}>
                        <Suspense fallback={<PageLoader />}>
                          <ProductForm />
                        </Suspense>
                      </AdminProtectedRoute>
                    } />
                    
                    <Route path="/orders" element={
                      <AdminProtectedRoute requiredPermissions={['orders:read']}>
                        <Suspense fallback={<PageLoader />}>
                          <Orders />
                        </Suspense>
                      </AdminProtectedRoute>
                    } />
                    <Route path="/orders/:id" element={
                      <AdminProtectedRoute requiredPermissions={['orders:read']}>
                        <Suspense fallback={<PageLoader />}>
                          <OrderDetail />
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
                    
                    {/* 카테고리 & 태그 */}
                    <Route path="/categories" element={
                      <AdminProtectedRoute requiredPermissions={['categories:read']}>
                        <Suspense fallback={<PageLoader />}>
                          <Categories />
                        </Suspense>
                      </AdminProtectedRoute>
                    } />
                    
                    {/* 커스텀 필드 */}
                    <Route path="/custom-fields/*" element={
                      <AdminProtectedRoute requiredPermissions={['custom_fields:read']}>
                        <Suspense fallback={<PageLoader />}>
                          <CustomFields />
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
                    
                    {/* 404 핸들링 */}
                    <Route path="*" element={<Navigate to="/" replace />} />
                  </Routes>
                </AdminLayout>
              </AdminProtectedRoute>
            } />
        </Routes>
      </SessionManager>
    </AuthProviderComponent>
  );
}

export default App;
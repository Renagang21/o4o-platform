;
import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, AdminProtectedRoute, SessionManager } from '@o4o/auth-context';
import { AuthClient } from '@o4o/auth-client';
import toast from 'react-hot-toast';

// Layout Components
import AdminLayout from '@/components/layout/AdminLayout';

// Page Components
import Login from '@/pages/auth/Login';
import Dashboard from '@/pages/dashboard/Dashboard';
import Users from '@/pages/users/Users';
import Content from '@/pages/content/Content';
import Products from '@/pages/ecommerce/Products';
import Orders from '@/pages/ecommerce/Orders';
import Analytics from '@/pages/analytics/Analytics';
import Settings from '@/pages/settings/Settings';
import Pages from '@/pages/pages/Pages';
import Media from '@/pages/media/Media';
import CustomFields from '@/pages/custom-fields/CustomFields';

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

  return (
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
            <Route path="/login" element={<Login />} />
            
            {/* 보호된 관리자 라우트들 */}
            <Route path="/*" element={
              <AdminProtectedRoute 
                requiredRoles={['admin']}
                showContactAdmin={true}
              >
                <AdminLayout>
                  <Routes>
                    <Route path="/" element={<Navigate to="/dashboard" replace />} />
                    <Route path="/dashboard" element={<Dashboard />} />
                    
                    {/* 사용자 관리 */}
                    <Route path="/users/*" element={
                      <AdminProtectedRoute requiredPermissions={['users:read']}>
                        <Users />
                      </AdminProtectedRoute>
                    } />
                    
                    {/* 콘텐츠 관리 */}
                    <Route path="/content/*" element={
                      <AdminProtectedRoute requiredPermissions={['content:read']}>
                        <Content />
                      </AdminProtectedRoute>
                    } />
                    
                    {/* 페이지 관리 */}
                    <Route path="/pages/*" element={
                      <AdminProtectedRoute requiredPermissions={['pages:read']}>
                        <Pages />
                      </AdminProtectedRoute>
                    } />
                    
                    {/* 미디어 관리 */}
                    <Route path="/media/*" element={
                      <AdminProtectedRoute requiredPermissions={['media:read']}>
                        <Media />
                      </AdminProtectedRoute>
                    } />
                    
                    {/* 이커머스 관리 */}
                    <Route path="/products/*" element={
                      <AdminProtectedRoute requiredPermissions={['products:read']}>
                        <Products />
                      </AdminProtectedRoute>
                    } />
                    
                    <Route path="/orders/*" element={
                      <AdminProtectedRoute requiredPermissions={['orders:read']}>
                        <Orders />
                      </AdminProtectedRoute>
                    } />
                    
                    {/* 분석 */}
                    <Route path="/analytics/*" element={
                      <AdminProtectedRoute requiredPermissions={['analytics:read']}>
                        <Analytics />
                      </AdminProtectedRoute>
                    } />
                    
                    {/* 커스텀 필드 */}
                    <Route path="/custom-fields/*" element={
                      <AdminProtectedRoute requiredPermissions={['custom_fields:read']}>
                        <CustomFields />
                      </AdminProtectedRoute>
                    } />
                    
                    {/* 설정 */}
                    <Route path="/settings/*" element={
                      <AdminProtectedRoute requiredPermissions={['settings:read']}>
                        <Settings />
                      </AdminProtectedRoute>
                    } />
                    
                    {/* 404 핸들링 */}
                    <Route path="*" element={<Navigate to="/dashboard" replace />} />
                  </Routes>
                </AdminLayout>
              </AdminProtectedRoute>
            } />
        </Routes>
      </SessionManager>
    </AuthProvider>
  );
}

export default App;
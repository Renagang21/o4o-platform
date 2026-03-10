import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, AdminProtectedRoute, SessionManager } from '@o4o/auth-context';
import { AuthClient } from '@o4o/auth-client';
import toast from 'react-hot-toast';
import { useEffect } from 'react';
import ErrorBoundary from '@/components/ErrorBoundary';
import { EnvBadge } from '@/components/EnvBadge';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { ToastProvider } from '@/contexts/ToastContext';
import { useAuthStore } from '@/stores/authStore';
import { useAuth as useAuthContext } from '@o4o/auth-context';
import '@/styles/o4o-admin-theme.css';
import '@/styles/o4o-admin-sidebar.css';
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

// Route modules (WO-O4O-ADMIN-APP-ROUTING-SPLIT-V1)
import { PublicRoutes } from '@/routes/public.routes';
import { DashboardRoutes } from '@/routes/dashboard.routes';
import { UserRoutes } from '@/routes/users.routes';
import { ContentRoutes } from '@/routes/content.routes';
import { AppearanceRoutes } from '@/routes/appearance.routes';
import { CommerceRoutes } from '@/routes/commerce.routes';
import { ServiceRoutes } from '@/routes/services.routes';
import { YaksaRoutes } from '@/routes/yaksa.routes';
import { AppRoutes } from '@/routes/apps.routes';
import { LmsMarketingRoutes } from '@/routes/lms-marketing.routes';
import { PlatformRoutes } from '@/routes/platform.routes';
import { TestRoutes } from '@/routes/test.routes';

// SSO 클라이언트 인스턴스 생성
// Phase 6-7: Cookie Auth Primary - /api/v1 suffix required for auth endpoints
const getAuthApiUrl = () => {
  const baseUrl = import.meta.env.VITE_API_URL || 'https://api.neture.co.kr';
  // Ensure /api/v1 suffix for auth endpoints
  if (baseUrl.endsWith('/api/v1')) return baseUrl;
  if (baseUrl.endsWith('/api')) return `${baseUrl}/v1`;
  if (baseUrl.endsWith('/')) return `${baseUrl}api/v1`;
  return `${baseUrl}/api/v1`;
};

const ssoClient = new AuthClient(getAuthApiUrl(), { strategy: 'cookie' });

/**
 * AuthStoreSync - AuthProvider ↔ zustand authStore 동기화
 *
 * 문제: AuthProvider(@o4o/auth-context)와 zustand authStore가 동일한
 * localStorage 키(admin-auth-storage)를 사용하여 충돌 발생.
 * AuthProvider가 세션 만료로 키를 삭제해도 zustand persist가 재기록하여
 * 무한 리다이렉트 루프 발생.
 *
 * 해결: AuthProvider의 인증 상태를 zustand store에 동기화하여
 * 양쪽이 항상 일관된 상태를 유지하도록 함.
 */
function AuthStoreSync() {
  const { isAuthenticated, user } = useAuthContext();
  const zustandAuth = useAuthStore();

  useEffect(() => {
    // AuthProvider가 미인증 상태인데 zustand은 인증 상태 → zustand 정리
    if (!isAuthenticated && zustandAuth.isAuthenticated) {
      zustandAuth.logout();
    }
  }, [isAuthenticated, zustandAuth.isAuthenticated]);

  return null;
}

/**
 * 관리자 대시보드 메인 앱
 * SSO 인증 시스템 통합
 */
function App() {
  // Initialize blocks, widgets, and shortcodes after first render (performance optimization)
  useEffect(() => {
    // Defer non-critical initialization to after render
    const initializeFeatures = async () => {
      // Dynamic imports to reduce initial bundle
      const { registerAllBlocks } = await import('@/blocks');
      const { registerAllWidgets } = await import('@/lib/widgets/registerWidgets');
      const { loadShortcodes, logShortcodeSummary } = await import('@/utils/shortcode-loader');

      // Register blocks and widgets
      registerAllBlocks();
      registerAllWidgets();

      // Load shortcodes in background
      loadShortcodes().then(logShortcodeSummary);
    };

    // Use requestIdleCallback for non-critical work, fallback to setTimeout
    if ('requestIdleCallback' in window) {
      (window as any).requestIdleCallback(initializeFeatures, { timeout: 2000 });
    } else {
      setTimeout(initializeFeatures, 100);
    }
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
          <AuthStoreSync />
          <SessionManager
            warningBeforeExpiry={5 * 60 * 1000} // 5분 전 경고
            onSessionExpiring={handleSessionExpiring}
          >
            <Routes>
            {/* 공개 라우트 — 로그인, 미리보기, 에디터, 스토어프론트, 디버그 */}
            {PublicRoutes()}

            {/* 보호된 관리자 라우트들 */}
            <Route path="/*" element={
              <AdminProtectedRoute
                requiredRoles={['admin']}
                showContactAdmin={true}
              >
                <AdminLayout>
                  <Routes>
                    {DashboardRoutes()}
                    {UserRoutes()}
                    {ContentRoutes()}
                    {AppearanceRoutes()}
                    {CommerceRoutes()}
                    {ServiceRoutes()}
                    {YaksaRoutes()}
                    {AppRoutes()}
                    {LmsMarketingRoutes()}
                    {PlatformRoutes()}
                    {TestRoutes()}

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

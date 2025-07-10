import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
;
import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, AdminProtectedRoute, SessionManager } from '@o4o/auth-context';
import { SSOClient } from '@o4o/auth-client';
import toast from 'react-hot-toast';
import AdminLayout from '@/components/layout/AdminLayout';
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
const ssoClient = new SSOClient(import.meta.env.VITE_API_URL || 'http://localhost:4000', {
    cookieDomain: '.neture.co.kr',
    secureTransport: import.meta.env.PROD,
    autoRefresh: true,
    sessionTimeout: 8 * 60 * 60 * 1000,
    warningBeforeExpiry: 5 * 60 * 1000,
});
function App() {
    const handleAuthError = (error) => {
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
    const handleSessionExpiring = (remainingSeconds) => {
        const minutes = Math.floor(remainingSeconds / 60);
        toast(`${minutes}분 후 세션이 만료됩니다.`, {
            icon: '⏰',
            duration: 5000,
        });
    };
    return (_jsx(AuthProvider, { ssoClient: ssoClient, autoRefresh: true, onAuthError: handleAuthError, onSessionExpiring: handleSessionExpiring, children: _jsx(SessionManager, { warningBeforeExpiry: 5 * 60 * 1000, onSessionExpiring: handleSessionExpiring, children: _jsxs(Routes, { children: [_jsx(Route, { path: "/login", element: _jsx(Login, {}) }), _jsx(Route, { path: "/*", element: _jsx(AdminProtectedRoute, { requiredRoles: ['admin'], showContactAdmin: true, children: _jsx(AdminLayout, { children: _jsxs(Routes, { children: [_jsx(Route, { path: "/", element: _jsx(Navigate, { to: "/dashboard", replace: true }) }), _jsx(Route, { path: "/dashboard", element: _jsx(Dashboard, {}) }), _jsx(Route, { path: "/users/*", element: _jsx(AdminProtectedRoute, { requiredPermissions: ['users:read'], children: _jsx(Users, {}) }) }), _jsx(Route, { path: "/content/*", element: _jsx(AdminProtectedRoute, { requiredPermissions: ['content:read'], children: _jsx(Content, {}) }) }), _jsx(Route, { path: "/pages/*", element: _jsx(AdminProtectedRoute, { requiredPermissions: ['pages:read'], children: _jsx(Pages, {}) }) }), _jsx(Route, { path: "/media/*", element: _jsx(AdminProtectedRoute, { requiredPermissions: ['media:read'], children: _jsx(Media, {}) }) }), _jsx(Route, { path: "/products/*", element: _jsx(AdminProtectedRoute, { requiredPermissions: ['products:read'], children: _jsx(Products, {}) }) }), _jsx(Route, { path: "/orders/*", element: _jsx(AdminProtectedRoute, { requiredPermissions: ['orders:read'], children: _jsx(Orders, {}) }) }), _jsx(Route, { path: "/analytics/*", element: _jsx(AdminProtectedRoute, { requiredPermissions: ['analytics:read'], children: _jsx(Analytics, {}) }) }), _jsx(Route, { path: "/custom-fields/*", element: _jsx(AdminProtectedRoute, { requiredPermissions: ['custom_fields:read'], children: _jsx(CustomFields, {}) }) }), _jsx(Route, { path: "/settings/*", element: _jsx(AdminProtectedRoute, { requiredPermissions: ['settings:read'], children: _jsx(Settings, {}) }) }), _jsx(Route, { path: "*", element: _jsx(Navigate, { to: "/dashboard", replace: true }) })] }) }) }) })] }) }) }));
}
export default App;
//# sourceMappingURL=App.js.map
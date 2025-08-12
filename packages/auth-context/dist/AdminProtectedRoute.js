import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useEffect } from 'react';
import { useAuth } from './AuthContext';
import { useNavigate, useLocation } from 'react-router-dom';
const AccessDeniedComponent = ({ showContactAdmin = false }) => (_jsxs("div", { style: {
        padding: '2rem',
        textAlign: 'center',
        background: '#f8f9fa',
        border: '1px solid #dee2e6',
        borderRadius: '0.375rem',
        margin: '1rem'
    }, children: [_jsx("h2", { style: { color: '#dc3545', marginBottom: '1rem' }, children: "\uC811\uADFC \uAD8C\uD55C\uC774 \uC5C6\uC2B5\uB2C8\uB2E4" }), _jsx("p", { style: { color: '#6c757d', marginBottom: '1rem' }, children: "\uC774 \uD398\uC774\uC9C0\uC5D0 \uC811\uADFC\uD558\uAE30 \uC704\uD55C \uAD8C\uD55C\uC774 \uBD80\uC871\uD569\uB2C8\uB2E4." }), showContactAdmin && (_jsx("p", { style: { color: '#6c757d' }, children: "\uAD00\uB9AC\uC790\uC5D0\uAC8C \uBB38\uC758\uD558\uC2DC\uAE30 \uBC14\uB78D\uB2C8\uB2E4." }))] }));
export const AdminProtectedRoute = ({ children, requiredRoles = [], requiredPermissions = [], showContactAdmin = false }) => {
    const { user, isAuthenticated, isLoading } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    useEffect(() => {
        // 로딩 중이 아니고 인증되지 않은 경우 로그인 페이지로 리다이렉트
        if (!isLoading && !isAuthenticated) {
            navigate('/login', {
                replace: true,
                state: { from: location.pathname }
            });
        }
    }, [isAuthenticated, isLoading, navigate, location]);
    // 로딩 중인 경우
    if (isLoading) {
        return (_jsx("div", { style: {
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                height: '100vh'
            }, children: _jsxs("div", { style: { textAlign: 'center' }, children: [_jsx("div", { style: {
                            width: '48px',
                            height: '48px',
                            border: '4px solid #f3f4f6',
                            borderTop: '4px solid #3b82f6',
                            borderRadius: '50%',
                            animation: 'spin 1s linear infinite',
                            margin: '0 auto 16px'
                        } }), _jsx("p", { style: { color: '#6b7280' }, children: "\uC778\uC99D \uD655\uC778 \uC911..." })] }) }));
    }
    // 인증되지 않은 경우 (리다이렉트 전 잠시 표시)
    if (!isAuthenticated || !user) {
        return null;
    }
    // 역할 기반 접근 제어
    if (requiredRoles.length > 0) {
        const userRole = user.role;
        const hasRequiredRole = requiredRoles.includes(userRole);
        if (!hasRequiredRole) {
            return _jsx(AccessDeniedComponent, { showContactAdmin: showContactAdmin });
        }
    }
    // 권한 기반 접근 제어는 현재 User 타입에 없으므로 기본적으로 통과
    if (requiredPermissions.length > 0) {
        // 향후 확장을 위한 구조 유지
        // 현재는 admin 역할이면 모든 권한을 가진 것으로 간주
        const isAdmin = user.role === 'admin';
        if (!isAdmin) {
            return _jsx(AccessDeniedComponent, { showContactAdmin: showContactAdmin });
        }
    }
    // 모든 조건을 만족하면 자식 컴포넌트 렌더링
    return _jsx(_Fragment, { children: children });
};
// CSS 애니메이션을 위한 스타일 태그 추가
if (typeof document !== 'undefined' && !document.getElementById('auth-spinner-styles')) {
    const style = document.createElement('style');
    style.id = 'auth-spinner-styles';
    style.textContent = `
    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }
  `;
    document.head.appendChild(style);
}

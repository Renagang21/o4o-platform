import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useEffect } from 'react';
import { Navigate, useLocation, useSearchParams } from 'react-router-dom';
import { Eye, EyeOff, Lock, Mail, Shield, AlertTriangle } from 'lucide-react';
import { useAuth } from '@o4o/auth-context';
import toast from 'react-hot-toast';
const Login = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [rememberMe, setRememberMe] = useState(false);
    const { login, isAuthenticated, isLoading, error, clearError, isAdmin } = useAuth();
    const location = useLocation();
    const [searchParams] = useSearchParams();
    const redirectUrl = searchParams.get('redirect') || '/dashboard';
    const fromLocation = location.state?.from?.pathname || redirectUrl;
    useEffect(() => {
        if (isAuthenticated && isAdmin()) {
            toast.success('이미 로그인되어 있습니다.');
        }
    }, [isAuthenticated, isAdmin]);
    if (isAuthenticated) {
        if (isAdmin()) {
            return _jsx(Navigate, { to: fromLocation, replace: true });
        }
        else {
            return (_jsx("div", { className: "min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8", children: _jsx("div", { className: "max-w-md w-full space-y-8", children: _jsxs("div", { className: "text-center", children: [_jsx("div", { className: "mx-auto h-16 w-16 bg-red-500 rounded-full flex items-center justify-center", children: _jsx(AlertTriangle, { className: "h-8 w-8 text-white" }) }), _jsx("h2", { className: "mt-6 text-center text-3xl font-bold text-gray-900", children: "\uC811\uADFC \uAD8C\uD55C \uC5C6\uC74C" }), _jsx("p", { className: "mt-2 text-center text-sm text-gray-600", children: "\uAD00\uB9AC\uC790 \uAD8C\uD55C\uC774 \uD544\uC694\uD569\uB2C8\uB2E4" }), _jsx("div", { className: "mt-4", children: _jsx("button", { onClick: () => window.location.href = '/', className: "text-admin-blue hover:text-admin-blue-dark", children: "\uBA54\uC778 \uC0AC\uC774\uD2B8\uB85C \uC774\uB3D9" }) })] }) }) }));
        }
    }
    const handleSubmit = async (e) => {
        e.preventDefault();
        clearError();
        if (!email || !password) {
            toast.error('이메일과 비밀번호를 입력해주세요.');
            return;
        }
        try {
            await login({ email, password }, {
                rememberMe,
                redirectUrl: fromLocation,
                maxAge: rememberMe ? 30 * 24 * 60 * 60 * 1000 : undefined
            });
            toast.success('관리자 로그인 성공!');
        }
        catch (error) {
            console.error('Admin login failed:', error);
            let errorMessage = error.message || '로그인에 실패했습니다.';
            if (errorMessage.includes('Invalid credentials')) {
                errorMessage = '이메일 또는 비밀번호가 올바르지 않습니다.';
            }
            else if (errorMessage.includes('Account not active')) {
                errorMessage = '계정이 비활성화되었습니다. 관리자에게 문의하세요.';
            }
            else if (errorMessage.includes('insufficient_role')) {
                errorMessage = '관리자 권한이 없습니다.';
            }
            else if (errorMessage.includes('Account is temporarily locked')) {
                errorMessage = '계정이 임시로 잠겼습니다. 잠시 후 다시 시도하세요.';
            }
            toast.error(errorMessage);
        }
    };
    return (_jsx("div", { className: "min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8", children: _jsxs("div", { className: "max-w-md w-full space-y-8", children: [_jsxs("div", { children: [_jsx("div", { className: "mx-auto h-16 w-16 bg-admin-blue rounded-full flex items-center justify-center", children: _jsx(Lock, { className: "h-8 w-8 text-white" }) }), _jsx("h2", { className: "mt-6 text-center text-3xl font-bold text-gray-900", children: "O4O Admin" }), _jsx("p", { className: "mt-2 text-center text-sm text-gray-600", children: "\uAD00\uB9AC\uC790 \uACC4\uC815\uC73C\uB85C \uB85C\uADF8\uC778\uD558\uC138\uC694" })] }), _jsxs("div", { className: "bg-blue-50 border border-blue-200 rounded-lg p-4", children: [_jsxs("div", { className: "flex items-center gap-2 mb-2", children: [_jsx(Shield, { className: "h-4 w-4 text-blue-600" }), _jsx("p", { className: "text-blue-800 text-sm font-medium", children: "\uC0C8\uB85C\uC6B4 SSO \uC778\uC99D \uC2DC\uC2A4\uD15C" })] }), _jsxs("div", { className: "text-blue-700 text-xs space-y-1", children: [_jsx("div", { children: "\uD83D\uDD10 \uAD00\uB9AC\uC790 \uC804\uC6A9 \uBCF4\uC548 \uAC15\uD654" }), _jsx("div", { children: "\u26A1 \uC790\uB3D9 \uD1A0\uD070 \uAC31\uC2E0 (15\uBD84 Access + 7\uC77C Refresh)" }), _jsx("div", { children: "\uD83D\uDEE1\uFE0F \uC5ED\uD560 \uAE30\uBC18 \uC811\uADFC \uC81C\uC5B4" }), _jsx("div", { children: "\uD83D\uDCCA \uC2E4\uC2DC\uAC04 \uC138\uC158 \uBAA8\uB2C8\uD130\uB9C1" })] })] }), import.meta.env.DEV && (_jsxs("div", { className: "bg-yellow-50 border border-yellow-200 rounded-lg p-4", children: [_jsx("p", { className: "text-yellow-800 text-sm font-medium mb-2", children: "\uD83D\uDD27 \uAC1C\uBC1C \uD658\uACBD - \uAD00\uB9AC\uC790 \uD14C\uC2A4\uD2B8 \uACC4\uC815" }), _jsxs("div", { className: "text-yellow-700 text-xs space-y-1", children: [_jsxs("div", { children: ["\uAD00\uB9AC\uC790: ", _jsx("code", { className: "bg-yellow-100 px-1 rounded", children: "admin@neture.co.kr" }), " /", _jsx("code", { className: "bg-yellow-100 px-1 rounded ml-1", children: "admin123!" })] }), _jsx("div", { className: "text-xs text-yellow-600 mt-1", children: "\uD83D\uDCA1 Phase 1\uC5D0\uC11C npm run create-admin\uC73C\uB85C \uC0DD\uC131" })] })] })), error && (_jsx("div", { className: "wp-notice-error", children: _jsxs("div", { className: "flex items-center gap-2", children: [_jsx(AlertTriangle, { className: "h-4 w-4 text-red-500" }), _jsx("span", { children: error })] }) })), _jsxs("form", { className: "mt-8 space-y-6", onSubmit: handleSubmit, children: [_jsxs("div", { className: "space-y-4", children: [_jsxs("div", { children: [_jsx("label", { htmlFor: "email", className: "block text-sm font-medium text-gray-700 mb-1", children: "\uC774\uBA54\uC77C \uC8FC\uC18C" }), _jsxs("div", { className: "relative", children: [_jsx(Mail, { className: "absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" }), _jsx("input", { id: "email", name: "email", type: "email", autoComplete: "email", required: true, value: email, onChange: (e) => setEmail(e.target.value), className: "wp-input pl-10", placeholder: "admin@neture.co.kr", disabled: isLoading })] })] }), _jsxs("div", { children: [_jsx("label", { htmlFor: "password", className: "block text-sm font-medium text-gray-700 mb-1", children: "\uBE44\uBC00\uBC88\uD638" }), _jsxs("div", { className: "relative", children: [_jsx(Lock, { className: "absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" }), _jsx("input", { id: "password", name: "password", type: showPassword ? 'text' : 'password', autoComplete: "current-password", required: true, value: password, onChange: (e) => setPassword(e.target.value), className: "wp-input pl-10 pr-10", placeholder: "\uBE44\uBC00\uBC88\uD638\uB97C \uC785\uB825\uD558\uC138\uC694", disabled: isLoading }), _jsx("button", { type: "button", onClick: () => setShowPassword(!showPassword), className: "absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600", disabled: isLoading, children: showPassword ? (_jsx(EyeOff, { className: "h-5 w-5" })) : (_jsx(Eye, { className: "h-5 w-5" })) })] })] })] }), _jsxs("div", { className: "flex items-center justify-between", children: [_jsxs("div", { className: "flex items-center", children: [_jsx("input", { id: "remember-me", name: "remember-me", type: "checkbox", checked: rememberMe, onChange: (e) => setRememberMe(e.target.checked), className: "h-4 w-4 text-admin-blue focus:ring-admin-blue border-gray-300 rounded", disabled: isLoading }), _jsx("label", { htmlFor: "remember-me", className: "ml-2 block text-sm text-gray-700", children: "30\uC77C\uAC04 \uB85C\uADF8\uC778 \uC0C1\uD0DC \uC720\uC9C0" })] }), _jsx("div", { className: "text-sm", children: _jsx("a", { href: "mailto:admin@neture.co.kr?subject=\uBE44\uBC00\uBC88\uD638 \uC7AC\uC124\uC815 \uC694\uCCAD", className: "font-medium text-admin-blue hover:text-admin-blue-dark", children: "\uBE44\uBC00\uBC88\uD638\uB97C \uC78A\uC73C\uC168\uB098\uC694?" }) })] }), _jsx("div", { children: _jsx("button", { type: "submit", disabled: isLoading, className: "group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-admin-blue hover:bg-admin-blue-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-admin-blue disabled:opacity-50 disabled:cursor-not-allowed transition-colors", children: isLoading ? (_jsxs("div", { className: "flex items-center gap-2", children: [_jsx("div", { className: "loading-spinner" }), _jsx("span", { children: "\uB85C\uADF8\uC778 \uC911..." })] })) : (_jsxs("div", { className: "flex items-center gap-2", children: [_jsx(Shield, { className: "h-4 w-4" }), _jsx("span", { children: "\uAD00\uB9AC\uC790 \uB85C\uADF8\uC778" })] })) }) }), _jsxs("div", { className: "text-center space-y-2", children: [_jsxs("p", { className: "text-xs text-gray-500", children: ["\uAD00\uB9AC\uC790 \uACC4\uC815\uC774 \uD544\uC694\uD558\uC2E0\uAC00\uC694?", ' ', _jsx("a", { href: "mailto:admin@neture.co.kr?subject=\uAD00\uB9AC\uC790 \uACC4\uC815 \uC694\uCCAD", className: "font-medium text-admin-blue hover:text-admin-blue-dark", children: "\uBB38\uC758\uD558\uAE30" })] }), _jsx("p", { className: "text-xs text-gray-400", children: _jsx("a", { href: "/", className: "hover:text-gray-600", children: "\uBA54\uC778 \uC0AC\uC774\uD2B8\uB85C \uB3CC\uC544\uAC00\uAE30" }) })] })] }), _jsxs("div", { className: "mt-8 p-4 bg-gray-50 rounded-lg border", children: [_jsx("h3", { className: "text-sm font-medium text-gray-900 mb-2", children: "\uD83D\uDD12 \uBCF4\uC548 \uC548\uB0B4" }), _jsxs("ul", { className: "text-xs text-gray-600 space-y-1", children: [_jsx("li", { children: "\u2022 \uC138\uC158\uC740 8\uC2DC\uAC04 \uD6C4 \uC790\uB3D9 \uB9CC\uB8CC\uB429\uB2C8\uB2E4" }), _jsx("li", { children: "\u2022 \uBE44\uC815\uC0C1\uC801\uC778 \uC811\uADFC \uC2DC \uACC4\uC815\uC774 \uC790\uB3D9\uC73C\uB85C \uC7A0\uAE38 \uC218 \uC788\uC2B5\uB2C8\uB2E4" }), _jsx("li", { children: "\u2022 \uBAA8\uB4E0 \uAD00\uB9AC\uC790 \uD65C\uB3D9\uC740 \uB85C\uADF8\uB85C \uAE30\uB85D\uB429\uB2C8\uB2E4" }), _jsx("li", { children: "\u2022 \uB2E4\uB978 \uAE30\uAE30\uC5D0\uC11C \uB85C\uADF8\uC778 \uC2DC \uAE30\uC874 \uC138\uC158\uC774 \uC885\uB8CC\uB429\uB2C8\uB2E4" })] })] })] }) }));
};
export default Login;
//# sourceMappingURL=Login.js.map
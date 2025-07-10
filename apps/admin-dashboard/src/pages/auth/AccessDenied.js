import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect } from 'react';
import { useAuthStore } from '@/api/authStore';
const AccessDenied = () => {
    const logout = useAuthStore(state => state.logout);
    useEffect(() => {
        const timer = setTimeout(() => {
            logout();
            window.location.href = process.env.NODE_ENV === 'production'
                ? 'https://neture.co.kr'
                : 'http://localhost:3000';
        }, 3000);
        return () => clearTimeout(timer);
    }, [logout]);
    const handleRedirectNow = () => {
        logout();
        window.location.href = process.env.NODE_ENV === 'production'
            ? 'https://neture.co.kr'
            : 'http://localhost:3000';
    };
    return (_jsx("div", { className: "min-h-screen flex items-center justify-center bg-gray-50", children: _jsxs("div", { className: "max-w-md w-full bg-white shadow-lg rounded-lg p-8 text-center", children: [_jsxs("div", { className: "mb-6", children: [_jsx("div", { className: "mx-auto w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4", children: _jsx("svg", { className: "w-8 h-8 text-red-600", fill: "none", stroke: "currentColor", viewBox: "0 0 24 24", children: _jsx("path", { strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: "2", d: "M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" }) }) }), _jsx("h1", { className: "text-2xl font-bold text-gray-900 mb-2", children: "\uC811\uADFC \uAD8C\uD55C\uC774 \uC5C6\uC2B5\uB2C8\uB2E4" }), _jsxs("p", { className: "text-gray-600 mb-6", children: ["\uAD00\uB9AC\uC790 \uAD8C\uD55C\uC774 \uD544\uC694\uD55C \uD398\uC774\uC9C0\uC785\uB2C8\uB2E4.", _jsx("br", {}), "\uC77C\uBC18 \uC0AC\uC6A9\uC790\uB294 \uC811\uADFC\uD560 \uC218 \uC5C6\uC2B5\uB2C8\uB2E4."] })] }), _jsxs("div", { className: "space-y-4", children: [_jsx("div", { className: "text-sm text-gray-500", children: "3\uCD08 \uD6C4 \uC790\uB3D9\uC73C\uB85C \uBA54\uC778 \uD398\uC774\uC9C0\uB85C \uC774\uB3D9\uD569\uB2C8\uB2E4..." }), _jsx("button", { onClick: handleRedirectNow, className: "w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 transition duration-200", children: "\uC9C0\uAE08 \uBA54\uC778 \uD398\uC774\uC9C0\uB85C \uC774\uB3D9" })] }), _jsx("div", { className: "mt-6 pt-6 border-t border-gray-200", children: _jsx("p", { className: "text-xs text-gray-400", children: "\uAD00\uB9AC\uC790 \uAD8C\uD55C\uC774 \uD544\uC694\uD558\uC2DC\uB2E4\uBA74 \uC2DC\uC2A4\uD15C \uAD00\uB9AC\uC790\uC5D0\uAC8C \uBB38\uC758\uD558\uC138\uC694." }) })] }) }));
};
export default AccessDenied;
//# sourceMappingURL=AccessDenied.js.map
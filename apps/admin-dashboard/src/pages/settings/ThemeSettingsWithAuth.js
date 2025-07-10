import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useAuthStore } from '@/api/authStore';
import ThemeSettings from './ThemeSettings';
import { Shield } from 'lucide-react';
const ThemeSettingsWithAuth = () => {
    const { user } = useAuthStore();
    const hasPermission = user?.role === 'admin';
    if (!hasPermission) {
        return (_jsxs("div", { className: "space-y-6", children: [_jsxs("div", { children: [_jsx("h1", { className: "text-2xl font-bold text-gray-900", children: "\uD14C\uB9C8 \uC124\uC815" }), _jsx("p", { className: "text-gray-600 mt-1", children: "\uC2DC\uC2A4\uD15C \uC804\uCCB4\uC758 \uC2DC\uAC01\uC801 \uD14C\uB9C8\uB97C \uC120\uD0DD\uD558\uACE0 \uAD00\uB9AC\uD569\uB2C8\uB2E4" })] }), _jsx("div", { className: "wp-card", children: _jsx("div", { className: "wp-card-body", children: _jsxs("div", { className: "text-center py-12", children: [_jsx(Shield, { className: "w-16 h-16 text-gray-400 mx-auto mb-4" }), _jsx("h3", { className: "text-lg font-medium text-gray-900 mb-2", children: "\uC811\uADFC \uAD8C\uD55C\uC774 \uC5C6\uC2B5\uB2C8\uB2E4" }), _jsx("p", { className: "text-gray-600", children: "\uD14C\uB9C8 \uC124\uC815\uC740 \uAD00\uB9AC\uC790\uB9CC \uBCC0\uACBD\uD560 \uC218 \uC788\uC2B5\uB2C8\uB2E4." }), _jsxs("p", { className: "text-sm text-gray-500 mt-2", children: ["\uD604\uC7AC \uAD8C\uD55C: ", _jsx("span", { className: "font-medium", children: user?.role || '손님' })] })] }) }) })] }));
    }
    return _jsx(ThemeSettings, {});
};
export default ThemeSettingsWithAuth;
//# sourceMappingURL=ThemeSettingsWithAuth.js.map
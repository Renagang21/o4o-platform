import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Routes, Route, Navigate, Link, useLocation } from 'react-router-dom';
import { Settings as SettingsIcon, Palette, Users, Mail, Link as LinkIcon } from 'lucide-react';
import ThemeSettingsWithAuth from './ThemeSettingsWithAuth';
const GeneralSettings = () => (_jsx("div", { className: "wp-card", children: _jsx("div", { className: "wp-card-body", children: _jsx("div", { className: "text-center py-12 text-gray-500", children: _jsx("p", { children: "\uC77C\uBC18 \uC124\uC815 \uD398\uC774\uC9C0\uB294 \uAC1C\uBC1C \uC911\uC785\uB2C8\uB2E4." }) }) }) }));
const UserSettings = () => (_jsx("div", { className: "wp-card", children: _jsx("div", { className: "wp-card-body", children: _jsx("div", { className: "text-center py-12 text-gray-500", children: _jsx("p", { children: "\uC0AC\uC6A9\uC790 \uC124\uC815 \uD398\uC774\uC9C0\uB294 \uAC1C\uBC1C \uC911\uC785\uB2C8\uB2E4." }) }) }) }));
const EmailSettings = () => (_jsx("div", { className: "wp-card", children: _jsx("div", { className: "wp-card-body", children: _jsx("div", { className: "text-center py-12 text-gray-500", children: _jsx("p", { children: "\uC774\uBA54\uC77C \uC124\uC815 \uD398\uC774\uC9C0\uB294 \uAC1C\uBC1C \uC911\uC785\uB2C8\uB2E4." }) }) }) }));
const IntegrationSettings = () => (_jsx("div", { className: "wp-card", children: _jsx("div", { className: "wp-card-body", children: _jsx("div", { className: "text-center py-12 text-gray-500", children: _jsx("p", { children: "\uC5F0\uB3D9 \uC124\uC815 \uD398\uC774\uC9C0\uB294 \uAC1C\uBC1C \uC911\uC785\uB2C8\uB2E4." }) }) }) }));
const settingsTabs = [
    { id: 'general', label: '일반 설정', icon: _jsx(SettingsIcon, { className: "w-4 h-4" }), path: '' },
    { id: 'theme', label: '테마 설정', icon: _jsx(Palette, { className: "w-4 h-4" }), path: 'theme' },
    { id: 'users', label: '사용자 설정', icon: _jsx(Users, { className: "w-4 h-4" }), path: 'users' },
    { id: 'email', label: '이메일 설정', icon: _jsx(Mail, { className: "w-4 h-4" }), path: 'email' },
    { id: 'integrations', label: '연동 설정', icon: _jsx(LinkIcon, { className: "w-4 h-4" }), path: 'integrations' }
];
const Settings = () => {
    const location = useLocation();
    const currentPath = location.pathname.split('/').pop() || '';
    return (_jsxs("div", { className: "space-y-6", children: [_jsxs("div", { children: [_jsx("h1", { className: "text-2xl font-bold text-gray-900", children: "\uC124\uC815" }), _jsx("p", { className: "text-gray-600 mt-1", children: "\uC2DC\uC2A4\uD15C \uC124\uC815\uC744 \uAD00\uB9AC\uD569\uB2C8\uB2E4" })] }), _jsx("div", { className: "border-b border-gray-200", children: _jsx("nav", { className: "-mb-px flex space-x-8", children: settingsTabs.map((tab) => {
                        const isActive = tab.path === currentPath || (tab.path === '' && currentPath === 'settings');
                        return (_jsxs(Link, { to: tab.path, className: `
                  flex items-center gap-2 py-2 px-1 border-b-2 font-medium text-sm
                  ${isActive
                                ? 'border-blue-500 text-blue-600'
                                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}
                `, children: [tab.icon, tab.label] }, tab.id));
                    }) }) }), _jsxs(Routes, { children: [_jsx(Route, { index: true, element: _jsx(GeneralSettings, {}) }), _jsx(Route, { path: "theme", element: _jsx(ThemeSettingsWithAuth, {}) }), _jsx(Route, { path: "users", element: _jsx(UserSettings, {}) }), _jsx(Route, { path: "email", element: _jsx(EmailSettings, {}) }), _jsx(Route, { path: "integrations", element: _jsx(IntegrationSettings, {}) }), _jsx(Route, { path: "*", element: _jsx(Navigate, { to: "", replace: true }) })] })] }));
};
export default Settings;
//# sourceMappingURL=Settings.js.map
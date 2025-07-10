import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
import AdminSidebar from './AdminSidebar';
import AdminHeader from './AdminHeader';
import AdminBreadcrumb from '../common/AdminBreadcrumb';
const AdminLayout = ({ children }) => {
    const [sidebarOpen, setSidebarOpen] = useState(false);
    return (_jsxs("div", { className: "min-h-screen bg-gray-50", children: [_jsx(AdminSidebar, { isOpen: sidebarOpen, onClose: () => setSidebarOpen(false) }), _jsxs("div", { className: "lg:pl-64", children: [_jsx(AdminHeader, { onMenuClick: () => setSidebarOpen(true) }), _jsxs("main", { className: "p-6", children: [_jsx(AdminBreadcrumb, {}), children] })] }), sidebarOpen && (_jsx("div", { className: "fixed inset-0 bg-black bg-opacity-50 z-20 lg:hidden", onClick: () => setSidebarOpen(false) }))] }));
};
export default AdminLayout;
//# sourceMappingURL=AdminLayout.js.map
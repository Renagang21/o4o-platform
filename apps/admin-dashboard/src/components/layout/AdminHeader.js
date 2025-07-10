import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useEffect } from 'react';
import { Menu, Bell, User, LogOut, Settings as SettingsIcon, Shield, Clock } from 'lucide-react';
import { useAuth } from '@o4o/auth-context';
import toast from 'react-hot-toast';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger, } from '@/components/ui/dropdown-menu';
const AdminHeader = ({ onMenuClick }) => {
    const { user, logout, getSessionStatus } = useAuth();
    const [sessionStatus, setSessionStatus] = useState(getSessionStatus());
    useEffect(() => {
        const interval = setInterval(() => {
            setSessionStatus(getSessionStatus());
        }, 60000);
        return () => clearInterval(interval);
    }, [getSessionStatus]);
    const handleLogout = async () => {
        try {
            await logout({ reason: 'user_initiated' });
            toast.success('로그아웃되었습니다.');
        }
        catch (error) {
            console.error('Logout failed:', error);
            toast.error('로그아웃 처리 중 오류가 발생했습니다.');
        }
    };
    const getSessionStatusColor = () => {
        switch (sessionStatus.status) {
            case 'active':
                return 'text-green-600';
            case 'expiring_soon':
                return 'text-yellow-600';
            case 'expired':
                return 'text-red-600';
            default:
                return 'text-gray-600';
        }
    };
    const getSessionStatusText = () => {
        switch (sessionStatus.status) {
            case 'active':
                return '활성';
            case 'expiring_soon':
                return `${Math.floor((sessionStatus.remainingSeconds || 0) / 60)}분 남음`;
            case 'expired':
                return '만료됨';
            default:
                return '알 수 없음';
        }
    };
    return (_jsx("header", { className: "bg-white border-b border-gray-200 px-6 py-4", children: _jsxs("div", { className: "flex items-center justify-between", children: [_jsxs("div", { className: "flex items-center gap-4", children: [_jsx("button", { onClick: onMenuClick, className: "lg:hidden p-2 rounded-md text-gray-500 hover:text-gray-700 hover:bg-gray-100", children: _jsx(Menu, { className: "w-6 h-6" }) }), _jsxs("div", { children: [_jsx("h1", { className: "text-xl font-semibold text-gray-900", children: "\uAD00\uB9AC\uC790 \uB300\uC2DC\uBCF4\uB4DC" }), _jsx("p", { className: "text-sm text-gray-500", children: "O4O \uD50C\uB7AB\uD3FC \uD1B5\uD569 \uAD00\uB9AC \uC2DC\uC2A4\uD15C (SSO)" })] })] }), _jsxs("div", { className: "flex items-center gap-4", children: [_jsxs("div", { className: `flex items-center gap-1 text-xs ${getSessionStatusColor()}`, children: [_jsx(Clock, { className: "w-3 h-3" }), _jsxs("span", { children: ["\uC138\uC158: ", getSessionStatusText()] })] }), _jsxs("button", { className: "p-2 rounded-md text-gray-500 hover:text-gray-700 hover:bg-gray-100 relative", children: [_jsx(Bell, { className: "w-6 h-6" }), _jsx("span", { className: "absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-xs rounded-full flex items-center justify-center", children: "3" })] }), _jsxs(DropdownMenu, { children: [_jsx(DropdownMenuTrigger, { asChild: true, children: _jsxs("button", { className: "flex items-center gap-3 p-2 rounded-md text-gray-700 hover:bg-gray-100", children: [_jsx("div", { className: "w-8 h-8 bg-admin-blue text-white rounded-full flex items-center justify-center", children: _jsx(User, { className: "w-4 h-4" }) }), _jsxs("div", { className: "text-left hidden md:block", children: [_jsxs("div", { className: "text-sm font-medium flex items-center gap-1", children: [user?.name || 'Admin', _jsx(Shield, { className: "w-3 h-3 text-blue-600" })] }), _jsx("div", { className: "text-xs text-gray-500", children: user?.email })] })] }) }), _jsxs(DropdownMenuContent, { className: "w-64", align: "end", forceMount: true, children: [_jsx(DropdownMenuLabel, { className: "font-normal", children: _jsxs("div", { className: "flex flex-col space-y-1", children: [_jsxs("div", { className: "font-medium text-gray-900 flex items-center gap-2", children: [_jsx(Shield, { className: "w-4 h-4 text-blue-600" }), user?.name || 'Admin'] }), _jsx("div", { className: "text-sm text-gray-500", children: user?.email }), _jsxs("div", { className: "text-xs text-gray-400", children: ["\uC5ED\uD560: ", user?.role, " | SSO \uC778\uC99D"] })] }) }), _jsx(DropdownMenuSeparator, {}), _jsx("div", { className: "px-2 py-2", children: _jsxs("div", { className: "text-xs text-gray-600 space-y-1", children: [_jsxs("div", { className: "flex justify-between", children: [_jsx("span", { children: "\uC138\uC158 \uC0C1\uD0DC:" }), _jsx("span", { className: getSessionStatusColor(), children: getSessionStatusText() })] }), _jsxs("div", { className: "flex justify-between", children: [_jsx("span", { children: "\uAD8C\uD55C:" }), _jsx("span", { className: "text-green-600", children: "\uD65C\uC131" })] }), _jsxs("div", { className: "flex justify-between", children: [_jsx("span", { children: "\uACC4\uC815:" }), _jsx("span", { className: user?.isApproved ? 'text-green-600' : 'text-yellow-600', children: user?.isApproved ? '승인됨' : '승인대기' })] })] }) }), _jsx(DropdownMenuSeparator, {}), _jsxs(DropdownMenuItem, { onClick: () => {
                                            }, children: [_jsx(User, { className: "mr-2 h-4 w-4" }), "\uD504\uB85C\uD544 \uC124\uC815"] }), _jsxs(DropdownMenuItem, { onClick: () => {
                                            }, children: [_jsx(SettingsIcon, { className: "mr-2 h-4 w-4" }), "\uACC4\uC815 \uC124\uC815"] }), _jsx(DropdownMenuSeparator, {}), _jsx(DropdownMenuLabel, { className: "font-normal", children: _jsx("div", { className: "text-xs text-gray-500", children: "\uBCF4\uC548" }) }), _jsxs(DropdownMenuItem, { onClick: () => {
                                                toast.success('모든 기기에서 로그아웃됩니다.');
                                                logout({ everywhere: true });
                                            }, className: "text-orange-600 focus:text-orange-600 focus:bg-orange-50", children: [_jsx(Shield, { className: "mr-2 h-3 w-3" }), "\uBAA8\uB4E0 \uAE30\uAE30\uC5D0\uC11C \uB85C\uADF8\uC544\uC6C3"] }), _jsx(DropdownMenuSeparator, {}), _jsxs(DropdownMenuItem, { onClick: handleLogout, className: "text-red-600 focus:text-red-600 focus:bg-red-50", children: [_jsx(LogOut, { className: "mr-2 h-4 w-4" }), "\uB85C\uADF8\uC544\uC6C3"] }), _jsx(DropdownMenuSeparator, {}), _jsx("div", { className: "px-2 py-2", children: _jsx("div", { className: "text-xs text-gray-400 text-center", children: "\uD83D\uDD12 \uBCF4\uC548 \uC138\uC158 | 8\uC2DC\uAC04 \uD6C4 \uC790\uB3D9 \uB9CC\uB8CC" }) })] })] })] })] }) }));
};
export default AdminHeader;
//# sourceMappingURL=AdminHeader.js.map
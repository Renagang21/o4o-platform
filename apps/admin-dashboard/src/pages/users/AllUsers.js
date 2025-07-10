import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Users, TrendingUp, AlertTriangle, UserX } from 'lucide-react';
import { UserApi } from '@/api/userApi';
import UserTable from './components/UserTable';
import UserFilters from './components/UserFilters';
import BulkActions from './components/BulkActions';
import toast from 'react-hot-toast';
const AllUsers = () => {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState(null);
    const [selectedUsers, setSelectedUsers] = useState([]);
    const [filters, setFilters] = useState({});
    const [pagination, setPagination] = useState({
        current: 1,
        total: 1,
        count: 0,
        totalItems: 0
    });
    const pageSize = 20;
    const loadUsers = async (page = 1) => {
        try {
            setLoading(true);
            const response = await UserApi.getUsers(page, pageSize, filters);
            setUsers(response.data);
            setPagination(response.pagination);
        }
        catch (error) {
            console.error('Failed to load users:', error);
            toast.error('사용자 목록을 불러오는데 실패했습니다.');
        }
        finally {
            setLoading(false);
        }
    };
    const loadStats = async () => {
        try {
            const response = await UserApi.getUserStats();
            setStats(response.data);
        }
        catch (error) {
            console.error('Failed to load user stats:', error);
        }
    };
    useEffect(() => {
        loadUsers();
    }, [filters]);
    useEffect(() => {
        loadStats();
    }, []);
    const handleSelectUser = (userId) => {
        setSelectedUsers(prev => prev.includes(userId)
            ? prev.filter(id => id !== userId)
            : [...prev, userId]);
    };
    const handleSelectAll = (selected) => {
        setSelectedUsers(selected ? users.map(u => u.id) : []);
    };
    const handleBulkAction = async (action) => {
        try {
            await UserApi.bulkAction({
                ...action,
                userIds: selectedUsers
            });
            toast.success('작업이 완료되었습니다.');
            setSelectedUsers([]);
            loadUsers(pagination.current);
            loadStats();
        }
        catch (error) {
            console.error('Bulk action failed:', error);
            toast.error('작업에 실패했습니다.');
        }
    };
    const handleApprove = async (userId) => {
        try {
            await UserApi.approveUser(userId);
            toast.success('사용자가 승인되었습니다.');
            loadUsers(pagination.current);
            loadStats();
        }
        catch (error) {
            console.error('Failed to approve user:', error);
            toast.error('승인에 실패했습니다.');
        }
    };
    const handleReject = async (userId) => {
        const reason = prompt('거부 사유를 입력해주세요:');
        if (!reason)
            return;
        try {
            await UserApi.rejectUser(userId, reason);
            toast.success('사용자가 거부되었습니다.');
            loadUsers(pagination.current);
            loadStats();
        }
        catch (error) {
            console.error('Failed to reject user:', error);
            toast.error('거부에 실패했습니다.');
        }
    };
    const handleSuspend = async (userId) => {
        const reason = prompt('정지 사유를 입력해주세요:');
        if (!reason)
            return;
        try {
            await UserApi.suspendUser(userId, reason);
            toast.success('사용자가 정지되었습니다.');
            loadUsers(pagination.current);
            loadStats();
        }
        catch (error) {
            console.error('Failed to suspend user:', error);
            toast.error('정지에 실패했습니다.');
        }
    };
    const handleReactivate = async (userId) => {
        try {
            await UserApi.reactivateUser(userId);
            toast.success('사용자가 재활성화되었습니다.');
            loadUsers(pagination.current);
            loadStats();
        }
        catch (error) {
            console.error('Failed to reactivate user:', error);
            toast.error('재활성화에 실패했습니다.');
        }
    };
    const handleExport = async () => {
        try {
            const blob = await UserApi.exportUsers(filters);
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `users_${new Date().toISOString().split('T')[0]}.csv`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
            toast.success('사용자 목록이 내보내졌습니다.');
        }
        catch (error) {
            console.error('Failed to export users:', error);
            toast.error('내보내기에 실패했습니다.');
        }
    };
    const handlePageChange = (page) => {
        loadUsers(page);
    };
    return (_jsxs("div", { className: "space-y-6", children: [_jsxs("div", { className: "flex justify-between items-start", children: [_jsxs("div", { children: [_jsx("h1", { className: "text-2xl font-bold text-gray-900", children: "\uC804\uCCB4 \uC0AC\uC6A9\uC790 \uAD00\uB9AC" }), _jsx("p", { className: "text-gray-600 mt-1", children: "\uD50C\uB7AB\uD3FC\uC758 \uBAA8\uB4E0 \uC0AC\uC6A9\uC790\uB97C \uAD00\uB9AC\uD569\uB2C8\uB2E4" })] }), _jsxs(Link, { to: "/users/add", className: "wp-button-primary", children: [_jsx(Plus, { className: "w-4 h-4 mr-2" }), "\uC0AC\uC6A9\uC790 \uCD94\uAC00"] })] }), stats && (_jsxs("div", { className: "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4", children: [_jsx("div", { className: "wp-card", children: _jsx("div", { className: "wp-card-body", children: _jsxs("div", { className: "flex items-center justify-between", children: [_jsxs("div", { children: [_jsx("p", { className: "text-sm font-medium text-gray-600", children: "\uC804\uCCB4 \uC0AC\uC6A9\uC790" }), _jsx("p", { className: "text-2xl font-bold text-gray-900", children: stats.total.toLocaleString() })] }), _jsx(Users, { className: "w-8 h-8 text-blue-500" })] }) }) }), _jsx("div", { className: "wp-card", children: _jsx("div", { className: "wp-card-body", children: _jsxs("div", { className: "flex items-center justify-between", children: [_jsxs("div", { children: [_jsx("p", { className: "text-sm font-medium text-gray-600", children: "\uC2B9\uC778 \uB300\uAE30" }), _jsx("p", { className: "text-2xl font-bold text-yellow-600", children: stats.pending.toLocaleString() })] }), _jsx(AlertTriangle, { className: "w-8 h-8 text-yellow-500" })] }) }) }), _jsx("div", { className: "wp-card", children: _jsx("div", { className: "wp-card-body", children: _jsxs("div", { className: "flex items-center justify-between", children: [_jsxs("div", { children: [_jsx("p", { className: "text-sm font-medium text-gray-600", children: "\uD65C\uC131 \uC0AC\uC6A9\uC790" }), _jsx("p", { className: "text-2xl font-bold text-green-600", children: stats.approved.toLocaleString() })] }), _jsx(TrendingUp, { className: "w-8 h-8 text-green-500" })] }) }) }), _jsx("div", { className: "wp-card", children: _jsx("div", { className: "wp-card-body", children: _jsxs("div", { className: "flex items-center justify-between", children: [_jsxs("div", { children: [_jsx("p", { className: "text-sm font-medium text-gray-600", children: "\uC815\uC9C0\uB41C \uC0AC\uC6A9\uC790" }), _jsx("p", { className: "text-2xl font-bold text-red-600", children: stats.suspended.toLocaleString() })] }), _jsx(UserX, { className: "w-8 h-8 text-red-500" })] }) }) }), _jsx("div", { className: "wp-card", children: _jsx("div", { className: "wp-card-body", children: _jsxs("div", { className: "flex items-center justify-between", children: [_jsxs("div", { children: [_jsx("p", { className: "text-sm font-medium text-gray-600", children: "\uAC70\uBD80\uB41C \uC0AC\uC6A9\uC790" }), _jsx("p", { className: "text-2xl font-bold text-gray-600", children: stats.rejected.toLocaleString() })] }), _jsx(UserX, { className: "w-8 h-8 text-gray-500" })] }) }) })] })), _jsx(UserFilters, { filters: filters, onFiltersChange: setFilters, onExport: handleExport, onRefresh: () => loadUsers(pagination.current), loading: loading }), _jsx(BulkActions, { selectedCount: selectedUsers.length, onBulkAction: handleBulkAction, onClearSelection: () => setSelectedUsers([]), availableActions: ['approve', 'reject', 'suspend', 'reactivate', 'delete', 'email'] }), _jsxs("div", { className: "wp-card", children: [_jsx("div", { className: "wp-card-header", children: _jsxs("h3", { className: "wp-card-title", children: ["\uC0AC\uC6A9\uC790 \uBAA9\uB85D (", pagination.totalItems.toLocaleString(), "\uBA85)"] }) }), _jsx("div", { className: "wp-card-body p-0", children: loading ? (_jsxs("div", { className: "flex items-center justify-center py-12", children: [_jsx("div", { className: "loading-spinner" }), _jsx("span", { className: "ml-2 text-gray-600", children: "\uB85C\uB529 \uC911..." })] })) : (_jsx(UserTable, { users: users, selectedUsers: selectedUsers, onSelectUser: handleSelectUser, onSelectAll: handleSelectAll, onApprove: handleApprove, onReject: handleReject, onSuspend: handleSuspend, onReactivate: handleReactivate, showActions: true, showBulkSelect: true })) })] }), pagination.total > 1 && (_jsxs("div", { className: "flex items-center justify-between", children: [_jsxs("p", { className: "text-sm text-gray-700", children: ["\uC804\uCCB4 ", _jsx("span", { className: "font-medium", children: pagination.totalItems }), "\uBA85 \uC911", ' ', _jsxs("span", { className: "font-medium", children: [((pagination.current - 1) * pageSize) + 1, "-", Math.min(pagination.current * pageSize, pagination.totalItems)] }), "\uBA85 \uD45C\uC2DC"] }), _jsxs("div", { className: "flex gap-2", children: [_jsx("button", { onClick: () => handlePageChange(pagination.current - 1), disabled: pagination.current === 1, className: "wp-button-secondary", children: "\uC774\uC804" }), Array.from({ length: Math.min(5, pagination.total) }, (_, i) => {
                                const page = i + Math.max(1, pagination.current - 2);
                                if (page > pagination.total)
                                    return null;
                                return (_jsx("button", { onClick: () => handlePageChange(page), className: page === pagination.current ? 'wp-button-primary' : 'wp-button-secondary', children: page }, page));
                            }), _jsx("button", { onClick: () => handlePageChange(pagination.current + 1), disabled: pagination.current === pagination.total, className: "wp-button-secondary", children: "\uB2E4\uC74C" })] })] }))] }));
};
export default AllUsers;
//# sourceMappingURL=AllUsers.js.map
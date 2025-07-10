import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useEffect } from 'react';
import { UserCheck, UserX, Clock, AlertTriangle, Filter } from 'lucide-react';
import { UserApi } from '@/api/userApi';
import UserTable from './components/UserTable';
import BulkActions from './components/BulkActions';
import toast from 'react-hot-toast';
const PendingApproval = () => {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedUsers, setSelectedUsers] = useState([]);
    const [businessTypeFilter, setBusinessTypeFilter] = useState('all');
    const [searchTerm, setSearchTerm] = useState('');
    const [pagination, setPagination] = useState({
        current: 1,
        total: 1,
        count: 0,
        totalItems: 0
    });
    const pageSize = 20;
    const loadPendingUsers = async (page = 1) => {
        try {
            setLoading(true);
            const response = await UserApi.getPendingUsers(page, pageSize, businessTypeFilter !== 'all' ? businessTypeFilter : undefined);
            setUsers(response.data);
            setPagination(response.pagination);
        }
        catch (error) {
            console.error('Failed to load pending users:', error);
            toast.error('승인 대기 사용자 목록을 불러오는데 실패했습니다.');
        }
        finally {
            setLoading(false);
        }
    };
    useEffect(() => {
        loadPendingUsers();
    }, [businessTypeFilter]);
    const filteredUsers = users.filter(user => {
        if (!searchTerm)
            return true;
        const searchLower = searchTerm.toLowerCase();
        return (user.name.toLowerCase().includes(searchLower) ||
            user.email.toLowerCase().includes(searchLower) ||
            user.businessInfo?.businessName?.toLowerCase().includes(searchLower) ||
            user.businessInfo?.businessType?.toLowerCase().includes(searchLower));
    });
    const handleSelectUser = (userId) => {
        setSelectedUsers(prev => prev.includes(userId)
            ? prev.filter(id => id !== userId)
            : [...prev, userId]);
    };
    const handleSelectAll = (selected) => {
        setSelectedUsers(selected ? filteredUsers.map(u => u.id) : []);
    };
    const handleApprove = async (userId) => {
        try {
            await UserApi.approveUser(userId);
            toast.success('사용자가 승인되었습니다.');
            loadPendingUsers(pagination.current);
            setSelectedUsers(prev => prev.filter(id => id !== userId));
        }
        catch (error) {
            console.error('Failed to approve user:', error);
            toast.error('승인에 실패했습니다.');
        }
    };
    const handleReject = async (userId) => {
        const reason = prompt('거부 사유를 입력해주세요:');
        if (!reason?.trim())
            return;
        try {
            await UserApi.rejectUser(userId, reason);
            toast.success('사용자가 거부되었습니다.');
            loadPendingUsers(pagination.current);
            setSelectedUsers(prev => prev.filter(id => id !== userId));
        }
        catch (error) {
            console.error('Failed to reject user:', error);
            toast.error('거부에 실패했습니다.');
        }
    };
    const handleBulkAction = async (action) => {
        try {
            await UserApi.bulkAction({
                ...action,
                userIds: selectedUsers
            });
            toast.success('일괄 작업이 완료되었습니다.');
            setSelectedUsers([]);
            loadPendingUsers(pagination.current);
        }
        catch (error) {
            console.error('Bulk action failed:', error);
            toast.error('일괄 작업에 실패했습니다.');
        }
    };
    const handlePageChange = (page) => {
        loadPendingUsers(page);
    };
    const businessTypes = [...new Set(users.map(u => u.businessInfo?.businessType).filter(Boolean))];
    return (_jsxs("div", { className: "space-y-6", children: [_jsxs("div", { className: "flex justify-between items-start", children: [_jsxs("div", { children: [_jsx("h1", { className: "text-2xl font-bold text-gray-900", children: "\uC2B9\uC778 \uB300\uAE30 \uC0AC\uC6A9\uC790" }), _jsx("p", { className: "text-gray-600 mt-1", children: "\uAC00\uC785 \uC2B9\uC778\uC744 \uAE30\uB2E4\uB9AC\uB294 \uC0AC\uC6A9\uC790\uB4E4\uC744 \uAD00\uB9AC\uD569\uB2C8\uB2E4" })] }), _jsx("div", { className: "bg-yellow-50 border border-yellow-200 rounded-lg p-4", children: _jsxs("div", { className: "flex items-center gap-2", children: [_jsx(AlertTriangle, { className: "w-5 h-5 text-yellow-600" }), _jsxs("span", { className: "text-sm font-medium text-yellow-800", children: [pagination.totalItems, "\uBA85\uC774 \uC2B9\uC778\uC744 \uAE30\uB2E4\uB9AC\uACE0 \uC788\uC2B5\uB2C8\uB2E4"] })] }) })] }), _jsx("div", { className: "wp-card", children: _jsx("div", { className: "wp-card-body", children: _jsxs("div", { className: "flex flex-col sm:flex-row gap-4", children: [_jsx("div", { className: "flex-1", children: _jsx("input", { type: "text", placeholder: "\uC774\uB984, \uC774\uBA54\uC77C, \uC0AC\uC5C5\uCCB4\uBA85\uC73C\uB85C \uAC80\uC0C9...", value: searchTerm, onChange: (e) => setSearchTerm(e.target.value), className: "wp-input" }) }), _jsxs("div", { className: "flex gap-2", children: [_jsxs("select", { value: businessTypeFilter, onChange: (e) => setBusinessTypeFilter(e.target.value), className: "wp-select min-w-[150px]", children: [_jsx("option", { value: "all", children: "\uC804\uCCB4 \uC0AC\uC5C5\uCCB4" }), businessTypes.map((type) => (_jsx("option", { value: type, children: type }, type)))] }), _jsx("button", { onClick: () => loadPendingUsers(pagination.current), disabled: loading, className: "wp-button-secondary", title: "\uC0C8\uB85C\uACE0\uCE68", children: _jsx(Filter, { className: `w-4 h-4 ${loading ? 'animate-spin' : ''}` }) })] })] }) }) }), _jsx(BulkActions, { selectedCount: selectedUsers.length, onBulkAction: handleBulkAction, onClearSelection: () => setSelectedUsers([]), availableActions: ['approve', 'reject'] }), filteredUsers.length > 0 && (_jsx("div", { className: "wp-notice-info", children: _jsxs("div", { className: "flex items-center gap-2", children: [_jsx(Clock, { className: "w-5 h-5" }), _jsxs("div", { children: [_jsx("p", { className: "font-medium", children: "\uC2B9\uC778 \uCC98\uB9AC \uC548\uB0B4" }), _jsx("p", { className: "text-sm mt-1", children: "\uC0AC\uC5C5\uC790 \uD68C\uC6D0\uC758 \uACBD\uC6B0 \uC0AC\uC5C5\uC790\uB4F1\uB85D\uBC88\uD638\uC640 \uC0AC\uC5C5\uCCB4 \uC815\uBCF4\uB97C \uBC18\uB4DC\uC2DC \uD655\uC778\uD574\uC8FC\uC138\uC694. \uC2B9\uC778 \uD6C4 \uB3C4\uB9E4\uAC00\uACA9\uC73C\uB85C \uAD6C\uB9E4\uD560 \uC218 \uC788\uC2B5\uB2C8\uB2E4." })] })] }) })), _jsxs("div", { className: "wp-card", children: [_jsx("div", { className: "wp-card-header", children: _jsxs("h3", { className: "wp-card-title", children: ["\uC2B9\uC778 \uB300\uAE30 \uBAA9\uB85D (", filteredUsers.length, "\uBA85)"] }) }), _jsx("div", { className: "wp-card-body p-0", children: loading ? (_jsxs("div", { className: "flex items-center justify-center py-12", children: [_jsx("div", { className: "loading-spinner" }), _jsx("span", { className: "ml-2 text-gray-600", children: "\uB85C\uB529 \uC911..." })] })) : filteredUsers.length === 0 ? (_jsxs("div", { className: "text-center py-12 text-gray-500", children: [_jsx(Clock, { className: "w-12 h-12 text-gray-300 mx-auto mb-4" }), _jsx("p", { className: "text-lg font-medium mb-2", children: "\uC2B9\uC778 \uB300\uAE30 \uC911\uC778 \uC0AC\uC6A9\uC790\uAC00 \uC5C6\uC2B5\uB2C8\uB2E4" }), _jsx("p", { className: "text-sm", children: "\uBAA8\uB4E0 \uC2E0\uADDC \uAC00\uC785\uC790\uAC00 \uCC98\uB9AC\uB418\uC5C8\uC2B5\uB2C8\uB2E4." })] })) : (_jsx(UserTable, { users: filteredUsers, selectedUsers: selectedUsers, onSelectUser: handleSelectUser, onSelectAll: handleSelectAll, onApprove: handleApprove, onReject: handleReject, showActions: true, showBulkSelect: true })) })] }), filteredUsers.length > 0 && (_jsx("div", { className: "wp-card border-l-4 border-l-yellow-500", children: _jsxs("div", { className: "wp-card-body", children: [_jsx("h4", { className: "font-medium text-gray-900 mb-3", children: "\uBE60\uB978 \uC561\uC158" }), _jsxs("div", { className: "grid grid-cols-1 sm:grid-cols-2 gap-4", children: [_jsxs("div", { className: "flex items-center justify-between p-3 bg-green-50 rounded-lg", children: [_jsxs("div", { children: [_jsx("p", { className: "font-medium text-green-800", children: "\uBAA8\uB4E0 \uC0AC\uC6A9\uC790 \uC2B9\uC778" }), _jsx("p", { className: "text-sm text-green-600", children: "\uD604\uC7AC \uD398\uC774\uC9C0\uC758 \uBAA8\uB4E0 \uC0AC\uC6A9\uC790\uB97C \uC2B9\uC778\uD569\uB2C8\uB2E4" })] }), _jsxs("button", { onClick: () => {
                                                if (confirm('현재 페이지의 모든 사용자를 승인하시겠습니까?')) {
                                                    handleBulkAction({
                                                        action: 'approve',
                                                        userIds: filteredUsers.map(u => u.id)
                                                    });
                                                }
                                            }, className: "wp-button bg-green-600 text-white hover:bg-green-700", children: [_jsx(UserCheck, { className: "w-4 h-4 mr-1" }), "\uC804\uCCB4 \uC2B9\uC778"] })] }), _jsxs("div", { className: "flex items-center justify-between p-3 bg-red-50 rounded-lg", children: [_jsxs("div", { children: [_jsx("p", { className: "font-medium text-red-800", children: "\uC758\uC2EC\uC2A4\uB7EC\uC6B4 \uAC00\uC785 \uC2E0\uACE0" }), _jsx("p", { className: "text-sm text-red-600", children: "\uC2A4\uD338\uC774\uB098 \uAC00\uC9DC \uACC4\uC815\uC744 \uC2E0\uACE0\uD569\uB2C8\uB2E4" })] }), _jsxs("button", { onClick: () => alert('신고 기능은 개발 중입니다.'), className: "wp-button bg-red-600 text-white hover:bg-red-700", children: [_jsx(UserX, { className: "w-4 h-4 mr-1" }), "\uC2E0\uACE0\uD558\uAE30"] })] })] })] }) })), pagination.total > 1 && (_jsxs("div", { className: "flex items-center justify-between", children: [_jsxs("p", { className: "text-sm text-gray-700", children: ["\uC804\uCCB4 ", _jsx("span", { className: "font-medium", children: pagination.totalItems }), "\uBA85 \uC911", ' ', _jsxs("span", { className: "font-medium", children: [((pagination.current - 1) * pageSize) + 1, "-", Math.min(pagination.current * pageSize, pagination.totalItems)] }), "\uBA85 \uD45C\uC2DC"] }), _jsxs("div", { className: "flex gap-2", children: [_jsx("button", { onClick: () => handlePageChange(pagination.current - 1), disabled: pagination.current === 1, className: "wp-button-secondary", children: "\uC774\uC804" }), Array.from({ length: Math.min(5, pagination.total) }, (_, i) => {
                                const page = i + Math.max(1, pagination.current - 2);
                                if (page > pagination.total)
                                    return null;
                                return (_jsx("button", { onClick: () => handlePageChange(page), className: page === pagination.current ? 'wp-button-primary' : 'wp-button-secondary', children: page }, page));
                            }), _jsx("button", { onClick: () => handlePageChange(pagination.current + 1), disabled: pagination.current === pagination.total, className: "wp-button-secondary", children: "\uB2E4\uC74C" })] })] }))] }));
};
export default PendingApproval;
//# sourceMappingURL=PendingApproval.js.map
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Link } from 'react-router-dom';
import { ROLE_LABELS, STATUS_LABELS } from '@/types/user';
import { Eye, Edit, UserCheck, UserX, UserMinus, Trash2 } from 'lucide-react';
const UserTable = ({ users, selectedUsers, onSelectUser, onSelectAll, onApprove, onReject, onSuspend, onReactivate, onDelete, showActions = true, showBulkSelect = true }) => {
    const getRoleBadge = (role) => {
        const colors = {
            admin: 'bg-red-100 text-red-800',
            business: 'bg-blue-100 text-blue-800',
            affiliate: 'bg-purple-100 text-purple-800',
            customer: 'bg-green-100 text-green-800'
        };
        return (_jsx("span", { className: `px-2 py-1 text-xs font-medium rounded-full ${colors[role]}`, children: ROLE_LABELS[role] }));
    };
    const getStatusBadge = (status) => {
        const colors = {
            pending: 'bg-yellow-100 text-yellow-800',
            approved: 'bg-green-100 text-green-800',
            rejected: 'bg-red-100 text-red-800',
            suspended: 'bg-gray-100 text-gray-800'
        };
        return (_jsx("span", { className: `px-2 py-1 text-xs font-medium rounded-full ${colors[status]}`, children: STATUS_LABELS[status] }));
    };
    const formatDate = (dateString) => {
        return new Date(dateString).toLocaleDateString('ko-KR', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    };
    const allSelected = users.length > 0 && selectedUsers.length === users.length;
    const someSelected = selectedUsers.length > 0 && selectedUsers.length < users.length;
    return (_jsxs("div", { className: "overflow-x-auto", children: [_jsxs("table", { className: "wp-table", children: [_jsx("thead", { children: _jsxs("tr", { children: [showBulkSelect && (_jsx("th", { className: "w-12", children: _jsx("input", { type: "checkbox", checked: allSelected, ref: input => {
                                            if (input)
                                                input.indeterminate = someSelected;
                                        }, onChange: (e) => onSelectAll(e.target.checked), className: "rounded border-gray-300 text-admin-blue focus:ring-admin-blue" }) })), _jsx("th", { children: "\uC0AC\uC6A9\uC790 \uC815\uBCF4" }), _jsx("th", { children: "\uC5ED\uD560" }), _jsx("th", { children: "\uC0C1\uD0DC" }), _jsx("th", { children: "\uC0AC\uC5C5\uCCB4 \uC815\uBCF4" }), _jsx("th", { children: "\uAC00\uC785\uC77C" }), _jsx("th", { children: "\uB9C8\uC9C0\uB9C9 \uB85C\uADF8\uC778" }), showActions && _jsx("th", { children: "\uC791\uC5C5" })] }) }), _jsx("tbody", { children: users.map((user) => (_jsxs("tr", { children: [showBulkSelect && (_jsx("td", { children: _jsx("input", { type: "checkbox", checked: selectedUsers.includes(user.id), onChange: () => onSelectUser(user.id), className: "rounded border-gray-300 text-admin-blue focus:ring-admin-blue" }) })), _jsx("td", { children: _jsxs("div", { className: "flex items-center gap-3", children: [user.profileImage ? (_jsx("img", { src: user.profileImage, alt: user.name, className: "w-8 h-8 rounded-full" })) : (_jsx("div", { className: "w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center", children: _jsx("span", { className: "text-xs font-medium text-gray-600", children: user.name.charAt(0) }) })), _jsxs("div", { children: [_jsx("div", { className: "font-medium text-gray-900", children: user.name }), _jsx("div", { className: "text-sm text-gray-500", children: user.email }), user.phone && (_jsx("div", { className: "text-sm text-gray-500", children: user.phone })), !user.isEmailVerified && (_jsx("span", { className: "text-xs text-orange-600", children: "\uC774\uBA54\uC77C \uBBF8\uC778\uC99D" }))] })] }) }), _jsx("td", { children: getRoleBadge(user.role) }), _jsx("td", { children: getStatusBadge(user.status) }), _jsx("td", { children: user.businessInfo ? (_jsxs("div", { className: "text-sm", children: [_jsx("div", { className: "font-medium", children: user.businessInfo.businessName }), _jsx("div", { className: "text-gray-500", children: user.businessInfo.businessType }), user.businessInfo.businessNumber && (_jsxs("div", { className: "text-xs text-gray-400", children: ["\uC0AC\uC5C5\uC790\uBC88\uD638: ", user.businessInfo.businessNumber] }))] })) : (_jsx("span", { className: "text-gray-400", children: "-" })) }), _jsx("td", { className: "text-sm text-gray-500", children: formatDate(user.createdAt) }), _jsx("td", { className: "text-sm text-gray-500", children: user.lastLoginAt ? formatDate(user.lastLoginAt) : '없음' }), showActions && (_jsx("td", { children: _jsxs("div", { className: "flex items-center gap-2", children: [_jsx(Link, { to: `/users/${user.id}`, className: "text-blue-600 hover:text-blue-700", title: "\uC0C1\uC138\uBCF4\uAE30", children: _jsx(Eye, { className: "w-4 h-4" }) }), _jsx(Link, { to: `/users/${user.id}/edit`, className: "text-green-600 hover:text-green-700", title: "\uD3B8\uC9D1", children: _jsx(Edit, { className: "w-4 h-4" }) }), user.status === 'pending' && onApprove && (_jsx("button", { onClick: () => onApprove(user.id), className: "text-green-600 hover:text-green-700", title: "\uC2B9\uC778", children: _jsx(UserCheck, { className: "w-4 h-4" }) })), user.status === 'pending' && onReject && (_jsx("button", { onClick: () => onReject(user.id), className: "text-red-600 hover:text-red-700", title: "\uAC70\uBD80", children: _jsx(UserX, { className: "w-4 h-4" }) })), user.status === 'approved' && onSuspend && (_jsx("button", { onClick: () => onSuspend(user.id), className: "text-orange-600 hover:text-orange-700", title: "\uC815\uC9C0", children: _jsx(UserMinus, { className: "w-4 h-4" }) })), user.status === 'suspended' && onReactivate && (_jsx("button", { onClick: () => onReactivate(user.id), className: "text-blue-600 hover:text-blue-700", title: "\uC7AC\uD65C\uC131\uD654", children: _jsx(UserCheck, { className: "w-4 h-4" }) })), onDelete && (_jsx("button", { onClick: () => onDelete(user.id), className: "text-red-600 hover:text-red-700", title: "\uC0AD\uC81C", children: _jsx(Trash2, { className: "w-4 h-4" }) }))] }) }))] }, user.id))) })] }), users.length === 0 && (_jsx("div", { className: "text-center py-12 text-gray-500", children: _jsx("p", { children: "\uC0AC\uC6A9\uC790\uAC00 \uC5C6\uC2B5\uB2C8\uB2E4." }) }))] }));
};
export default UserTable;
//# sourceMappingURL=UserTable.js.map
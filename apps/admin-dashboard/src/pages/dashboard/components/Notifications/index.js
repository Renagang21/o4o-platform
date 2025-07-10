import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useState } from 'react';
import NotificationItem from './NotificationItem';
import NotificationBadge from './NotificationBadge';
import { Bell, Filter, X, CheckCheck, AlertTriangle } from 'lucide-react';
const Notifications = ({ notifications = [], isLoading = false }) => {
    const [filter, setFilter] = useState('all');
    const [showOnlyUnread, setShowOnlyUnread] = useState(false);
    const filteredNotifications = notifications.filter(notification => {
        const typeMatch = filter === 'all' || notification.type === filter;
        const readMatch = !showOnlyUnread || !notification.read;
        return typeMatch && readMatch;
    });
    const counts = notifications.reduce((acc, notification) => {
        acc[notification.type] = (acc[notification.type] || 0) + 1;
        if (!notification.read) {
            acc.unread = (acc.unread || 0) + 1;
        }
        return acc;
    }, {});
    const filters = [
        { key: 'all', label: '전체', count: notifications.length, color: 'gray' },
        { key: 'urgent', label: '긴급', count: counts.urgent || 0, color: 'red' },
        { key: 'approval', label: '승인', count: counts.approval || 0, color: 'orange' },
        { key: 'success', label: '성과', count: counts.success || 0, color: 'green' },
        { key: 'info', label: '정보', count: counts.info || 0, color: 'blue' }
    ];
    const handleMarkAllRead = () => {
        console.log('Mark all notifications as read');
    };
    const handleClearAll = () => {
        console.log('Clear all notifications');
    };
    if (isLoading) {
        return (_jsxs("div", { className: "wp-card", children: [_jsx("div", { className: "wp-card-header", children: _jsx("div", { className: "h-6 bg-gray-200 rounded w-32 animate-pulse" }) }), _jsx("div", { className: "wp-card-body", children: _jsx("div", { className: "space-y-3", children: [1, 2, 3, 4].map(i => (_jsx("div", { className: "h-16 bg-gray-100 rounded animate-pulse" }, i))) }) })] }));
    }
    return (_jsxs("div", { className: "wp-card", children: [_jsx("div", { className: "wp-card-header", children: _jsxs("div", { className: "flex items-center justify-between", children: [_jsxs("div", { className: "flex items-center", children: [_jsx(Bell, { className: "w-5 h-5 text-blue-600 mr-2" }), _jsx("h3", { className: "wp-card-title", children: "\uC54C\uB9BC" }), counts.unread > 0 && (_jsx(NotificationBadge, { count: counts.unread, className: "ml-2" }))] }), _jsx("div", { className: "flex items-center space-x-2", children: notifications.length > 0 && (_jsxs(_Fragment, { children: [_jsx("button", { onClick: handleMarkAllRead, className: "text-xs text-blue-600 hover:text-blue-800 transition-colors", title: "\uBAA8\uB450 \uC77D\uC74C \uCC98\uB9AC", children: _jsx(CheckCheck, { className: "w-4 h-4" }) }), _jsx("button", { onClick: handleClearAll, className: "text-xs text-gray-400 hover:text-gray-600 transition-colors", title: "\uBAA8\uB4E0 \uC54C\uB9BC \uC0AD\uC81C", children: _jsx(X, { className: "w-4 h-4" }) })] })) })] }) }), _jsxs("div", { className: "wp-card-body", children: [_jsx("div", { className: "mb-4", children: _jsxs("div", { className: "flex items-center justify-between mb-3", children: [_jsx("div", { className: "flex flex-wrap gap-2", children: filters.map(filterOption => (_jsxs("button", { onClick: () => setFilter(filterOption.key), className: `
                    px-3 py-1 text-xs rounded-full border transition-colors
                    ${filter === filterOption.key
                                            ? `border-${filterOption.color}-300 bg-${filterOption.color}-50 text-${filterOption.color}-700`
                                            : 'border-gray-200 bg-gray-50 text-gray-600 hover:bg-gray-100'}
                  `, children: [filterOption.label, filterOption.count > 0 && (_jsxs("span", { className: "ml-1 font-medium", children: ["(", filterOption.count, ")"] }))] }, filterOption.key))) }), _jsxs("div", { className: "flex items-center", children: [_jsx("input", { type: "checkbox", id: "unread-only", checked: showOnlyUnread, onChange: (e) => setShowOnlyUnread(e.target.checked), className: "mr-2 text-blue-600" }), _jsx("label", { htmlFor: "unread-only", className: "text-xs text-gray-600", children: "\uC77D\uC9C0 \uC54A\uC74C\uB9CC" })] })] }) }), _jsx("div", { className: "space-y-3 max-h-96 overflow-y-auto", children: filteredNotifications.length > 0 ? (filteredNotifications.map(notification => (_jsx(NotificationItem, { notification: notification }, notification.id)))) : (_jsx("div", { className: "text-center py-8", children: filter === 'all' && !showOnlyUnread ? (_jsxs("div", { children: [_jsx(Bell, { className: "w-12 h-12 text-gray-300 mx-auto mb-3" }), _jsx("p", { className: "text-gray-500 text-sm", children: "\uC0C8\uB85C\uC6B4 \uC54C\uB9BC\uC774 \uC5C6\uC2B5\uB2C8\uB2E4" }), _jsx("p", { className: "text-gray-400 text-xs mt-1", children: "\uBAA8\uB4E0 \uC791\uC5C5\uC774 \uC815\uC0C1\uC801\uC73C\uB85C \uCC98\uB9AC\uB418\uACE0 \uC788\uC2B5\uB2C8\uB2E4" })] })) : (_jsxs("div", { children: [_jsx(Filter, { className: "w-12 h-12 text-gray-300 mx-auto mb-3" }), _jsxs("p", { className: "text-gray-500 text-sm", children: [filter === 'all' ? '읽지 않은' : filters.find(f => f.key === filter)?.label, "\uC54C\uB9BC\uC774 \uC5C6\uC2B5\uB2C8\uB2E4"] }), _jsx("button", { onClick: () => {
                                            setFilter('all');
                                            setShowOnlyUnread(false);
                                        }, className: "text-blue-600 text-xs mt-2 hover:underline", children: "\uBAA8\uB4E0 \uC54C\uB9BC \uBCF4\uAE30" })] })) })) }), counts.urgent > 0 && (_jsx("div", { className: "mt-4 p-3 bg-red-50 border border-red-200 rounded-lg", children: _jsxs("div", { className: "flex items-center", children: [_jsx(AlertTriangle, { className: "w-4 h-4 text-red-600 mr-2" }), _jsxs("span", { className: "text-sm text-red-700", children: [_jsxs("strong", { children: [counts.urgent, "\uAC1C"] }), "\uC758 \uAE34\uAE09 \uC54C\uB9BC\uC774 \uC788\uC2B5\uB2C8\uB2E4"] })] }) })), notifications.length > 0 && (_jsx("div", { className: "mt-4 pt-3 border-t border-gray-200", children: _jsxs("div", { className: "grid grid-cols-3 gap-4 text-center", children: [_jsxs("div", { children: [_jsx("p", { className: "text-xs text-gray-500", children: "\uCD1D \uC54C\uB9BC" }), _jsx("p", { className: "text-sm font-semibold text-gray-900", children: notifications.length })] }), _jsxs("div", { children: [_jsx("p", { className: "text-xs text-gray-500", children: "\uC77D\uC9C0 \uC54A\uC74C" }), _jsx("p", { className: "text-sm font-semibold text-orange-600", children: counts.unread || 0 })] }), _jsxs("div", { children: [_jsx("p", { className: "text-xs text-gray-500", children: "\uAE34\uAE09" }), _jsx("p", { className: "text-sm font-semibold text-red-600", children: counts.urgent || 0 })] })] }) }))] })] }));
};
export default Notifications;
//# sourceMappingURL=index.js.map
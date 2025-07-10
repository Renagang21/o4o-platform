import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
import ActivityItem from './ActivityItem';
import { Activity, Filter, RefreshCw } from 'lucide-react';
const ActivityFeed = ({ activities = [], isLoading = false, onRefresh }) => {
    const [filter, setFilter] = useState('all');
    const filteredActivities = activities.filter(activity => filter === 'all' || activity.type === filter);
    const counts = activities.reduce((acc, activity) => {
        acc[activity.type] = (acc[activity.type] || 0) + 1;
        return acc;
    }, {});
    const filters = [
        { key: 'all', label: '전체', count: activities.length, color: 'gray' },
        { key: 'user', label: '사용자', count: counts.user || 0, color: 'blue' },
        { key: 'order', label: '주문', count: counts.order || 0, color: 'green' },
        { key: 'product', label: '상품', count: counts.product || 0, color: 'purple' },
        { key: 'content', label: '콘텐츠', count: counts.content || 0, color: 'orange' }
    ];
    const getTypeColor = (type) => {
        const colors = {
            user: 'text-blue-600',
            order: 'text-green-600',
            product: 'text-purple-600',
            content: 'text-orange-600'
        };
        return colors[type] || 'text-gray-600';
    };
    if (isLoading) {
        return (_jsxs("div", { className: "wp-card", children: [_jsx("div", { className: "wp-card-header", children: _jsx("div", { className: "h-6 bg-gray-200 rounded w-24 animate-pulse" }) }), _jsx("div", { className: "wp-card-body", children: _jsx("div", { className: "space-y-3", children: [1, 2, 3, 4, 5].map(i => (_jsxs("div", { className: "flex items-start space-x-3", children: [_jsx("div", { className: "w-8 h-8 bg-gray-200 rounded-full animate-pulse" }), _jsxs("div", { className: "flex-1", children: [_jsx("div", { className: "h-4 bg-gray-200 rounded w-3/4 mb-2 animate-pulse" }), _jsx("div", { className: "h-3 bg-gray-200 rounded w-1/2 animate-pulse" })] })] }, i))) }) })] }));
    }
    return (_jsxs("div", { className: "wp-card", children: [_jsx("div", { className: "wp-card-header", children: _jsxs("div", { className: "flex items-center justify-between", children: [_jsxs("div", { className: "flex items-center", children: [_jsx(Activity, { className: "w-5 h-5 text-green-600 mr-2" }), _jsx("h3", { className: "wp-card-title", children: "\uCD5C\uADFC \uD65C\uB3D9" }), _jsxs("span", { className: "ml-2 text-xs text-gray-500", children: ["(", activities.length, "\uAC1C)"] })] }), onRefresh && (_jsx("button", { onClick: onRefresh, className: "p-1 text-gray-400 hover:text-gray-600 transition-colors", title: "\uD65C\uB3D9 \uC0C8\uB85C\uACE0\uCE68", children: _jsx(RefreshCw, { className: "w-4 h-4" }) }))] }) }), _jsxs("div", { className: "wp-card-body", children: [_jsx("div", { className: "mb-4", children: _jsx("div", { className: "flex flex-wrap gap-2", children: filters.map(filterOption => (_jsxs("button", { onClick: () => setFilter(filterOption.key), className: `
                  px-3 py-1 text-xs rounded-full border transition-colors
                  ${filter === filterOption.key
                                    ? 'border-blue-300 bg-blue-50 text-blue-700'
                                    : 'border-gray-200 bg-gray-50 text-gray-600 hover:bg-gray-100'}
                `, children: [filterOption.label, filterOption.count > 0 && (_jsxs("span", { className: "ml-1 font-medium", children: ["(", filterOption.count, ")"] }))] }, filterOption.key))) }) }), _jsx("div", { className: "space-y-3 max-h-96 overflow-y-auto", children: filteredActivities.length > 0 ? (filteredActivities.map(activity => (_jsx(ActivityItem, { activity: activity, typeColor: getTypeColor(activity.type) }, activity.id)))) : (_jsx("div", { className: "text-center py-8", children: filter === 'all' ? (_jsxs("div", { children: [_jsx(Activity, { className: "w-12 h-12 text-gray-300 mx-auto mb-3" }), _jsx("p", { className: "text-gray-500 text-sm", children: "\uCD5C\uADFC \uD65C\uB3D9\uC774 \uC5C6\uC2B5\uB2C8\uB2E4" }), _jsx("p", { className: "text-gray-400 text-xs mt-1", children: "\uC2DC\uC2A4\uD15C\uC774 \uC870\uC6A9\uD788 \uC6B4\uC601\uB418\uACE0 \uC788\uC2B5\uB2C8\uB2E4" })] })) : (_jsxs("div", { children: [_jsx(Filter, { className: "w-12 h-12 text-gray-300 mx-auto mb-3" }), _jsxs("p", { className: "text-gray-500 text-sm", children: [filters.find(f => f.key === filter)?.label, " \uAD00\uB828 \uD65C\uB3D9\uC774 \uC5C6\uC2B5\uB2C8\uB2E4"] }), _jsx("button", { onClick: () => setFilter('all'), className: "text-blue-600 text-xs mt-2 hover:underline", children: "\uBAA8\uB4E0 \uD65C\uB3D9 \uBCF4\uAE30" })] })) })) }), activities.length > 0 && (_jsx("div", { className: "mt-4 pt-3 border-t border-gray-200", children: _jsxs("div", { className: "grid grid-cols-4 gap-4 text-center", children: [_jsxs("div", { children: [_jsx("p", { className: "text-xs text-gray-500", children: "\uC0AC\uC6A9\uC790" }), _jsx("p", { className: `text-sm font-semibold ${getTypeColor('user')}`, children: counts.user || 0 })] }), _jsxs("div", { children: [_jsx("p", { className: "text-xs text-gray-500", children: "\uC8FC\uBB38" }), _jsx("p", { className: `text-sm font-semibold ${getTypeColor('order')}`, children: counts.order || 0 })] }), _jsxs("div", { children: [_jsx("p", { className: "text-xs text-gray-500", children: "\uC0C1\uD488" }), _jsx("p", { className: `text-sm font-semibold ${getTypeColor('product')}`, children: counts.product || 0 })] }), _jsxs("div", { children: [_jsx("p", { className: "text-xs text-gray-500", children: "\uCF58\uD150\uCE20" }), _jsx("p", { className: `text-sm font-semibold ${getTypeColor('content')}`, children: counts.content || 0 })] })] }) })), _jsxs("div", { className: "mt-4 flex items-center justify-center text-xs text-gray-500", children: [_jsx("div", { className: "w-2 h-2 bg-green-400 rounded-full mr-2 animate-pulse" }), _jsx("span", { children: "\uC2E4\uC2DC\uAC04 \uD65C\uB3D9 \uBAA8\uB2C8\uD130\uB9C1" })] })] })] }));
};
export default ActivityFeed;
//# sourceMappingURL=index.js.map
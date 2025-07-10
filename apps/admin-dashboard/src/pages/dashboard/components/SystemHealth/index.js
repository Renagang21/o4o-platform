import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
import { Server, Database, HardDrive, HardDrive as MemoryIcon, Wifi, Clock, AlertTriangle, CheckCircle, XCircle, RefreshCw, TrendingUp } from 'lucide-react';
const SystemHealth = ({ health, isLoading = false, onRefresh }) => {
    const [expandedDetails, setExpandedDetails] = useState(false);
    const getStatusConfig = (status) => {
        switch (status) {
            case 'healthy':
                return {
                    icon: _jsx(CheckCircle, { className: "w-4 h-4" }),
                    color: 'text-green-600',
                    bgColor: 'bg-green-50',
                    borderColor: 'border-green-200',
                    label: '정상'
                };
            case 'warning':
                return {
                    icon: _jsx(AlertTriangle, { className: "w-4 h-4" }),
                    color: 'text-yellow-600',
                    bgColor: 'bg-yellow-50',
                    borderColor: 'border-yellow-200',
                    label: '주의'
                };
            case 'error':
                return {
                    icon: _jsx(XCircle, { className: "w-4 h-4" }),
                    color: 'text-red-600',
                    bgColor: 'bg-red-50',
                    borderColor: 'border-red-200',
                    label: '오류'
                };
            default:
                return {
                    icon: _jsx(Clock, { className: "w-4 h-4" }),
                    color: 'text-gray-600',
                    bgColor: 'bg-gray-50',
                    borderColor: 'border-gray-200',
                    label: '확인 중'
                };
        }
    };
    const formatBytes = (bytes) => {
        return `${bytes.toFixed(1)}GB`;
    };
    const formatPercentage = (used, total) => {
        return ((used / total) * 100).toFixed(1);
    };
    const getOverallStatus = () => {
        if (!health)
            return 'error';
        const statuses = [health.api.status, health.database.status, health.storage.status, health.memory.status];
        if (statuses.includes('error'))
            return 'error';
        if (statuses.includes('warning'))
            return 'warning';
        return 'healthy';
    };
    if (isLoading) {
        return (_jsxs("div", { className: "wp-card", children: [_jsx("div", { className: "wp-card-header", children: _jsx("div", { className: "h-6 bg-gray-200 rounded w-28 animate-pulse" }) }), _jsx("div", { className: "wp-card-body", children: _jsx("div", { className: "space-y-3", children: [1, 2, 3, 4].map(i => (_jsxs("div", { className: "flex items-center justify-between", children: [_jsxs("div", { className: "flex items-center", children: [_jsx("div", { className: "w-4 h-4 bg-gray-200 rounded animate-pulse mr-3" }), _jsx("div", { className: "h-4 bg-gray-200 rounded w-20 animate-pulse" })] }), _jsx("div", { className: "h-4 bg-gray-200 rounded w-12 animate-pulse" })] }, i))) }) })] }));
    }
    const overallStatus = getOverallStatus();
    const overallConfig = getStatusConfig(overallStatus);
    const systemComponents = [
        {
            key: 'api',
            name: 'API 서버',
            icon: _jsx(Server, { className: "w-4 h-4" }),
            data: health?.api,
            details: health?.api ? `응답시간: ${health.api.responseTime}ms` : ''
        },
        {
            key: 'database',
            name: '데이터베이스',
            icon: _jsx(Database, { className: "w-4 h-4" }),
            data: health?.database,
            details: health?.database ? `연결수: ${health.database.connections}개` : ''
        },
        {
            key: 'storage',
            name: '스토리지',
            icon: _jsx(HardDrive, { className: "w-4 h-4" }),
            data: health?.storage,
            details: health?.storage ?
                `${formatBytes(health.storage.usage)} / ${formatBytes(health.storage.total)} (${formatPercentage(health.storage.usage, health.storage.total)}%)` : ''
        },
        {
            key: 'memory',
            name: '메모리',
            icon: _jsx(MemoryIcon, { className: "w-4 h-4" }),
            data: health?.memory,
            details: health?.memory ?
                `${formatBytes(health.memory.usage)} / ${formatBytes(health.memory.total)} (${formatPercentage(health.memory.usage, health.memory.total)}%)` : ''
        }
    ];
    return (_jsxs("div", { className: "wp-card", children: [_jsx("div", { className: "wp-card-header", children: _jsxs("div", { className: "flex items-center justify-between", children: [_jsxs("div", { className: "flex items-center", children: [_jsx(Wifi, { className: "w-5 h-5 text-blue-600 mr-2" }), _jsx("h3", { className: "wp-card-title", children: "\uC2DC\uC2A4\uD15C \uC0C1\uD0DC" }), _jsx("div", { className: `
              ml-3 px-2 py-1 rounded-full text-xs font-medium
              ${overallConfig.bgColor} ${overallConfig.color}
            `, children: _jsxs("div", { className: "flex items-center", children: [overallConfig.icon, _jsx("span", { className: "ml-1", children: overallConfig.label })] }) })] }), _jsxs("div", { className: "flex items-center space-x-2", children: [_jsx("button", { onClick: () => setExpandedDetails(!expandedDetails), className: "text-xs text-gray-500 hover:text-gray-700 transition-colors", children: expandedDetails ? '간단히' : '자세히' }), onRefresh && (_jsx("button", { onClick: onRefresh, className: "p-1 text-gray-400 hover:text-gray-600 transition-colors", title: "\uC0C1\uD0DC \uC0C8\uB85C\uACE0\uCE68", children: _jsx(RefreshCw, { className: "w-4 h-4" }) }))] })] }) }), _jsxs("div", { className: "wp-card-body", children: [_jsx("div", { className: "space-y-3", children: systemComponents.map(component => {
                            const data = component.data;
                            const config = data ? getStatusConfig(data.status) : getStatusConfig('error');
                            return (_jsxs("div", { className: "space-y-2", children: [_jsxs("div", { className: "flex items-center justify-between p-3 bg-gray-50 rounded-lg", children: [_jsxs("div", { className: "flex items-center", children: [_jsx("div", { className: `
                      w-8 h-8 rounded-lg flex items-center justify-center mr-3
                      ${config.bgColor}
                    `, children: _jsx("div", { className: config.color, children: component.icon }) }), _jsxs("div", { children: [_jsx("p", { className: "text-sm font-medium text-gray-900", children: component.name }), expandedDetails && component.details && (_jsx("p", { className: "text-xs text-gray-500", children: component.details }))] })] }), _jsx("div", { className: "flex items-center", children: _jsx("span", { className: `
                      px-2 py-1 text-xs rounded-full font-medium
                      ${config.bgColor} ${config.color}
                    `, children: config.label }) })] }), expandedDetails && (component.key === 'storage' || component.key === 'memory') && data && 'usage' in data && 'total' in data && (_jsx("div", { className: "ml-11 space-y-2", children: _jsxs("div", { children: [_jsxs("div", { className: "flex items-center justify-between text-xs text-gray-600 mb-1", children: [_jsx("span", { children: "\uC0AC\uC6A9\uB7C9" }), _jsxs("span", { children: [formatPercentage(data.usage, data.total), "%"] })] }), _jsx("div", { className: "w-full bg-gray-200 rounded-full h-2", children: _jsx("div", { className: `h-2 rounded-full transition-all duration-300 ${data.usage / data.total > 0.8 ? 'bg-red-500' :
                                                            data.usage / data.total > 0.6 ? 'bg-yellow-500' : 'bg-green-500'}`, style: { width: `${Math.min((data.usage / data.total) * 100, 100)}%` } }) })] }) }))] }, component.key));
                        }) }), expandedDetails && health && (_jsx("div", { className: "mt-6 pt-4 border-t border-gray-200", children: _jsxs("div", { className: "grid grid-cols-2 gap-4", children: [_jsxs("div", { className: "text-center", children: [_jsxs("div", { className: "flex items-center justify-center mb-1", children: [_jsx(TrendingUp, { className: "w-4 h-4 text-blue-600 mr-1" }), _jsx("p", { className: "text-xs text-gray-500", children: "API \uC751\uB2F5" })] }), _jsxs("p", { className: `text-lg font-bold ${health.api.responseTime < 200 ? 'text-green-600' :
                                                health.api.responseTime < 500 ? 'text-yellow-600' : 'text-red-600'}`, children: [health.api.responseTime, "ms"] })] }), _jsxs("div", { className: "text-center", children: [_jsxs("div", { className: "flex items-center justify-center mb-1", children: [_jsx(Database, { className: "w-4 h-4 text-purple-600 mr-1" }), _jsx("p", { className: "text-xs text-gray-500", children: "DB \uC5F0\uACB0" })] }), _jsx("p", { className: "text-lg font-bold text-gray-900", children: health.database.connections })] })] }) })), _jsxs("div", { className: "mt-4 flex items-center justify-center text-xs text-gray-500", children: [_jsx(Clock, { className: "w-3 h-3 mr-1" }), _jsxs("span", { children: ["\uB9C8\uC9C0\uB9C9 \uD655\uC778: ", health?.api.lastCheck ?
                                        new Date(health.api.lastCheck).toLocaleTimeString('ko-KR') :
                                        '확인 중...'] })] }), overallStatus !== 'healthy' && (_jsx("div", { className: `
            mt-4 p-3 rounded-lg border
            ${overallConfig.bgColor} ${overallConfig.borderColor}
          `, children: _jsxs("div", { className: `flex items-center ${overallConfig.color}`, children: [overallConfig.icon, _jsx("span", { className: "text-sm font-medium ml-2", children: overallStatus === 'warning' ?
                                        '시스템 성능에 주의가 필요합니다' :
                                        '시스템에 문제가 발생했습니다' })] }) }))] })] }));
};
export default SystemHealth;
//# sourceMappingURL=index.js.map
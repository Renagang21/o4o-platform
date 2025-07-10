import { jsx as _jsx, Fragment as _Fragment, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useCallback } from 'react';
import { RefreshCw, Clock, Settings, AlertTriangle, CheckCircle, XCircle, Bell } from 'lucide-react';
import StatsCards from './components/StatsCards';
import Charts from './components/Charts';
import QuickActions from './components/QuickActions';
import Notifications from './components/Notifications';
import ActivityFeed from './components/ActivityFeed';
import SystemHealth from './components/SystemHealth';
import RefreshButton from './components/common/RefreshButton';
import ErrorBoundary from './components/common/ErrorBoundary';
import { useDashboardData } from './hooks/useDashboardData';
import { useRefresh } from './hooks/useRefresh';
const MainDashboard = () => {
    const [lastRefresh, setLastRefresh] = useState(new Date());
    const { stats, chartData, notifications, activities, systemHealth, isLoading, error, refreshAllData } = useDashboardData();
    const { isRefreshing, refreshWithDelay } = useRefresh();
    const handleRefresh = useCallback(async () => {
        await refreshWithDelay(async () => {
            await refreshAllData();
            setLastRefresh(new Date());
        });
    }, [refreshAllData, refreshWithDelay]);
    const getWelcomeMessage = () => {
        const hour = new Date().getHours();
        if (hour < 12)
            return '좋은 아침입니다!';
        if (hour < 18)
            return '좋은 오후입니다!';
        return '좋은 저녁입니다!';
    };
    const formatLastUpdate = (date) => {
        return new Intl.DateTimeFormat('ko-KR', {
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        }).format(date);
    };
    if (error) {
        return (_jsx("div", { className: "min-h-screen flex items-center justify-center", children: _jsx("div", { className: "wp-card max-w-md w-full", children: _jsxs("div", { className: "wp-card-body text-center", children: [_jsx(XCircle, { className: "w-12 h-12 text-red-500 mx-auto mb-4" }), _jsx("h3", { className: "text-lg font-medium text-gray-900 mb-2", children: "\uB300\uC2DC\uBCF4\uB4DC \uB85C\uB529 \uC624\uB958" }), _jsx("p", { className: "text-gray-600 mb-4", children: "\uB370\uC774\uD130\uB97C \uBD88\uB7EC\uC624\uB294 \uC911 \uBB38\uC81C\uAC00 \uBC1C\uC0DD\uD588\uC2B5\uB2C8\uB2E4." }), _jsx("button", { onClick: handleRefresh, className: "wp-button-primary", disabled: isRefreshing, children: isRefreshing ? (_jsxs(_Fragment, { children: [_jsx(RefreshCw, { className: "w-4 h-4 mr-2 animate-spin" }), "\uB2E4\uC2DC \uC2DC\uB3C4 \uC911..."] })) : (_jsxs(_Fragment, { children: [_jsx(RefreshCw, { className: "w-4 h-4 mr-2" }), "\uB2E4\uC2DC \uC2DC\uB3C4"] })) })] }) }) }));
    }
    return (_jsx(ErrorBoundary, { children: _jsxs("div", { className: "space-y-6", children: [_jsx("div", { className: "bg-white border-b border-gray-200 -mx-6 -mt-6 px-6 py-4", children: _jsxs("div", { className: "flex items-center justify-between", children: [_jsxs("div", { children: [_jsxs("h1", { className: "text-2xl font-bold text-gray-900", children: [getWelcomeMessage(), " \uAD00\uB9AC\uC790\uB2D8"] }), _jsx("p", { className: "text-gray-600 mt-1", children: "O4O \uD50C\uB7AB\uD3FC\uC758 \uC2E4\uC2DC\uAC04 \uD604\uD669\uC744 \uD655\uC778\uD558\uACE0 \uAD00\uB9AC\uD558\uC138\uC694" })] }), _jsxs("div", { className: "flex items-center space-x-4", children: [_jsxs("div", { className: "flex items-center text-sm text-gray-500", children: [_jsx(Clock, { className: "w-4 h-4 mr-1" }), "\uB9C8\uC9C0\uB9C9 \uC5C5\uB370\uC774\uD2B8: ", formatLastUpdate(lastRefresh)] }), _jsx(RefreshButton, { onRefresh: handleRefresh, isRefreshing: isRefreshing, className: "wp-button-secondary" }), _jsxs("button", { className: "wp-button-secondary", children: [_jsx(Settings, { className: "w-4 h-4 mr-2" }), "\uC815\uCC45 \uC124\uC815"] })] })] }) }), _jsxs("div", { className: "space-y-8", children: [_jsxs("section", { children: [_jsxs("div", { className: "flex items-center justify-between mb-6", children: [_jsx("h2", { className: "text-lg font-semibold text-gray-900", children: "\uC8FC\uC694 \uC9C0\uD45C" }), notifications?.urgent && notifications.urgent > 0 && (_jsxs("div", { className: "flex items-center text-red-600", children: [_jsx(AlertTriangle, { className: "w-4 h-4 mr-1" }), _jsxs("span", { className: "text-sm font-medium", children: [notifications?.urgent, "\uAC1C\uC758 \uAE34\uAE09 \uC54C\uB9BC"] })] }))] }), _jsx(StatsCards, { stats: stats, isLoading: isLoading })] }), _jsxs("section", { children: [_jsxs("div", { className: "flex items-center justify-between mb-6", children: [_jsx("h2", { className: "text-lg font-semibold text-gray-900", children: "\uBD84\uC11D \uBC0F \uD2B8\uB80C\uB4DC" }), _jsx("div", { className: "text-sm text-gray-500", children: "\uCC28\uD2B8 \uB370\uC774\uD130\uB294 \uC218\uB3D9 \uC0C8\uB85C\uACE0\uCE68\uC73C\uB85C \uC5C5\uB370\uC774\uD2B8\uB429\uB2C8\uB2E4" })] }), _jsx(Charts, { data: chartData, isLoading: isLoading })] }), _jsx("section", { children: _jsxs("div", { className: "grid grid-cols-1 lg:grid-cols-3 gap-8", children: [_jsxs("div", { className: "lg:col-span-1", children: [_jsx("h2", { className: "text-lg font-semibold text-gray-900 mb-6", children: "\uBE60\uB978 \uC791\uC5C5" }), _jsx(QuickActions, {})] }), _jsxs("div", { className: "lg:col-span-2", children: [_jsxs("div", { className: "flex items-center justify-between mb-6", children: [_jsx("h2", { className: "text-lg font-semibold text-gray-900", children: "\uC2E4\uC2DC\uAC04 \uC54C\uB9BC" }), _jsxs("div", { className: "flex items-center", children: [_jsx(Bell, { className: "w-4 h-4 mr-1 text-gray-400" }), _jsxs("span", { className: "text-sm text-gray-500", children: ["\uCD1D ", notifications?.total || 0, "\uAC1C"] })] })] }), _jsx(Notifications, { notifications: notifications?.items || [], isLoading: isLoading })] })] }) }), _jsx("section", { children: _jsxs("div", { className: "grid grid-cols-1 lg:grid-cols-2 gap-8", children: [_jsxs("div", { children: [_jsx("h2", { className: "text-lg font-semibold text-gray-900 mb-6", children: "\uCD5C\uADFC \uD65C\uB3D9" }), _jsx(ActivityFeed, { activities: activities || [], isLoading: isLoading })] }), _jsxs("div", { children: [_jsx("h2", { className: "text-lg font-semibold text-gray-900 mb-6", children: "\uC2DC\uC2A4\uD15C \uC0C1\uD0DC" }), _jsx(SystemHealth, { health: systemHealth, isLoading: isLoading })] })] }) })] }), isLoading && (_jsx("div", { className: "fixed inset-0 bg-black bg-opacity-10 flex items-center justify-center z-50", children: _jsx("div", { className: "bg-white rounded-lg p-6 shadow-lg", children: _jsxs("div", { className: "flex items-center", children: [_jsx(RefreshCw, { className: "w-5 h-5 mr-3 animate-spin text-blue-600" }), _jsx("span", { className: "text-gray-900", children: "\uB370\uC774\uD130\uB97C \uC5C5\uB370\uC774\uD2B8\uD558\uB294 \uC911..." })] }) }) })), !isLoading && !error && (_jsx("div", { className: "fixed bottom-4 right-4 z-50", children: _jsx("div", { className: "bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded-lg shadow-lg", children: _jsxs("div", { className: "flex items-center", children: [_jsx(CheckCircle, { className: "w-4 h-4 mr-2" }), _jsx("span", { className: "text-sm", children: "\uB300\uC2DC\uBCF4\uB4DC\uAC00 \uC131\uACF5\uC801\uC73C\uB85C \uC5C5\uB370\uC774\uD2B8\uB418\uC5C8\uC2B5\uB2C8\uB2E4" })] }) }) }))] }) }));
};
export default MainDashboard;
//# sourceMappingURL=MainDashboard.js.map
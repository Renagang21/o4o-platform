import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, ComposedChart, Line, LineChart } from 'recharts';
import { Users, UserPlus, Activity, TrendingUp } from 'lucide-react';
const UserChart = ({ data, isLoading = false }) => {
    const [chartType, setChartType] = useState('bar');
    const processedData = useMemo(() => {
        if (!data.length) {
            const defaultData = [];
            const today = new Date();
            for (let i = 6; i >= 0; i--) {
                const date = new Date(today);
                date.setDate(date.getDate() - i);
                defaultData.push({
                    date: date.toLocaleDateString('ko-KR', {
                        month: 'short',
                        day: 'numeric'
                    }),
                    shortDate: date.toLocaleDateString('ko-KR', {
                        month: 'numeric',
                        day: 'numeric'
                    }),
                    fullDate: date.toISOString().split('T')[0],
                    newUsers: Math.floor(Math.random() * 20) + 5,
                    activeUsers: Math.floor(Math.random() * 100) + 50,
                    dayOfWeek: date.toLocaleDateString('ko-KR', { weekday: 'short' })
                });
            }
            return defaultData;
        }
        return data.map(item => ({
            ...item,
            date: new Date(item.date).toLocaleDateString('ko-KR', {
                month: 'short',
                day: 'numeric'
            }),
            shortDate: new Date(item.date).toLocaleDateString('ko-KR', {
                month: 'numeric',
                day: 'numeric'
            }),
            dayOfWeek: new Date(item.date).toLocaleDateString('ko-KR', { weekday: 'short' })
        }));
    }, [data]);
    const stats = useMemo(() => {
        if (!processedData.length)
            return {
                totalNewUsers: 0,
                avgActiveUsers: 0,
                peakDay: '',
                growthRate: 0
            };
        const totalNewUsers = processedData.reduce((sum, item) => sum + item.newUsers, 0);
        const avgActiveUsers = processedData.reduce((sum, item) => sum + item.activeUsers, 0) / processedData.length;
        const peakDayData = processedData.reduce((max, item) => item.activeUsers > max.activeUsers ? item : max);
        const firstDay = processedData[0]?.newUsers || 0;
        const lastDay = processedData[processedData.length - 1]?.newUsers || 0;
        const growthRate = firstDay > 0 ? ((lastDay - firstDay) / firstDay) * 100 : 0;
        return {
            totalNewUsers,
            avgActiveUsers: Math.round(avgActiveUsers),
            peakDay: peakDayData.date,
            growthRate
        };
    }, [processedData]);
    const CustomTooltip = ({ active, payload, label }) => {
        if (active && payload && payload.length) {
            return (_jsxs("div", { className: "bg-white p-3 border border-gray-200 rounded-lg shadow-lg", children: [_jsx("p", { className: "text-sm font-medium text-gray-900 mb-2", children: label }), _jsx("div", { className: "space-y-1", children: payload.map((entry, index) => (_jsxs("div", { className: "flex items-center", children: [_jsx("div", { className: "w-3 h-3 rounded-full mr-2", style: { backgroundColor: entry.color } }), _jsxs("span", { className: "text-sm text-gray-600", children: [entry.name, ":"] }), _jsxs("span", { className: "text-sm font-semibold text-gray-900 ml-1", children: [entry.value.toLocaleString(), entry.dataKey === 'newUsers' ? '명' : '명'] })] }, index))) })] }));
        }
        return null;
    };
    if (isLoading) {
        return (_jsxs("div", { className: "wp-card", children: [_jsx("div", { className: "wp-card-header", children: _jsx("div", { className: "h-6 bg-gray-200 rounded w-32 animate-pulse" }) }), _jsx("div", { className: "wp-card-body", children: _jsx("div", { className: "h-80 bg-gray-100 rounded animate-pulse" }) })] }));
    }
    const renderChart = () => {
        const commonProps = {
            data: processedData,
            margin: { top: 20, right: 30, left: 20, bottom: 5 }
        };
        switch (chartType) {
            case 'line':
                return (_jsxs(LineChart, { ...commonProps, children: [_jsx(CartesianGrid, { strokeDasharray: "3 3", stroke: "#e5e7eb" }), _jsx(XAxis, { dataKey: "shortDate", stroke: "#6b7280", fontSize: 12 }), _jsx(YAxis, { stroke: "#6b7280", fontSize: 12 }), _jsx(Tooltip, { content: _jsx(CustomTooltip, {}) }), _jsx(Legend, {}), _jsx(Line, { type: "monotone", dataKey: "newUsers", stroke: "#3b82f6", strokeWidth: 3, dot: { fill: '#3b82f6', strokeWidth: 0, r: 4 }, name: "\uC2E0\uADDC \uC0AC\uC6A9\uC790" }), _jsx(Line, { type: "monotone", dataKey: "activeUsers", stroke: "#10b981", strokeWidth: 3, dot: { fill: '#10b981', strokeWidth: 0, r: 4 }, name: "\uD65C\uC131 \uC0AC\uC6A9\uC790" })] }));
            case 'combined':
                return (_jsxs(ComposedChart, { ...commonProps, children: [_jsx(CartesianGrid, { strokeDasharray: "3 3", stroke: "#e5e7eb" }), _jsx(XAxis, { dataKey: "shortDate", stroke: "#6b7280", fontSize: 12 }), _jsx(YAxis, { stroke: "#6b7280", fontSize: 12 }), _jsx(Tooltip, { content: _jsx(CustomTooltip, {}) }), _jsx(Legend, {}), _jsx(Bar, { dataKey: "newUsers", fill: "#3b82f6", radius: [2, 2, 0, 0], name: "\uC2E0\uADDC \uC0AC\uC6A9\uC790" }), _jsx(Line, { type: "monotone", dataKey: "activeUsers", stroke: "#10b981", strokeWidth: 3, dot: { fill: '#10b981', strokeWidth: 0, r: 4 }, name: "\uD65C\uC131 \uC0AC\uC6A9\uC790" })] }));
            default:
                return (_jsxs(BarChart, { ...commonProps, children: [_jsx(CartesianGrid, { strokeDasharray: "3 3", stroke: "#e5e7eb" }), _jsx(XAxis, { dataKey: "shortDate", stroke: "#6b7280", fontSize: 12 }), _jsx(YAxis, { stroke: "#6b7280", fontSize: 12 }), _jsx(Tooltip, { content: _jsx(CustomTooltip, {}) }), _jsx(Legend, {}), _jsx(Bar, { dataKey: "newUsers", fill: "#3b82f6", radius: [2, 2, 0, 0], name: "\uC2E0\uADDC \uC0AC\uC6A9\uC790" }), _jsx(Bar, { dataKey: "activeUsers", fill: "#10b981", radius: [2, 2, 0, 0], name: "\uD65C\uC131 \uC0AC\uC6A9\uC790" })] }));
        }
    };
    return (_jsxs("div", { className: "wp-card", children: [_jsx("div", { className: "wp-card-header", children: _jsxs("div", { className: "flex items-center justify-between", children: [_jsxs("div", { className: "flex items-center", children: [_jsx(Users, { className: "w-5 h-5 text-green-600 mr-2" }), _jsx("h3", { className: "wp-card-title", children: "\uC0AC\uC6A9\uC790 \uD65C\uB3D9 \uD2B8\uB80C\uB4DC" })] }), _jsxs("div", { className: "flex bg-gray-100 rounded-lg p-1", children: [_jsx("button", { onClick: () => setChartType('bar'), className: `px-3 py-1 text-xs rounded transition-colors ${chartType === 'bar'
                                        ? 'bg-white text-gray-900 shadow-sm'
                                        : 'text-gray-600 hover:text-gray-900'}`, children: "\uB9C9\uB300" }), _jsx("button", { onClick: () => setChartType('line'), className: `px-3 py-1 text-xs rounded transition-colors ${chartType === 'line'
                                        ? 'bg-white text-gray-900 shadow-sm'
                                        : 'text-gray-600 hover:text-gray-900'}`, children: "\uB77C\uC778" }), _jsx("button", { onClick: () => setChartType('combined'), className: `px-3 py-1 text-xs rounded transition-colors ${chartType === 'combined'
                                        ? 'bg-white text-gray-900 shadow-sm'
                                        : 'text-gray-600 hover:text-gray-900'}`, children: "\uD63C\uD569" })] })] }) }), _jsxs("div", { className: "wp-card-body", children: [_jsxs("div", { className: "grid grid-cols-4 gap-4 mb-6", children: [_jsxs("div", { className: "text-center", children: [_jsxs("div", { className: "flex items-center justify-center mb-1", children: [_jsx(UserPlus, { className: "w-4 h-4 text-blue-600 mr-1" }), _jsx("p", { className: "text-xs text-gray-500", children: "\uC2E0\uADDC \uAC00\uC785" })] }), _jsxs("p", { className: "text-lg font-bold text-gray-900", children: [stats.totalNewUsers.toLocaleString(), "\uBA85"] })] }), _jsxs("div", { className: "text-center", children: [_jsxs("div", { className: "flex items-center justify-center mb-1", children: [_jsx(Activity, { className: "w-4 h-4 text-green-600 mr-1" }), _jsx("p", { className: "text-xs text-gray-500", children: "\uD3C9\uADE0 \uD65C\uC131" })] }), _jsxs("p", { className: "text-lg font-bold text-gray-900", children: [stats.avgActiveUsers.toLocaleString(), "\uBA85"] })] }), _jsxs("div", { className: "text-center", children: [_jsxs("div", { className: "flex items-center justify-center mb-1", children: [_jsx(TrendingUp, { className: "w-4 h-4 text-purple-600 mr-1" }), _jsx("p", { className: "text-xs text-gray-500", children: "\uCD5C\uACE0 \uD65C\uC131\uC77C" })] }), _jsx("p", { className: "text-lg font-bold text-gray-900", children: stats.peakDay })] }), _jsxs("div", { className: "text-center", children: [_jsxs("div", { className: "flex items-center justify-center mb-1", children: [_jsx(TrendingUp, { className: `w-4 h-4 mr-1 ${stats.growthRate >= 0 ? 'text-green-600' : 'text-red-600'}` }), _jsx("p", { className: "text-xs text-gray-500", children: "\uC131\uC7A5\uB960" })] }), _jsxs("p", { className: `text-lg font-bold ${stats.growthRate >= 0 ? 'text-green-600' : 'text-red-600'}`, children: [stats.growthRate > 0 ? '+' : '', stats.growthRate.toFixed(1), "%"] })] })] }), _jsx("div", { className: "h-80", children: _jsx(ResponsiveContainer, { width: "100%", height: "100%", children: renderChart() }) }), _jsx("div", { className: "mt-6 grid grid-cols-7 gap-2", children: processedData.map((item, index) => (_jsxs("div", { className: "text-center p-2 bg-gray-50 rounded", children: [_jsx("p", { className: "text-xs font-medium text-gray-700", children: item.dayOfWeek }), _jsxs("p", { className: "text-xs text-blue-600", children: [item.newUsers, "\uBA85"] }), _jsxs("p", { className: "text-xs text-green-600", children: [item.activeUsers, "\uBA85"] })] }, index))) }), _jsxs("div", { className: "mt-4 flex items-center text-sm text-gray-600", children: [_jsx(Activity, { className: "w-4 h-4 mr-2 text-gray-400" }), _jsx("span", { children: "\uCD5C\uADFC 7\uC77C\uAC04 \uC0AC\uC6A9\uC790 \uD65C\uB3D9 \uD328\uD134\uC744 \uBD84\uC11D\uD55C \uACB0\uACFC\uC785\uB2C8\uB2E4" })] })] })] }));
};
export default UserChart;
//# sourceMappingURL=UserChart.js.map
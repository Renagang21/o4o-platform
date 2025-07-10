import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useMemo } from 'react';
import { LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { TrendingUp, Calendar } from 'lucide-react';
const SalesChart = ({ data, isLoading = false }) => {
    const [chartType, setChartType] = useState('line');
    const [period, setPeriod] = useState('30d');
    const processedData = useMemo(() => {
        if (!data.length)
            return [];
        const periodDays = {
            '7d': 7,
            '30d': 30,
            '90d': 90
        };
        const filteredData = data.slice(-periodDays[period]);
        return filteredData.map(item => ({
            ...item,
            date: new Date(item.date).toLocaleDateString('ko-KR', {
                month: 'short',
                day: 'numeric'
            }),
            formattedAmount: new Intl.NumberFormat('ko-KR', {
                style: 'currency',
                currency: 'KRW',
                notation: 'compact',
                maximumFractionDigits: 1
            }).format(item.amount)
        }));
    }, [data, period]);
    const stats = useMemo(() => {
        if (!processedData.length)
            return { total: 0, average: 0, highest: 0, growth: 0 };
        const total = processedData.reduce((sum, item) => sum + item.amount, 0);
        const average = total / processedData.length;
        const highest = Math.max(...processedData.map(item => item.amount));
        const firstDay = processedData[0]?.amount || 0;
        const lastDay = processedData[processedData.length - 1]?.amount || 0;
        const growth = firstDay > 0 ? ((lastDay - firstDay) / firstDay) * 100 : 0;
        return { total, average, highest, growth };
    }, [processedData]);
    const CustomTooltip = ({ active, payload, label }) => {
        if (active && payload && payload.length) {
            return (_jsxs("div", { className: "bg-white p-3 border border-gray-200 rounded-lg shadow-lg", children: [_jsx("p", { className: "text-sm font-medium text-gray-900 mb-2", children: label }), _jsxs("div", { className: "space-y-1", children: [_jsxs("div", { className: "flex items-center", children: [_jsx("div", { className: "w-3 h-3 bg-blue-500 rounded-full mr-2" }), _jsx("span", { className: "text-sm text-gray-600", children: "\uB9E4\uCD9C:" }), _jsx("span", { className: "text-sm font-semibold text-gray-900 ml-1", children: new Intl.NumberFormat('ko-KR', {
                                            style: 'currency',
                                            currency: 'KRW'
                                        }).format(payload[0].value) })] }), _jsxs("div", { className: "flex items-center", children: [_jsx("div", { className: "w-3 h-3 bg-green-500 rounded-full mr-2" }), _jsx("span", { className: "text-sm text-gray-600", children: "\uC8FC\uBB38:" }), _jsxs("span", { className: "text-sm font-semibold text-gray-900 ml-1", children: [payload[1]?.value, "\uAC74"] })] })] })] }));
        }
        return null;
    };
    if (isLoading) {
        return (_jsxs("div", { className: "wp-card", children: [_jsx("div", { className: "wp-card-header", children: _jsx("div", { className: "h-6 bg-gray-200 rounded w-32 animate-pulse" }) }), _jsx("div", { className: "wp-card-body", children: _jsx("div", { className: "h-80 bg-gray-100 rounded animate-pulse" }) })] }));
    }
    return (_jsxs("div", { className: "wp-card", children: [_jsx("div", { className: "wp-card-header", children: _jsxs("div", { className: "flex items-center justify-between", children: [_jsxs("div", { className: "flex items-center", children: [_jsx(TrendingUp, { className: "w-5 h-5 text-blue-600 mr-2" }), _jsx("h3", { className: "wp-card-title", children: "\uB9E4\uCD9C \uBD84\uC11D" })] }), _jsxs("div", { className: "flex items-center space-x-3", children: [_jsxs("div", { className: "flex bg-gray-100 rounded-lg p-1", children: [_jsx("button", { onClick: () => setChartType('line'), className: `px-3 py-1 text-xs rounded transition-colors ${chartType === 'line'
                                                ? 'bg-white text-gray-900 shadow-sm'
                                                : 'text-gray-600 hover:text-gray-900'}`, children: "\uB77C\uC778" }), _jsx("button", { onClick: () => setChartType('area'), className: `px-3 py-1 text-xs rounded transition-colors ${chartType === 'area'
                                                ? 'bg-white text-gray-900 shadow-sm'
                                                : 'text-gray-600 hover:text-gray-900'}`, children: "\uC601\uC5ED" })] }), _jsx("div", { className: "flex bg-gray-100 rounded-lg p-1", children: ['7d', '30d', '90d'].map((p) => (_jsx("button", { onClick: () => setPeriod(p), className: `px-3 py-1 text-xs rounded transition-colors ${period === p
                                            ? 'bg-white text-gray-900 shadow-sm'
                                            : 'text-gray-600 hover:text-gray-900'}`, children: p === '7d' ? '7일' : p === '30d' ? '30일' : '90일' }, p))) })] })] }) }), _jsxs("div", { className: "wp-card-body", children: [_jsxs("div", { className: "grid grid-cols-4 gap-4 mb-6", children: [_jsxs("div", { className: "text-center", children: [_jsx("p", { className: "text-xs text-gray-500", children: "\uCD1D \uB9E4\uCD9C" }), _jsx("p", { className: "text-lg font-bold text-gray-900", children: new Intl.NumberFormat('ko-KR', {
                                            style: 'currency',
                                            currency: 'KRW',
                                            notation: 'compact',
                                            maximumFractionDigits: 1
                                        }).format(stats.total) })] }), _jsxs("div", { className: "text-center", children: [_jsx("p", { className: "text-xs text-gray-500", children: "\uC77C \uD3C9\uADE0" }), _jsx("p", { className: "text-lg font-bold text-gray-900", children: new Intl.NumberFormat('ko-KR', {
                                            style: 'currency',
                                            currency: 'KRW',
                                            notation: 'compact',
                                            maximumFractionDigits: 1
                                        }).format(stats.average) })] }), _jsxs("div", { className: "text-center", children: [_jsx("p", { className: "text-xs text-gray-500", children: "\uCD5C\uACE0 \uB9E4\uCD9C" }), _jsx("p", { className: "text-lg font-bold text-gray-900", children: new Intl.NumberFormat('ko-KR', {
                                            style: 'currency',
                                            currency: 'KRW',
                                            notation: 'compact',
                                            maximumFractionDigits: 1
                                        }).format(stats.highest) })] }), _jsxs("div", { className: "text-center", children: [_jsx("p", { className: "text-xs text-gray-500", children: "\uC131\uC7A5\uB960" }), _jsxs("p", { className: `text-lg font-bold ${stats.growth >= 0 ? 'text-green-600' : 'text-red-600'}`, children: [stats.growth > 0 ? '+' : '', stats.growth.toFixed(1), "%"] })] })] }), _jsx("div", { className: "h-80", children: _jsx(ResponsiveContainer, { width: "100%", height: "100%", children: chartType === 'line' ? (_jsxs(LineChart, { data: processedData, margin: { top: 5, right: 30, left: 20, bottom: 5 }, children: [_jsx(CartesianGrid, { strokeDasharray: "3 3", stroke: "#e5e7eb" }), _jsx(XAxis, { dataKey: "date", stroke: "#6b7280", fontSize: 12 }), _jsx(YAxis, { stroke: "#6b7280", fontSize: 12, tickFormatter: (value) => new Intl.NumberFormat('ko-KR', {
                                            notation: 'compact',
                                            maximumFractionDigits: 0
                                        }).format(value) }), _jsx(Tooltip, { content: _jsx(CustomTooltip, {}) }), _jsx(Legend, {}), _jsx(Line, { type: "monotone", dataKey: "amount", stroke: "#3b82f6", strokeWidth: 3, dot: { fill: '#3b82f6', strokeWidth: 0, r: 4 }, activeDot: { r: 6, fill: '#1d4ed8' }, name: "\uB9E4\uCD9C" }), _jsx(Line, { type: "monotone", dataKey: "orders", stroke: "#10b981", strokeWidth: 2, dot: { fill: '#10b981', strokeWidth: 0, r: 3 }, yAxisId: "right", name: "\uC8FC\uBB38 \uC218" })] })) : (_jsxs(AreaChart, { data: processedData, margin: { top: 5, right: 30, left: 20, bottom: 5 }, children: [_jsx(CartesianGrid, { strokeDasharray: "3 3", stroke: "#e5e7eb" }), _jsx(XAxis, { dataKey: "date", stroke: "#6b7280", fontSize: 12 }), _jsx(YAxis, { stroke: "#6b7280", fontSize: 12, tickFormatter: (value) => new Intl.NumberFormat('ko-KR', {
                                            notation: 'compact',
                                            maximumFractionDigits: 0
                                        }).format(value) }), _jsx(Tooltip, { content: _jsx(CustomTooltip, {}) }), _jsx(Legend, {}), _jsx(Area, { type: "monotone", dataKey: "amount", stroke: "#3b82f6", fill: "url(#salesGradient)", strokeWidth: 2, name: "\uB9E4\uCD9C" }), _jsx("defs", { children: _jsxs("linearGradient", { id: "salesGradient", x1: "0", y1: "0", x2: "0", y2: "1", children: [_jsx("stop", { offset: "5%", stopColor: "#3b82f6", stopOpacity: 0.3 }), _jsx("stop", { offset: "95%", stopColor: "#3b82f6", stopOpacity: 0.05 })] }) })] })) }) }), _jsxs("div", { className: "mt-4 flex items-center text-xs text-gray-500", children: [_jsx(Calendar, { className: "w-3 h-3 mr-1" }), _jsxs("span", { children: ["\uCD5C\uADFC ", period === '7d' ? '7일' : period === '30d' ? '30일' : '90일', "\uB9E4\uCD9C \uCD94\uC774\uB97C \uBCF4\uC5EC\uC90D\uB2C8\uB2E4"] })] })] })] }));
};
export default SalesChart;
//# sourceMappingURL=SalesChart.js.map
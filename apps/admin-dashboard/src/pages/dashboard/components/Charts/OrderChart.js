import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useMemo } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { Package, TrendingUp } from 'lucide-react';
const OrderChart = ({ data, isLoading = false }) => {
    const processedData = useMemo(() => {
        if (!data.length) {
            return [
                { status: '처리중', count: 45, color: '#3b82f6', percentage: 32.1 },
                { status: '배송중', count: 23, color: '#f59e0b', percentage: 16.4 },
                { status: '완료', count: 67, color: '#10b981', percentage: 47.9 },
                { status: '취소', count: 5, color: '#ef4444', percentage: 3.6 }
            ];
        }
        const total = data.reduce((sum, item) => sum + item.count, 0);
        return data.map(item => ({
            ...item,
            percentage: total > 0 ? (item.count / total) * 100 : 0
        }));
    }, [data]);
    const totalOrders = processedData.reduce((sum, item) => sum + item.count, 0);
    const completedOrders = processedData.find(item => item.status === '완료')?.count || 0;
    const completionRate = totalOrders > 0 ? (completedOrders / totalOrders) * 100 : 0;
    const CustomTooltip = ({ active, payload }) => {
        if (active && payload && payload.length) {
            const data = payload[0].payload;
            return (_jsxs("div", { className: "bg-white p-3 border border-gray-200 rounded-lg shadow-lg", children: [_jsxs("div", { className: "flex items-center mb-2", children: [_jsx("div", { className: "w-3 h-3 rounded-full mr-2", style: { backgroundColor: data.color } }), _jsx("span", { className: "text-sm font-medium text-gray-900", children: data.status })] }), _jsxs("div", { className: "space-y-1", children: [_jsxs("p", { className: "text-sm text-gray-600", children: ["\uC8FC\uBB38 \uC218: ", _jsxs("span", { className: "font-semibold text-gray-900", children: [data.count, "\uAC74"] })] }), _jsxs("p", { className: "text-sm text-gray-600", children: ["\uBE44\uC728: ", _jsxs("span", { className: "font-semibold text-gray-900", children: [data.percentage.toFixed(1), "%"] })] })] })] }));
        }
        return null;
    };
    const renderCustomLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percentage }) => {
        if (percentage < 5)
            return null;
        const RADIAN = Math.PI / 180;
        const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
        const x = cx + radius * Math.cos(-midAngle * RADIAN);
        const y = cy + radius * Math.sin(-midAngle * RADIAN);
        return (_jsx("text", { x: x, y: y, fill: "white", textAnchor: x > cx ? 'start' : 'end', dominantBaseline: "central", fontSize: 12, fontWeight: "600", children: `${percentage.toFixed(0)}%` }));
    };
    if (isLoading) {
        return (_jsxs("div", { className: "wp-card", children: [_jsx("div", { className: "wp-card-header", children: _jsx("div", { className: "h-6 bg-gray-200 rounded w-24 animate-pulse" }) }), _jsx("div", { className: "wp-card-body", children: _jsx("div", { className: "h-64 bg-gray-100 rounded animate-pulse" }) })] }));
    }
    return (_jsxs("div", { className: "wp-card", children: [_jsx("div", { className: "wp-card-header", children: _jsxs("div", { className: "flex items-center", children: [_jsx(Package, { className: "w-5 h-5 text-purple-600 mr-2" }), _jsx("h3", { className: "wp-card-title", children: "\uC8FC\uBB38 \uD604\uD669" })] }) }), _jsxs("div", { className: "wp-card-body", children: [_jsx("div", { className: "mb-6", children: _jsxs("div", { className: "grid grid-cols-2 gap-4", children: [_jsxs("div", { className: "text-center", children: [_jsx("p", { className: "text-xs text-gray-500", children: "\uCD1D \uC8FC\uBB38" }), _jsxs("p", { className: "text-xl font-bold text-gray-900", children: [totalOrders.toLocaleString(), "\uAC74"] })] }), _jsxs("div", { className: "text-center", children: [_jsx("p", { className: "text-xs text-gray-500", children: "\uC644\uB8CC\uC728" }), _jsxs("p", { className: "text-xl font-bold text-green-600", children: [completionRate.toFixed(1), "%"] })] })] }) }), _jsx("div", { className: "h-64 mb-6", children: _jsx(ResponsiveContainer, { width: "100%", height: "100%", children: _jsxs(PieChart, { children: [_jsx(Pie, { data: processedData, cx: "50%", cy: "50%", labelLine: false, label: renderCustomLabel, outerRadius: 80, innerRadius: 40, fill: "#8884d8", dataKey: "count", stroke: "none", children: processedData.map((entry, index) => (_jsx(Cell, { fill: entry.color }, `cell-${index}`))) }), _jsx(Tooltip, { content: _jsx(CustomTooltip, {}) })] }) }) }), _jsx("div", { className: "space-y-3", children: processedData.map((item, index) => (_jsxs("div", { className: "flex items-center justify-between", children: [_jsxs("div", { className: "flex items-center", children: [_jsx("div", { className: "w-3 h-3 rounded-full mr-3", style: { backgroundColor: item.color } }), _jsx("span", { className: "text-sm font-medium text-gray-700", children: item.status })] }), _jsxs("div", { className: "flex items-center space-x-2", children: [_jsxs("span", { className: "text-sm font-semibold text-gray-900", children: [item.count, "\uAC74"] }), _jsxs("span", { className: "text-xs text-gray-500", children: ["(", item.percentage.toFixed(1), "%)"] })] })] }, index))) }), _jsx("div", { className: "mt-6 pt-4 border-t border-gray-200", children: _jsxs("div", { className: "flex items-center text-sm", children: [_jsx(TrendingUp, { className: `w-4 h-4 mr-2 ${completionRate >= 70 ? 'text-green-500' :
                                        completionRate >= 50 ? 'text-yellow-500' : 'text-red-500'}` }), _jsxs("span", { className: "text-gray-600", children: ["\uC644\uB8CC\uC728\uC774", _jsx("span", { className: `font-medium ml-1 ${completionRate >= 70 ? 'text-green-600' :
                                                completionRate >= 50 ? 'text-yellow-600' : 'text-red-600'}`, children: completionRate >= 70 ? '우수' :
                                                completionRate >= 50 ? '보통' : '개선 필요' }), "\uD569\uB2C8\uB2E4"] })] }) }), _jsxs("div", { className: "mt-4 grid grid-cols-2 gap-2", children: [_jsx("button", { className: "text-xs py-2 px-3 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition-colors", children: "\uCC98\uB9AC \uB300\uAE30 \uBCF4\uAE30" }), _jsx("button", { className: "text-xs py-2 px-3 bg-green-50 text-green-700 rounded-lg hover:bg-green-100 transition-colors", children: "\uBC30\uC1A1 \uD604\uD669 \uD655\uC778" })] })] })] }));
};
export default OrderChart;
//# sourceMappingURL=OrderChart.js.map
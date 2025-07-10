import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { TrendingUp, Target, ArrowUpRight, ArrowDownRight, Calendar } from 'lucide-react';
const SalesStats = ({ data, isLoading = false }) => {
    if (isLoading) {
        return (_jsx("div", { className: "wp-card animate-pulse", children: _jsxs("div", { className: "wp-card-body", children: [_jsxs("div", { className: "flex items-center justify-between", children: [_jsxs("div", { className: "flex-1", children: [_jsx("div", { className: "h-4 bg-gray-200 rounded w-20 mb-2" }), _jsx("div", { className: "h-8 bg-gray-200 rounded w-24" })] }), _jsx("div", { className: "w-12 h-12 bg-gray-200 rounded-lg" })] }), _jsx("div", { className: "mt-4", children: _jsx("div", { className: "h-4 bg-gray-200 rounded w-32" }) })] }) }));
    }
    const { today = 0, changePercent = 0, monthlyTotal = 0, monthlyTarget = 1000000, trend = 'up' } = data || {};
    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('ko-KR', {
            style: 'currency',
            currency: 'KRW',
            notation: 'compact',
            maximumFractionDigits: 1
        }).format(amount);
    };
    const formatCurrencyFull = (amount) => {
        return new Intl.NumberFormat('ko-KR', {
            style: 'currency',
            currency: 'KRW'
        }).format(amount);
    };
    const achievementRate = (monthlyTotal / monthlyTarget) * 100;
    const isTargetAchieved = achievementRate >= 100;
    return (_jsx("div", { className: "wp-card hover:shadow-md transition-shadow duration-200", children: _jsxs("div", { className: "wp-card-body", children: [_jsxs("div", { className: "flex items-center justify-between mb-4", children: [_jsxs("div", { className: "flex-1", children: [_jsx("h3", { className: "text-sm font-medium text-gray-600", children: "\uC624\uB298 \uB9E4\uCD9C" }), _jsx("p", { className: "text-2xl font-bold text-gray-900 mt-1", title: formatCurrencyFull(today), children: formatCurrency(today) })] }), _jsx("div", { className: `w-12 h-12 rounded-lg flex items-center justify-center ${trend === 'up' ? 'bg-green-50' : 'bg-red-50'}`, children: _jsx(TrendingUp, { className: `w-6 h-6 ${trend === 'up' ? 'text-green-600' : 'text-red-600'}` }) })] }), _jsxs("div", { className: "mb-4", children: [_jsxs("div", { className: "flex items-center justify-between text-xs text-gray-600 mb-1", children: [_jsx("span", { children: "\uC774\uBC88 \uB2EC \uB9E4\uCD9C" }), _jsxs("span", { children: [formatCurrency(monthlyTotal), " / ", formatCurrency(monthlyTarget)] })] }), _jsx("div", { className: "w-full bg-gray-200 rounded-full h-2", children: _jsx("div", { className: `h-2 rounded-full transition-all duration-300 ${isTargetAchieved ? 'bg-green-500' : 'bg-blue-500'}`, style: { width: `${Math.min(achievementRate, 100)}%` } }) }), _jsxs("div", { className: "flex items-center mt-1 text-xs", children: [_jsx(Target, { className: "w-3 h-3 text-gray-400 mr-1" }), _jsxs("span", { className: `font-medium ${isTargetAchieved ? 'text-green-600' : 'text-gray-600'}`, children: ["\uBAA9\uD45C \uB300\uBE44 ", achievementRate.toFixed(1), "%"] }), isTargetAchieved && (_jsx("span", { className: "ml-1 text-green-600", children: "\uB2EC\uC131!" }))] })] }), _jsxs("div", { className: "flex items-center text-sm", children: [trend === 'up' ? (_jsx(ArrowUpRight, { className: "w-4 h-4 text-green-500 mr-1" })) : (_jsx(ArrowDownRight, { className: "w-4 h-4 text-red-500 mr-1" })), _jsxs("span", { className: `font-medium ${trend === 'up' ? 'text-green-600' : 'text-red-600'}`, children: [Math.abs(changePercent).toFixed(1), "%"] }), _jsx("span", { className: "text-gray-500 ml-1", children: "\uC804\uC77C \uB300\uBE44" })] }), isTargetAchieved && (_jsx("div", { className: "mt-3 p-2 bg-green-50 border border-green-200 rounded-md", children: _jsxs("div", { className: "flex items-center text-xs text-green-700", children: [_jsx(Target, { className: "w-3 h-3 mr-1" }), _jsx("span", { children: "\uC774\uBC88 \uB2EC \uB9E4\uCD9C \uBAA9\uD45C\uB97C \uB2EC\uC131\uD588\uC2B5\uB2C8\uB2E4! \uD83C\uDF89" })] }) })), achievementRate < 50 && new Date().getDate() > 15 && (_jsx("div", { className: "mt-3 p-2 bg-yellow-50 border border-yellow-200 rounded-md", children: _jsxs("div", { className: "flex items-center text-xs text-yellow-700", children: [_jsx(Calendar, { className: "w-3 h-3 mr-1" }), _jsx("span", { children: "\uBAA9\uD45C \uB2EC\uC131\uC744 \uC704\uD574 \uB9E4\uCD9C \uC99D\uB300\uAC00 \uD544\uC694\uD569\uB2C8\uB2E4" })] }) }))] }) }));
};
export default SalesStats;
//# sourceMappingURL=SalesStats.js.map
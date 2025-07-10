import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { memo } from 'react';
import SalesChart from './SalesChart';
import OrderChart from './OrderChart';
import UserChart from './UserChart';
const Charts = memo(({ data, isLoading = false }) => {
    return (_jsxs("div", { className: "grid grid-cols-1 lg:grid-cols-3 gap-8", children: [_jsx("div", { className: "lg:col-span-2", children: _jsx(SalesChart, { data: data?.sales || [], isLoading: isLoading }) }), _jsx("div", { className: "lg:col-span-1", children: _jsx(OrderChart, { data: data?.orders || [], isLoading: isLoading }) }), _jsx("div", { className: "lg:col-span-3", children: _jsx(UserChart, { data: data?.users || [], isLoading: isLoading }) })] }));
});
Charts.displayName = 'Charts';
export default Charts;
//# sourceMappingURL=index.js.map
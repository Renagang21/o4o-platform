import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { memo } from 'react';
import UserStats from './UserStats';
import SalesStats from './SalesStats';
import ProductStats from './ProductStats';
import ContentStats from './ContentStats';
import PartnerStats from './PartnerStats';
const StatsCards = memo(({ stats, isLoading = false }) => {
    return (_jsxs("div", { className: "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6", children: [_jsx(UserStats, { data: stats?.users, isLoading: isLoading }), _jsx(SalesStats, { data: stats?.sales, isLoading: isLoading }), _jsx(ProductStats, { data: stats?.products, isLoading: isLoading }), _jsx(ContentStats, { data: stats?.content, isLoading: isLoading }), _jsx(PartnerStats, { data: stats?.partners, isLoading: isLoading })] }));
});
StatsCards.displayName = 'StatsCards';
export default StatsCards;
//# sourceMappingURL=index.js.map
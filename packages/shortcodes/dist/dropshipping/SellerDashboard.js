import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
/**
 * Seller Dashboard Shortcode Component
 * [seller_dashboard] - 판매자 전용 대시보드
 */
import { useEffect, useState, useCallback } from 'react';
const Card = ({ className = '', children }) => (_jsx("div", { className: `bg-white rounded-lg shadow-sm border border-gray-200 ${className}`, children: children }));
// Mock auth hook for now
const useAuth = () => ({ user: { id: 'seller-1', role: 'seller' } });
// Mock API
const api = {
    get: async (url) => {
        console.log('API call:', url);
        return { data: { orders: [], products: [] } };
    }
};
import { Package, TrendingUp, ShoppingCart, AlertCircle, DollarSign, Users, Clock, BarChart3 } from 'lucide-react';
export const SellerDashboard = () => {
    const { user } = useAuth();
    const [stats, setStats] = useState({
        todaySales: 0,
        todayOrders: 0,
        pendingOrders: 0,
        lowStockItems: 0,
        totalRevenue: 0,
        totalCustomers: 0,
        avgOrderValue: 0,
        conversionRate: 0
    });
    const [recentOrders, setRecentOrders] = useState([]);
    const [lowStockProducts, setLowStockProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const fetchDashboardData = useCallback(async () => {
        if (!user?.id)
            return;
        try {
            setLoading(true);
            // Fetch dashboard stats
            const [statsRes, ordersRes, stockRes] = await Promise.all([
                api.get(`/api/seller/dashboard/stats/${user.id}`),
                api.get(`/api/seller/orders/recent/${user.id}?limit=5`),
                api.get(`/api/seller/inventory/low-stock/${user.id}`)
            ]);
            setStats(statsRes.data || {
                todaySales: 0,
                todayOrders: 0,
                pendingOrders: 0,
                lowStockItems: 0,
                totalRevenue: 0,
                totalCustomers: 0,
                avgOrderValue: 0,
                conversionRate: 0
            });
            setRecentOrders(ordersRes.data?.orders || []);
            setLowStockProducts(stockRes.data?.products || []);
        }
        catch (error) {
            console.error('Failed to fetch dashboard data:', error);
        }
        finally {
            setLoading(false);
        }
    }, [user]);
    useEffect(() => {
        fetchDashboardData();
    }, [fetchDashboardData]);
    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('ko-KR', {
            style: 'currency',
            currency: 'KRW'
        }).format(amount);
    };
    const getStatusColor = (status) => {
        switch (status) {
            case 'pending': return 'text-yellow-600 bg-yellow-100';
            case 'processing': return 'text-blue-600 bg-blue-100';
            case 'shipped': return 'text-purple-600 bg-purple-100';
            case 'delivered': return 'text-green-600 bg-green-100';
            case 'cancelled': return 'text-red-600 bg-red-100';
            default: return 'text-gray-600 bg-gray-100';
        }
    };
    if (loading) {
        return (_jsx("div", { className: "flex items-center justify-center h-64", children: _jsx("div", { className: "animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" }) }));
    }
    return (_jsxs("div", { className: "seller-dashboard space-y-6", children: [_jsxs("div", { className: "mb-6", children: [_jsx("h1", { className: "text-2xl font-bold text-gray-900", children: "\uD310\uB9E4\uC790 \uB300\uC2DC\uBCF4\uB4DC" }), _jsx("p", { className: "text-gray-600", children: "\uC624\uB298\uC758 \uD310\uB9E4 \uD604\uD669\uACFC \uC8FC\uC694 \uC9C0\uD45C\uB97C \uD655\uC778\uD558\uC138\uC694" })] }), _jsxs("div", { className: "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4", children: [_jsx(Card, { className: "p-6", children: _jsxs("div", { className: "flex items-center justify-between", children: [_jsxs("div", { children: [_jsx("p", { className: "text-sm text-gray-600", children: "\uC624\uB298 \uB9E4\uCD9C" }), _jsx("p", { className: "text-2xl font-bold text-gray-900", children: formatCurrency(stats.todaySales) }), _jsx("p", { className: "text-xs text-green-600 mt-1", children: "+12% \uC804\uC77C \uB300\uBE44" })] }), _jsx("div", { className: "p-3 bg-blue-100 rounded-lg", children: _jsx(DollarSign, { className: "h-6 w-6 text-blue-600" }) })] }) }), _jsx(Card, { className: "p-6", children: _jsxs("div", { className: "flex items-center justify-between", children: [_jsxs("div", { children: [_jsx("p", { className: "text-sm text-gray-600", children: "\uC624\uB298 \uC8FC\uBB38" }), _jsxs("p", { className: "text-2xl font-bold text-gray-900", children: [stats.todayOrders, "\uAC74"] }), _jsx("p", { className: "text-xs text-green-600 mt-1", children: "+5\uAC74 \uC804\uC77C \uB300\uBE44" })] }), _jsx("div", { className: "p-3 bg-green-100 rounded-lg", children: _jsx(ShoppingCart, { className: "h-6 w-6 text-green-600" }) })] }) }), _jsx(Card, { className: "p-6", children: _jsxs("div", { className: "flex items-center justify-between", children: [_jsxs("div", { children: [_jsx("p", { className: "text-sm text-gray-600", children: "\uCC98\uB9AC \uB300\uAE30" }), _jsxs("p", { className: "text-2xl font-bold text-gray-900", children: [stats.pendingOrders, "\uAC74"] }), _jsx("p", { className: "text-xs text-yellow-600 mt-1", children: "\uC989\uC2DC \uCC98\uB9AC \uD544\uC694" })] }), _jsx("div", { className: "p-3 bg-yellow-100 rounded-lg", children: _jsx(Clock, { className: "h-6 w-6 text-yellow-600" }) })] }) }), _jsx(Card, { className: "p-6", children: _jsxs("div", { className: "flex items-center justify-between", children: [_jsxs("div", { children: [_jsx("p", { className: "text-sm text-gray-600", children: "\uC7AC\uACE0 \uBD80\uC871" }), _jsxs("p", { className: "text-2xl font-bold text-gray-900", children: [stats.lowStockItems, "\uAC1C"] }), _jsx("p", { className: "text-xs text-red-600 mt-1", children: "\uC7AC\uACE0 \uBCF4\uCDA9 \uD544\uC694" })] }), _jsx("div", { className: "p-3 bg-red-100 rounded-lg", children: _jsx(AlertCircle, { className: "h-6 w-6 text-red-600" }) })] }) })] }), _jsxs("div", { className: "grid grid-cols-1 md:grid-cols-3 gap-4", children: [_jsx(Card, { className: "p-6", children: _jsxs("div", { className: "flex items-center justify-between", children: [_jsxs("div", { children: [_jsx("p", { className: "text-sm text-gray-600", children: "\uCD1D \uB9E4\uCD9C" }), _jsx("p", { className: "text-xl font-bold text-gray-900", children: formatCurrency(stats.totalRevenue) }), _jsx("p", { className: "text-xs text-gray-500 mt-1", children: "\uC774\uBC88 \uB2EC \uB204\uC801" })] }), _jsx(TrendingUp, { className: "h-8 w-8 text-blue-600" })] }) }), _jsx(Card, { className: "p-6", children: _jsxs("div", { className: "flex items-center justify-between", children: [_jsxs("div", { children: [_jsx("p", { className: "text-sm text-gray-600", children: "\uD3C9\uADE0 \uC8FC\uBB38 \uAE08\uC561" }), _jsx("p", { className: "text-xl font-bold text-gray-900", children: formatCurrency(stats.avgOrderValue) }), _jsx("p", { className: "text-xs text-gray-500 mt-1", children: "\uCD5C\uADFC 30\uC77C" })] }), _jsx(BarChart3, { className: "h-8 w-8 text-green-600" })] }) }), _jsx(Card, { className: "p-6", children: _jsxs("div", { className: "flex items-center justify-between", children: [_jsxs("div", { children: [_jsx("p", { className: "text-sm text-gray-600", children: "\uC804\uD658\uC728" }), _jsxs("p", { className: "text-xl font-bold text-gray-900", children: [stats.conversionRate, "%"] }), _jsx("p", { className: "text-xs text-gray-500 mt-1", children: "\uBC29\uBB38\uC790 \uB300\uBE44 \uAD6C\uB9E4" })] }), _jsx(Users, { className: "h-8 w-8 text-purple-600" })] }) })] }), _jsxs("div", { className: "grid grid-cols-1 lg:grid-cols-2 gap-6", children: [_jsxs(Card, { className: "p-6", children: [_jsxs("div", { className: "flex items-center justify-between mb-4", children: [_jsx("h2", { className: "text-lg font-semibold text-gray-900", children: "\uCD5C\uADFC \uC8FC\uBB38" }), _jsx("a", { href: "/seller/orders", className: "text-sm text-blue-600 hover:text-blue-700", children: "\uC804\uCCB4 \uBCF4\uAE30 \u2192" })] }), _jsx("div", { className: "space-y-3", children: recentOrders.length > 0 ? (recentOrders.map((order) => (_jsxs("div", { className: "flex items-center justify-between p-3 bg-gray-50 rounded-lg", children: [_jsxs("div", { className: "flex-1", children: [_jsxs("p", { className: "font-medium text-gray-900", children: ["#", order.orderNumber] }), _jsx("p", { className: "text-sm text-gray-600", children: order.customer })] }), _jsxs("div", { className: "text-right", children: [_jsx("p", { className: "font-medium text-gray-900", children: formatCurrency(order.amount) }), _jsx("span", { className: `text-xs px-2 py-1 rounded-full ${getStatusColor(order.status)}`, children: order.status })] })] }, order.id)))) : (_jsx("p", { className: "text-gray-500 text-center py-4", children: "\uC8FC\uBB38 \uB0B4\uC5ED\uC774 \uC5C6\uC2B5\uB2C8\uB2E4" })) })] }), _jsxs(Card, { className: "p-6", children: [_jsxs("div", { className: "flex items-center justify-between mb-4", children: [_jsx("h2", { className: "text-lg font-semibold text-gray-900", children: "\uC7AC\uACE0 \uBD80\uC871 \uC54C\uB9BC" }), _jsx("a", { href: "/seller/inventory", className: "text-sm text-blue-600 hover:text-blue-700", children: "\uC7AC\uACE0 \uAD00\uB9AC \u2192" })] }), _jsx("div", { className: "space-y-3", children: lowStockProducts.length > 0 ? (lowStockProducts.map((product) => (_jsxs("div", { className: "flex items-center justify-between p-3 bg-red-50 rounded-lg", children: [_jsxs("div", { className: "flex items-center space-x-3", children: [_jsx(Package, { className: "h-5 w-5 text-red-600" }), _jsxs("div", { children: [_jsx("p", { className: "font-medium text-gray-900", children: product.name }), _jsxs("p", { className: "text-sm text-gray-600", children: ["SKU: ", product.sku] })] })] }), _jsxs("div", { className: "text-right", children: [_jsxs("p", { className: "font-medium text-red-600", children: [product.stock, "\uAC1C \uB0A8\uC74C"] }), _jsxs("p", { className: "text-xs text-gray-500", children: ["\uC784\uACC4\uAC12: ", product.threshold, "\uAC1C"] })] })] }, product.id)))) : (_jsx("p", { className: "text-gray-500 text-center py-4", children: "\uC7AC\uACE0 \uBD80\uC871 \uC0C1\uD488\uC774 \uC5C6\uC2B5\uB2C8\uB2E4" })) })] })] }), _jsxs(Card, { className: "p-6", children: [_jsx("h2", { className: "text-lg font-semibold text-gray-900 mb-4", children: "\uBE60\uB978 \uC791\uC5C5" }), _jsxs("div", { className: "grid grid-cols-2 md:grid-cols-4 gap-4", children: [_jsxs("button", { className: "p-4 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors", children: [_jsx(Package, { className: "h-6 w-6 text-blue-600 mx-auto mb-2" }), _jsx("p", { className: "text-sm font-medium text-gray-900", children: "\uC0C1\uD488 \uB4F1\uB85D" })] }), _jsxs("button", { className: "p-4 bg-green-50 rounded-lg hover:bg-green-100 transition-colors", children: [_jsx(ShoppingCart, { className: "h-6 w-6 text-green-600 mx-auto mb-2" }), _jsx("p", { className: "text-sm font-medium text-gray-900", children: "\uC8FC\uBB38 \uAD00\uB9AC" })] }), _jsxs("button", { className: "p-4 bg-purple-50 rounded-lg hover:bg-purple-100 transition-colors", children: [_jsx(BarChart3, { className: "h-6 w-6 text-purple-600 mx-auto mb-2" }), _jsx("p", { className: "text-sm font-medium text-gray-900", children: "\uB9E4\uCD9C \uBD84\uC11D" })] }), _jsxs("button", { className: "p-4 bg-yellow-50 rounded-lg hover:bg-yellow-100 transition-colors", children: [_jsx(AlertCircle, { className: "h-6 w-6 text-yellow-600 mx-auto mb-2" }), _jsx("p", { className: "text-sm font-medium text-gray-900", children: "\uC7AC\uACE0 \uD655\uC778" })] })] })] })] }));
};

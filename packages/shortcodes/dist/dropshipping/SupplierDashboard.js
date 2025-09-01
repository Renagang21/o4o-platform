import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
/**
 * Supplier Dashboard Shortcode Component
 * [supplier_dashboard] - 공급자 전용 대시보드
 */
import { useEffect, useState, useCallback } from 'react';
const Card = ({ className = '', children }) => (_jsx("div", { className: `bg-white rounded-lg shadow-sm border border-gray-200 ${className}`, children: children }));
// Mock auth hook for now
const useAuth = () => ({ user: { id: 'supplier-1', role: 'supplier' } });
// Mock API
const api = {
    get: async (_url) => {
        // API call to fetch data
        return { data: { orders: [], products: [] } };
    }
};
import { Package, Truck, Clock, CheckCircle, AlertTriangle, BarChart3, TrendingUp, Boxes } from 'lucide-react';
export const SupplierDashboard = () => {
    const { user } = useAuth();
    const [stats, setStats] = useState({
        pendingOrders: 0,
        processingOrders: 0,
        shippedToday: 0,
        totalProducts: 0,
        lowStockProducts: 0,
        totalRevenue: 0,
        monthlyOrders: 0,
        fulfillmentRate: 0
    });
    const [pendingOrders, setPendingOrders] = useState([]);
    const [inventory, setInventory] = useState([]);
    const [loading, setLoading] = useState(true);
    const fetchSupplierData = useCallback(async () => {
        if (!user?.id)
            return;
        try {
            setLoading(true);
            // Fetch supplier dashboard data
            const [statsRes, ordersRes, inventoryRes] = await Promise.all([
                api.get(`/api/supplier/dashboard/stats/${user.id}`),
                api.get(`/api/supplier/orders/pending/${user.id}?limit=5`),
                api.get(`/api/supplier/inventory/status/${user.id}?limit=10`)
            ]);
            setStats(statsRes.data || {
                pendingOrders: 0,
                processingOrders: 0,
                shippedToday: 0,
                totalProducts: 0,
                lowStockProducts: 0,
                totalRevenue: 0,
                monthlyOrders: 0,
                fulfillmentRate: 0
            });
            setPendingOrders(ordersRes.data?.orders || []);
            setInventory(inventoryRes.data?.products || []);
        }
        catch (error) {
            console.error('Failed to fetch supplier data:', error);
        }
        finally {
            setLoading(false);
        }
    }, [user]);
    useEffect(() => {
        fetchSupplierData();
    }, [fetchSupplierData]);
    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('ko-KR', {
            style: 'currency',
            currency: 'KRW'
        }).format(amount);
    };
    const getUrgencyColor = (requiredBy) => {
        const hoursLeft = (new Date(requiredBy).getTime() - Date.now()) / (1000 * 60 * 60);
        if (hoursLeft < 24)
            return 'text-red-600 bg-red-100';
        if (hoursLeft < 48)
            return 'text-yellow-600 bg-yellow-100';
        return 'text-green-600 bg-green-100';
    };
    const getStockStatus = (available, reserved) => {
        const total = available - reserved;
        if (total <= 0)
            return { color: 'text-red-600', text: '재고 없음' };
        if (total < 10)
            return { color: 'text-yellow-600', text: '재고 부족' };
        return { color: 'text-green-600', text: '재고 충분' };
    };
    if (loading) {
        return (_jsx("div", { className: "flex items-center justify-center h-64", children: _jsx("div", { className: "animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" }) }));
    }
    return (_jsxs("div", { className: "supplier-dashboard space-y-6", children: [_jsxs("div", { className: "mb-6", children: [_jsx("h1", { className: "text-2xl font-bold text-gray-900", children: "\uACF5\uAE09\uC790 \uB300\uC2DC\uBCF4\uB4DC" }), _jsx("p", { className: "text-gray-600", children: "\uC8FC\uBB38 \uCC98\uB9AC \uD604\uD669\uACFC \uC7AC\uACE0 \uC0C1\uD0DC\uB97C \uAD00\uB9AC\uD558\uC138\uC694" })] }), _jsxs("div", { className: "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4", children: [_jsx(Card, { className: "p-6", children: _jsxs("div", { className: "flex items-center justify-between", children: [_jsxs("div", { children: [_jsx("p", { className: "text-sm text-gray-600", children: "\uB300\uAE30 \uC8FC\uBB38" }), _jsxs("p", { className: "text-2xl font-bold text-yellow-600", children: [stats.pendingOrders, "\uAC74"] }), _jsx("p", { className: "text-xs text-gray-500 mt-1", children: "\uC989\uC2DC \uCC98\uB9AC \uD544\uC694" })] }), _jsx("div", { className: "p-3 bg-yellow-100 rounded-lg", children: _jsx(Clock, { className: "h-6 w-6 text-yellow-600" }) })] }) }), _jsx(Card, { className: "p-6", children: _jsxs("div", { className: "flex items-center justify-between", children: [_jsxs("div", { children: [_jsx("p", { className: "text-sm text-gray-600", children: "\uCC98\uB9AC \uC911" }), _jsxs("p", { className: "text-2xl font-bold text-blue-600", children: [stats.processingOrders, "\uAC74"] }), _jsx("p", { className: "text-xs text-gray-500 mt-1", children: "\uD3EC\uC7A5/\uC900\uBE44 \uC911" })] }), _jsx("div", { className: "p-3 bg-blue-100 rounded-lg", children: _jsx(Package, { className: "h-6 w-6 text-blue-600" }) })] }) }), _jsx(Card, { className: "p-6", children: _jsxs("div", { className: "flex items-center justify-between", children: [_jsxs("div", { children: [_jsx("p", { className: "text-sm text-gray-600", children: "\uC624\uB298 \uBC1C\uC1A1" }), _jsxs("p", { className: "text-2xl font-bold text-green-600", children: [stats.shippedToday, "\uAC74"] }), _jsx("p", { className: "text-xs text-gray-500 mt-1", children: "\uBC1C\uC1A1 \uC644\uB8CC" })] }), _jsx("div", { className: "p-3 bg-green-100 rounded-lg", children: _jsx(Truck, { className: "h-6 w-6 text-green-600" }) })] }) }), _jsx(Card, { className: "p-6", children: _jsxs("div", { className: "flex items-center justify-between", children: [_jsxs("div", { children: [_jsx("p", { className: "text-sm text-gray-600", children: "\uC774\uD589\uB960" }), _jsxs("p", { className: "text-2xl font-bold text-purple-600", children: [stats.fulfillmentRate, "%"] }), _jsx("p", { className: "text-xs text-gray-500 mt-1", children: "\uC815\uC2DC \uBC30\uC1A1\uB960" })] }), _jsx("div", { className: "p-3 bg-purple-100 rounded-lg", children: _jsx(CheckCircle, { className: "h-6 w-6 text-purple-600" }) })] }) })] }), _jsxs(Card, { className: "p-6", children: [_jsxs("div", { className: "flex items-center justify-between mb-4", children: [_jsx("h2", { className: "text-lg font-semibold text-gray-900", children: "\uCC98\uB9AC \uB300\uAE30 \uC8FC\uBB38" }), _jsx("a", { href: "/supplier/orders", className: "text-sm text-blue-600 hover:text-blue-700", children: "\uC804\uCCB4 \uC8FC\uBB38 \uBCF4\uAE30 \u2192" })] }), _jsx("div", { className: "overflow-x-auto", children: _jsxs("table", { className: "w-full", children: [_jsx("thead", { children: _jsxs("tr", { className: "border-b border-gray-200", children: [_jsx("th", { className: "text-left py-3 px-4 text-sm font-medium text-gray-700", children: "\uC8FC\uBB38\uBC88\uD638" }), _jsx("th", { className: "text-left py-3 px-4 text-sm font-medium text-gray-700", children: "\uACE0\uAC1D\uBA85" }), _jsx("th", { className: "text-left py-3 px-4 text-sm font-medium text-gray-700", children: "\uC0C1\uD488\uC218" }), _jsx("th", { className: "text-left py-3 px-4 text-sm font-medium text-gray-700", children: "\uAE08\uC561" }), _jsx("th", { className: "text-left py-3 px-4 text-sm font-medium text-gray-700", children: "\uC694\uCCAD \uAE30\uD55C" }), _jsx("th", { className: "text-left py-3 px-4 text-sm font-medium text-gray-700", children: "\uC791\uC5C5" })] }) }), _jsx("tbody", { children: pendingOrders.length > 0 ? (pendingOrders.map((order) => (_jsxs("tr", { className: "border-b border-gray-100 hover:bg-gray-50", children: [_jsx("td", { className: "py-3 px-4", children: _jsxs("span", { className: "font-medium text-gray-900", children: ["#", order.orderId] }) }), _jsx("td", { className: "py-3 px-4 text-gray-600", children: order.customerName }), _jsxs("td", { className: "py-3 px-4 text-gray-600", children: [order.items, "\uAC1C"] }), _jsx("td", { className: "py-3 px-4 font-medium text-gray-900", children: formatCurrency(order.totalAmount) }), _jsx("td", { className: "py-3 px-4", children: _jsx("span", { className: `text-xs px-2 py-1 rounded-full ${getUrgencyColor(order.requiredBy)}`, children: new Date(order.requiredBy).toLocaleDateString() }) }), _jsx("td", { className: "py-3 px-4", children: _jsx("button", { className: "text-blue-600 hover:text-blue-700 text-sm font-medium", children: "\uCC98\uB9AC\uD558\uAE30" }) })] }, order.id)))) : (_jsx("tr", { children: _jsx("td", { colSpan: 6, className: "text-center py-8 text-gray-500", children: "\uB300\uAE30 \uC911\uC778 \uC8FC\uBB38\uC774 \uC5C6\uC2B5\uB2C8\uB2E4" }) })) })] }) })] }), _jsxs("div", { className: "grid grid-cols-1 lg:grid-cols-2 gap-6", children: [_jsxs(Card, { className: "p-6", children: [_jsxs("div", { className: "flex items-center justify-between mb-4", children: [_jsx("h2", { className: "text-lg font-semibold text-gray-900", children: "\uC7AC\uACE0 \uD604\uD669" }), _jsx("a", { href: "/supplier/inventory", className: "text-sm text-blue-600 hover:text-blue-700", children: "\uC7AC\uACE0 \uAD00\uB9AC \u2192" })] }), _jsx("div", { className: "space-y-3", children: inventory.length > 0 ? (inventory.slice(0, 5).map((product) => {
                                    const stockStatus = getStockStatus(product.available, product.reserved);
                                    return (_jsxs("div", { className: "flex items-center justify-between p-3 bg-gray-50 rounded-lg", children: [_jsxs("div", { className: "flex-1", children: [_jsx("p", { className: "font-medium text-gray-900", children: product.name }), _jsxs("p", { className: "text-sm text-gray-600", children: ["SKU: ", product.sku] })] }), _jsxs("div", { className: "text-right", children: [_jsxs("p", { className: `font-medium ${stockStatus.color}`, children: [product.available - product.reserved, "\uAC1C"] }), _jsxs("p", { className: "text-xs text-gray-500", children: ["\uC608\uC57D: ", product.reserved, "\uAC1C"] })] })] }, product.id));
                                })) : (_jsx("p", { className: "text-gray-500 text-center py-4", children: "\uC7AC\uACE0 \uC815\uBCF4\uAC00 \uC5C6\uC2B5\uB2C8\uB2E4" })) })] }), _jsxs(Card, { className: "p-6", children: [_jsx("h2", { className: "text-lg font-semibold text-gray-900 mb-4", children: "\uC774\uBC88 \uB2EC \uC2E4\uC801" }), _jsxs("div", { className: "space-y-4", children: [_jsxs("div", { className: "flex items-center justify-between p-3 bg-blue-50 rounded-lg", children: [_jsxs("div", { className: "flex items-center space-x-3", children: [_jsx(BarChart3, { className: "h-5 w-5 text-blue-600" }), _jsx("span", { className: "text-gray-700", children: "\uCD1D \uB9E4\uCD9C" })] }), _jsx("span", { className: "font-bold text-gray-900", children: formatCurrency(stats.totalRevenue) })] }), _jsxs("div", { className: "flex items-center justify-between p-3 bg-green-50 rounded-lg", children: [_jsxs("div", { className: "flex items-center space-x-3", children: [_jsx(TrendingUp, { className: "h-5 w-5 text-green-600" }), _jsx("span", { className: "text-gray-700", children: "\uCC98\uB9AC \uC8FC\uBB38" })] }), _jsxs("span", { className: "font-bold text-gray-900", children: [stats.monthlyOrders, "\uAC74"] })] }), _jsxs("div", { className: "flex items-center justify-between p-3 bg-purple-50 rounded-lg", children: [_jsxs("div", { className: "flex items-center space-x-3", children: [_jsx(Boxes, { className: "h-5 w-5 text-purple-600" }), _jsx("span", { className: "text-gray-700", children: "\uB4F1\uB85D \uC0C1\uD488" })] }), _jsxs("span", { className: "font-bold text-gray-900", children: [stats.totalProducts, "\uAC1C"] })] }), _jsxs("div", { className: "flex items-center justify-between p-3 bg-yellow-50 rounded-lg", children: [_jsxs("div", { className: "flex items-center space-x-3", children: [_jsx(AlertTriangle, { className: "h-5 w-5 text-yellow-600" }), _jsx("span", { className: "text-gray-700", children: "\uC7AC\uACE0 \uBD80\uC871" })] }), _jsxs("span", { className: "font-bold text-red-600", children: [stats.lowStockProducts, "\uAC1C"] })] })] })] })] })] }));
};

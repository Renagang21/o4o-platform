import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
/**
 * Affiliate Dashboard Shortcode Component
 * [affiliate_dashboard] - 제휴자 전용 대시보드
 */
import { useEffect, useState, useCallback } from 'react';
const Card = ({ className = '', children }) => (_jsx("div", { className: `bg-white rounded-lg shadow-sm border border-gray-200 ${className}`, children: children }));
// Mock auth hook for now
const useAuth = () => ({ user: { id: 'affiliate-1', role: 'affiliate' } });
// Mock API
const api = {
    get: async (_url) => {
        // API call to fetch data
        return { data: { links: [], commissions: [] } };
    }
};
import { DollarSign, TrendingUp, Users, Link2, MousePointerClick, ShoppingCart, Calendar, Copy, ExternalLink, Award } from 'lucide-react';
export const AffiliateDashboard = () => {
    const { user } = useAuth();
    const [stats, setStats] = useState({
        totalEarnings: 0,
        monthlyEarnings: 0,
        pendingCommission: 0,
        totalClicks: 0,
        totalConversions: 0,
        conversionRate: 0,
        activeLinks: 0,
        totalReferrals: 0
    });
    const [affiliateLinks, setAffiliateLinks] = useState([]);
    const [commissionHistory, setCommissionHistory] = useState([]);
    const [loading, setLoading] = useState(true);
    const [copiedLink, setCopiedLink] = useState(null);
    const fetchAffiliateData = useCallback(async () => {
        if (!user?.id)
            return;
        try {
            setLoading(true);
            // Fetch affiliate dashboard data
            const [statsRes, linksRes, commissionRes] = await Promise.all([
                api.get(`/api/affiliate/dashboard/stats/${user.id}`),
                api.get(`/api/affiliate/links/${user.id}?limit=5`),
                api.get(`/api/affiliate/commissions/${user.id}?limit=10`)
            ]);
            setStats(statsRes.data || {
                totalEarnings: 0,
                monthlyEarnings: 0,
                pendingCommission: 0,
                totalClicks: 0,
                totalConversions: 0,
                conversionRate: 0,
                activeLinks: 0,
                totalReferrals: 0
            });
            setAffiliateLinks(linksRes.data?.links || []);
            setCommissionHistory(commissionRes.data?.commissions || []);
        }
        catch (error) {
            console.error('Failed to fetch affiliate data:', error);
        }
        finally {
            setLoading(false);
        }
    }, [user]);
    useEffect(() => {
        fetchAffiliateData();
    }, [fetchAffiliateData]);
    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('ko-KR', {
            style: 'currency',
            currency: 'KRW'
        }).format(amount);
    };
    const copyToClipboard = async (text, linkId) => {
        try {
            await navigator.clipboard.writeText(text);
            setCopiedLink(linkId);
            setTimeout(() => setCopiedLink(null), 2000);
        }
        catch (err) {
            console.error('Failed to copy:', err);
        }
    };
    const getStatusBadge = (status) => {
        switch (status) {
            case 'pending':
                return 'text-yellow-600 bg-yellow-100';
            case 'approved':
                return 'text-blue-600 bg-blue-100';
            case 'paid':
                return 'text-green-600 bg-green-100';
            default:
                return 'text-gray-600 bg-gray-100';
        }
    };
    const getStatusText = (status) => {
        switch (status) {
            case 'pending':
                return '대기중';
            case 'approved':
                return '승인됨';
            case 'paid':
                return '지급완료';
            default:
                return status;
        }
    };
    if (loading) {
        return (_jsx("div", { className: "flex items-center justify-center h-64", children: _jsx("div", { className: "animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" }) }));
    }
    return (_jsxs("div", { className: "affiliate-dashboard space-y-6", children: [_jsxs("div", { className: "mb-6", children: [_jsx("h1", { className: "text-2xl font-bold text-gray-900", children: "\uC81C\uD734 \uB300\uC2DC\uBCF4\uB4DC" }), _jsx("p", { className: "text-gray-600", children: "\uC81C\uD734 \uC218\uC775\uACFC \uC2E4\uC801\uC744 \uD655\uC778\uD558\uC138\uC694" })] }), _jsxs("div", { className: "grid grid-cols-1 md:grid-cols-3 gap-4", children: [_jsx(Card, { className: "p-6 bg-gradient-to-r from-blue-500 to-blue-600 text-white", children: _jsxs("div", { className: "flex items-center justify-between", children: [_jsxs("div", { children: [_jsx("p", { className: "text-blue-100", children: "\uCD1D \uC218\uC775" }), _jsx("p", { className: "text-3xl font-bold", children: formatCurrency(stats.totalEarnings) }), _jsx("p", { className: "text-sm text-blue-100 mt-1", children: "\uC804\uCCB4 \uAE30\uAC04" })] }), _jsx(DollarSign, { className: "h-10 w-10 text-blue-200" })] }) }), _jsx(Card, { className: "p-6 bg-gradient-to-r from-green-500 to-green-600 text-white", children: _jsxs("div", { className: "flex items-center justify-between", children: [_jsxs("div", { children: [_jsx("p", { className: "text-green-100", children: "\uC774\uBC88 \uB2EC \uC218\uC775" }), _jsx("p", { className: "text-3xl font-bold", children: formatCurrency(stats.monthlyEarnings) }), _jsx("p", { className: "text-sm text-green-100 mt-1", children: "+15% \uC804\uC6D4 \uB300\uBE44" })] }), _jsx(TrendingUp, { className: "h-10 w-10 text-green-200" })] }) }), _jsx(Card, { className: "p-6 bg-gradient-to-r from-yellow-500 to-yellow-600 text-white", children: _jsxs("div", { className: "flex items-center justify-between", children: [_jsxs("div", { children: [_jsx("p", { className: "text-yellow-100", children: "\uB300\uAE30 \uC218\uC218\uB8CC" }), _jsx("p", { className: "text-3xl font-bold", children: formatCurrency(stats.pendingCommission) }), _jsx("p", { className: "text-sm text-yellow-100 mt-1", children: "\uC815\uC0B0 \uC608\uC815" })] }), _jsx(Calendar, { className: "h-10 w-10 text-yellow-200" })] }) })] }), _jsxs("div", { className: "grid grid-cols-1 md:grid-cols-4 gap-4", children: [_jsx(Card, { className: "p-6", children: _jsxs("div", { className: "flex items-center justify-between", children: [_jsxs("div", { children: [_jsx("p", { className: "text-sm text-gray-600", children: "\uCD1D \uD074\uB9AD\uC218" }), _jsx("p", { className: "text-2xl font-bold text-gray-900", children: stats.totalClicks.toLocaleString() }), _jsx("p", { className: "text-xs text-gray-500 mt-1", children: "\uB204\uC801" })] }), _jsx(MousePointerClick, { className: "h-8 w-8 text-blue-600" })] }) }), _jsx(Card, { className: "p-6", children: _jsxs("div", { className: "flex items-center justify-between", children: [_jsxs("div", { children: [_jsx("p", { className: "text-sm text-gray-600", children: "\uC804\uD658\uC218" }), _jsx("p", { className: "text-2xl font-bold text-gray-900", children: stats.totalConversions }), _jsx("p", { className: "text-xs text-gray-500 mt-1", children: "\uAD6C\uB9E4 \uC644\uB8CC" })] }), _jsx(ShoppingCart, { className: "h-8 w-8 text-green-600" })] }) }), _jsx(Card, { className: "p-6", children: _jsxs("div", { className: "flex items-center justify-between", children: [_jsxs("div", { children: [_jsx("p", { className: "text-sm text-gray-600", children: "\uC804\uD658\uC728" }), _jsxs("p", { className: "text-2xl font-bold text-gray-900", children: [stats.conversionRate, "%"] }), _jsx("p", { className: "text-xs text-gray-500 mt-1", children: "\uD074\uB9AD \uB300\uBE44" })] }), _jsx(Award, { className: "h-8 w-8 text-purple-600" })] }) }), _jsx(Card, { className: "p-6", children: _jsxs("div", { className: "flex items-center justify-between", children: [_jsxs("div", { children: [_jsx("p", { className: "text-sm text-gray-600", children: "\uD65C\uC131 \uB9C1\uD06C" }), _jsxs("p", { className: "text-2xl font-bold text-gray-900", children: [stats.activeLinks, "\uAC1C"] }), _jsx("p", { className: "text-xs text-gray-500 mt-1", children: "\uC0AC\uC6A9 \uC911" })] }), _jsx(Link2, { className: "h-8 w-8 text-orange-600" })] }) })] }), _jsxs(Card, { className: "p-6", children: [_jsxs("div", { className: "flex items-center justify-between mb-4", children: [_jsx("h2", { className: "text-lg font-semibold text-gray-900", children: "\uC81C\uD734 \uB9C1\uD06C \uC2E4\uC801" }), _jsx("a", { href: "/affiliate/links", className: "text-sm text-blue-600 hover:text-blue-700", children: "\uB9C1\uD06C \uAD00\uB9AC \u2192" })] }), _jsx("div", { className: "overflow-x-auto", children: _jsxs("table", { className: "w-full", children: [_jsx("thead", { children: _jsxs("tr", { className: "border-b border-gray-200", children: [_jsx("th", { className: "text-left py-3 px-4 text-sm font-medium text-gray-700", children: "\uC0C1\uD488\uBA85" }), _jsx("th", { className: "text-left py-3 px-4 text-sm font-medium text-gray-700", children: "\uB9C1\uD06C" }), _jsx("th", { className: "text-center py-3 px-4 text-sm font-medium text-gray-700", children: "\uD074\uB9AD" }), _jsx("th", { className: "text-center py-3 px-4 text-sm font-medium text-gray-700", children: "\uC804\uD658" }), _jsx("th", { className: "text-right py-3 px-4 text-sm font-medium text-gray-700", children: "\uC218\uC775" }), _jsx("th", { className: "text-center py-3 px-4 text-sm font-medium text-gray-700", children: "\uC791\uC5C5" })] }) }), _jsx("tbody", { children: affiliateLinks.length > 0 ? (affiliateLinks.map((link) => (_jsxs("tr", { className: "border-b border-gray-100 hover:bg-gray-50", children: [_jsx("td", { className: "py-3 px-4", children: _jsx("p", { className: "font-medium text-gray-900", children: link.productName }) }), _jsx("td", { className: "py-3 px-4", children: _jsx("code", { className: "text-xs bg-gray-100 px-2 py-1 rounded", children: link.shortLink }) }), _jsx("td", { className: "py-3 px-4 text-center", children: link.clicks }), _jsx("td", { className: "py-3 px-4 text-center", children: link.conversions }), _jsx("td", { className: "py-3 px-4 text-right font-medium", children: formatCurrency(link.earnings) }), _jsx("td", { className: "py-3 px-4", children: _jsxs("div", { className: "flex items-center justify-center space-x-2", children: [_jsx("button", { onClick: () => copyToClipboard(link.fullLink, link.id), className: "text-gray-600 hover:text-blue-600", children: copiedLink === link.id ? (_jsx("span", { className: "text-xs text-green-600", children: "\uBCF5\uC0AC\uB428!" })) : (_jsx(Copy, { className: "h-4 w-4" })) }), _jsx("a", { href: link.fullLink, target: "_blank", rel: "noopener noreferrer", className: "text-gray-600 hover:text-blue-600", children: _jsx(ExternalLink, { className: "h-4 w-4" }) })] }) })] }, link.id)))) : (_jsx("tr", { children: _jsx("td", { colSpan: 6, className: "text-center py-8 text-gray-500", children: "\uC81C\uD734 \uB9C1\uD06C\uAC00 \uC5C6\uC2B5\uB2C8\uB2E4" }) })) })] }) })] }), _jsxs(Card, { className: "p-6", children: [_jsxs("div", { className: "flex items-center justify-between mb-4", children: [_jsx("h2", { className: "text-lg font-semibold text-gray-900", children: "\uC218\uC218\uB8CC \uB0B4\uC5ED" }), _jsx("a", { href: "/affiliate/commissions", className: "text-sm text-blue-600 hover:text-blue-700", children: "\uC804\uCCB4 \uB0B4\uC5ED \uBCF4\uAE30 \u2192" })] }), _jsx("div", { className: "space-y-3", children: commissionHistory.length > 0 ? (commissionHistory.map((commission) => (_jsxs("div", { className: "flex items-center justify-between p-4 bg-gray-50 rounded-lg", children: [_jsxs("div", { className: "flex-1", children: [_jsx("p", { className: "font-medium text-gray-900", children: commission.productName }), _jsxs("p", { className: "text-sm text-gray-600", children: ["\uC8FC\uBB38 #", commission.orderId, " \u00B7 ", new Date(commission.date).toLocaleDateString()] })] }), _jsxs("div", { className: "text-right", children: [_jsx("p", { className: "font-medium text-gray-900", children: formatCurrency(commission.commission) }), _jsxs("p", { className: "text-xs text-gray-500", children: [formatCurrency(commission.orderAmount), "\uC758 5%"] })] }), _jsx("div", { className: "ml-4", children: _jsx("span", { className: `text-xs px-2 py-1 rounded-full ${getStatusBadge(commission.status)}`, children: getStatusText(commission.status) }) })] }, commission.id)))) : (_jsx("p", { className: "text-gray-500 text-center py-4", children: "\uC218\uC218\uB8CC \uB0B4\uC5ED\uC774 \uC5C6\uC2B5\uB2C8\uB2E4" })) })] }), _jsxs(Card, { className: "p-6", children: [_jsx("h2", { className: "text-lg font-semibold text-gray-900 mb-4", children: "\uBE60\uB978 \uC791\uC5C5" }), _jsxs("div", { className: "grid grid-cols-2 md:grid-cols-4 gap-4", children: [_jsxs("button", { className: "p-4 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors", children: [_jsx(Link2, { className: "h-6 w-6 text-blue-600 mx-auto mb-2" }), _jsx("p", { className: "text-sm font-medium text-gray-900", children: "\uB9C1\uD06C \uC0DD\uC131" })] }), _jsxs("button", { className: "p-4 bg-green-50 rounded-lg hover:bg-green-100 transition-colors", children: [_jsx(Users, { className: "h-6 w-6 text-green-600 mx-auto mb-2" }), _jsx("p", { className: "text-sm font-medium text-gray-900", children: "\uCD94\uCC9C\uC778 \uAD00\uB9AC" })] }), _jsxs("button", { className: "p-4 bg-purple-50 rounded-lg hover:bg-purple-100 transition-colors", children: [_jsx(TrendingUp, { className: "h-6 w-6 text-purple-600 mx-auto mb-2" }), _jsx("p", { className: "text-sm font-medium text-gray-900", children: "\uC2E4\uC801 \uBD84\uC11D" })] }), _jsxs("button", { className: "p-4 bg-yellow-50 rounded-lg hover:bg-yellow-100 transition-colors", children: [_jsx(DollarSign, { className: "h-6 w-6 text-yellow-600 mx-auto mb-2" }), _jsx("p", { className: "text-sm font-medium text-gray-900", children: "\uC815\uC0B0 \uC694\uCCAD" })] })] })] })] }));
};

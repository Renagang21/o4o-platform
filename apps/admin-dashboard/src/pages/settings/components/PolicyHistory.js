import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useEffect } from 'react';
import { History, Clock, User, Settings, Search, Download, Edit, Trash2, Plus, ArrowUpRight, Minus, RefreshCw } from 'lucide-react';
const PolicyHistory = ({ category, maxItems = 50 }) => {
    const [historyItems, setHistoryItems] = useState([]);
    const [filteredItems, setFilteredItems] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedCategory, setSelectedCategory] = useState(category || 'all');
    const [selectedAction, setSelectedAction] = useState('all');
    const [dateRange, setDateRange] = useState('7d');
    const [selectedUser, setSelectedUser] = useState('all');
    const mockHistoryItems = [
        {
            id: '1',
            category: 'partners',
            action: 'update',
            changes: { commissionRate: { from: 3.0, to: 5.0 } },
            userId: 'admin-1',
            userName: '관리자',
            timestamp: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
            description: '파트너 기본 커미션 비율을 3%에서 5%로 변경'
        },
        {
            id: '2',
            category: 'sales',
            action: 'update',
            changes: { monthlyTarget: { from: 40000000, to: 50000000 } },
            userId: 'manager-1',
            userName: '영업매니저',
            timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
            description: '월 매출 목표를 4천만원에서 5천만원으로 상향 조정'
        },
        {
            id: '3',
            category: 'inventory',
            action: 'update',
            changes: { lowStockThreshold: { from: 5, to: 10 } },
            userId: 'admin-1',
            userName: '관리자',
            timestamp: new Date(Date.now() - 1000 * 60 * 60 * 6).toISOString(),
            description: '재고 부족 임계값을 5개에서 10개로 변경'
        },
        {
            id: '4',
            category: 'users',
            action: 'update',
            changes: { 'passwordPolicy.minLength': { from: 6, to: 8 } },
            userId: 'security-admin',
            userName: '보안관리자',
            timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
            description: '비밀번호 최소 길이를 6자에서 8자로 강화'
        },
        {
            id: '5',
            category: 'partners',
            action: 'create',
            changes: { tierLevels: { added: { name: '플래티넘', minSales: 10000000, commissionRate: 10.0 } } },
            userId: 'admin-1',
            userName: '관리자',
            timestamp: new Date(Date.now() - 1000 * 60 * 60 * 48).toISOString(),
            description: '플래티넘 파트너 등급 신규 추가'
        },
        {
            id: '6',
            category: 'inventory',
            action: 'update',
            changes: { autoReorder: { from: false, to: true } },
            userId: 'warehouse-manager',
            userName: '창고관리자',
            timestamp: new Date(Date.now() - 1000 * 60 * 60 * 72).toISOString(),
            description: '자동 재주문 시스템 활성화'
        },
        {
            id: '7',
            category: 'sales',
            action: 'update',
            changes: { alertThreshold: { from: 70, to: 80 } },
            userId: 'manager-1',
            userName: '영업매니저',
            timestamp: new Date(Date.now() - 1000 * 60 * 60 * 96).toISOString(),
            description: '매출 알림 임계값을 70%에서 80%로 조정'
        },
        {
            id: '8',
            category: 'users',
            action: 'update',
            changes: { requireApproval: { from: false, to: true } },
            userId: 'admin-1',
            userName: '관리자',
            timestamp: new Date(Date.now() - 1000 * 60 * 60 * 120).toISOString(),
            description: '신규 사용자 수동 승인 필수로 변경'
        },
        {
            id: '9',
            category: 'partners',
            action: 'delete',
            changes: { tierLevels: { removed: { name: '브론즈 플러스' } } },
            userId: 'admin-1',
            userName: '관리자',
            timestamp: new Date(Date.now() - 1000 * 60 * 60 * 168).toISOString(),
            description: '브론즈 플러스 등급 삭제'
        },
        {
            id: '10',
            category: 'users',
            action: 'update',
            changes: { sessionTimeout: { from: 4, to: 8 } },
            userId: 'security-admin',
            userName: '보안관리자',
            timestamp: new Date(Date.now() - 1000 * 60 * 60 * 192).toISOString(),
            description: '세션 타임아웃을 4시간에서 8시간으로 연장'
        }
    ];
    useEffect(() => {
        loadHistoryData();
    }, [category, maxItems]);
    useEffect(() => {
        applyFilters();
    }, [historyItems, searchTerm, selectedCategory, selectedAction, dateRange, selectedUser]);
    const loadHistoryData = async () => {
        setIsLoading(true);
        try {
            await new Promise(resolve => setTimeout(resolve, 1000));
            setHistoryItems(mockHistoryItems.slice(0, maxItems));
        }
        catch (error) {
            console.error('Failed to load history data:', error);
        }
        finally {
            setIsLoading(false);
        }
    };
    const applyFilters = () => {
        let filtered = [...historyItems];
        if (searchTerm) {
            filtered = filtered.filter(item => item.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                item.userName.toLowerCase().includes(searchTerm.toLowerCase()));
        }
        if (selectedCategory !== 'all') {
            filtered = filtered.filter(item => item.category === selectedCategory);
        }
        if (selectedAction !== 'all') {
            filtered = filtered.filter(item => item.action === selectedAction);
        }
        if (selectedUser !== 'all') {
            filtered = filtered.filter(item => item.userId === selectedUser);
        }
        if (dateRange !== 'all') {
            const now = new Date();
            const cutoff = new Date();
            switch (dateRange) {
                case '1d':
                    cutoff.setDate(now.getDate() - 1);
                    break;
                case '7d':
                    cutoff.setDate(now.getDate() - 7);
                    break;
                case '30d':
                    cutoff.setDate(now.getDate() - 30);
                    break;
                case '90d':
                    cutoff.setDate(now.getDate() - 90);
                    break;
                default:
                    cutoff.setFullYear(1970);
            }
            filtered = filtered.filter(item => new Date(item.timestamp) >= cutoff);
        }
        setFilteredItems(filtered);
    };
    const formatTimestamp = (timestamp) => {
        const date = new Date(timestamp);
        const now = new Date();
        const diff = now.getTime() - date.getTime();
        if (diff < 1000 * 60) {
            return '방금 전';
        }
        else if (diff < 1000 * 60 * 60) {
            return `${Math.floor(diff / (1000 * 60))}분 전`;
        }
        else if (diff < 1000 * 60 * 60 * 24) {
            return `${Math.floor(diff / (1000 * 60 * 60))}시간 전`;
        }
        else {
            return date.toLocaleDateString('ko-KR', {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });
        }
    };
    const getCategoryIcon = (category) => {
        const icons = {
            partners: _jsx(User, { className: "w-4 h-4 text-blue-600" }),
            sales: _jsx(ArrowUpRight, { className: "w-4 h-4 text-green-600" }),
            inventory: _jsx(Settings, { className: "w-4 h-4 text-orange-600" }),
            users: _jsx(User, { className: "w-4 h-4 text-purple-600" })
        };
        return icons[category] || _jsx(Settings, { className: "w-4 h-4 text-gray-600" });
    };
    const getCategoryName = (category) => {
        const names = {
            partners: '파트너스',
            sales: '매출 목표',
            inventory: '재고 관리',
            users: '사용자 보안'
        };
        return names[category] || category;
    };
    const getActionIcon = (action) => {
        const icons = {
            create: _jsx(Plus, { className: "w-4 h-4 text-green-600" }),
            update: _jsx(Edit, { className: "w-4 h-4 text-blue-600" }),
            delete: _jsx(Trash2, { className: "w-4 h-4 text-red-600" })
        };
        return icons[action] || _jsx(Settings, { className: "w-4 h-4 text-gray-600" });
    };
    const getActionName = (action) => {
        const names = {
            create: '생성',
            update: '수정',
            delete: '삭제'
        };
        return names[action] || action;
    };
    const getActionColor = (action) => {
        const colors = {
            create: 'bg-green-100 text-green-800',
            update: 'bg-blue-100 text-blue-800',
            delete: 'bg-red-100 text-red-800'
        };
        return colors[action] || 'bg-gray-100 text-gray-800';
    };
    const renderChangeDetails = (changes) => {
        return Object.entries(changes).map(([key, value]) => {
            if (typeof value === 'object' && value.from !== undefined && value.to !== undefined) {
                return (_jsxs("div", { className: "text-xs text-gray-600 mt-1", children: [_jsxs("span", { className: "font-medium", children: [key, ":"] }), _jsx("span", { className: "mx-1", children: String(value.from) }), _jsx(ArrowUpRight, { className: "w-3 h-3 inline text-gray-400" }), _jsx("span", { className: "mx-1", children: String(value.to) })] }, key));
            }
            else if (typeof value === 'object' && value.added) {
                return (_jsxs("div", { className: "text-xs text-green-600 mt-1", children: [_jsx(Plus, { className: "w-3 h-3 inline mr-1" }), _jsx("span", { className: "font-medium", children: "\uCD94\uAC00:" }), _jsx("span", { className: "ml-1", children: JSON.stringify(value.added) })] }, key));
            }
            else if (typeof value === 'object' && value.removed) {
                return (_jsxs("div", { className: "text-xs text-red-600 mt-1", children: [_jsx(Minus, { className: "w-3 h-3 inline mr-1" }), _jsx("span", { className: "font-medium", children: "\uC0AD\uC81C:" }), _jsx("span", { className: "ml-1", children: JSON.stringify(value.removed) })] }, key));
            }
            return null;
        });
    };
    const exportHistory = () => {
        const csvContent = [
            ['시간', '카테고리', '액션', '사용자', '설명'].join(','),
            ...filteredItems.map(item => [
                new Date(item.timestamp).toLocaleString('ko-KR'),
                getCategoryName(item.category),
                getActionName(item.action),
                item.userName,
                item.description
            ].join(','))
        ].join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `policy-history-${new Date().toISOString().split('T')[0]}.csv`;
        link.click();
    };
    const uniqueUsers = [...new Set(historyItems.map(item => item.userName))];
    return (_jsxs("div", { className: "space-y-6", children: [_jsxs("div", { className: "flex items-center justify-between", children: [_jsxs("div", { children: [_jsxs("h3", { className: "text-lg font-semibold text-gray-900 flex items-center", children: [_jsx(History, { className: "w-5 h-5 mr-2 text-gray-600" }), "\uC815\uCC45 \uBCC0\uACBD \uD788\uC2A4\uD1A0\uB9AC"] }), _jsx("p", { className: "text-sm text-gray-600 mt-1", children: "\uBAA8\uB4E0 \uC815\uCC45 \uBCC0\uACBD \uC0AC\uD56D\uC774 \uAE30\uB85D\uB418\uACE0 \uCD94\uC801\uB429\uB2C8\uB2E4." })] }), _jsxs("div", { className: "flex items-center space-x-2", children: [_jsxs("button", { onClick: loadHistoryData, className: "wp-button-secondary", disabled: isLoading, children: [_jsx(RefreshCw, { className: `w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}` }), "\uC0C8\uB85C\uACE0\uCE68"] }), _jsxs("button", { onClick: exportHistory, className: "wp-button-secondary", children: [_jsx(Download, { className: "w-4 h-4 mr-2" }), "\uB0B4\uBCF4\uB0B4\uAE30"] })] })] }), _jsx("div", { className: "wp-card", children: _jsxs("div", { className: "wp-card-body", children: [_jsxs("div", { className: "grid grid-cols-1 md:grid-cols-6 gap-4", children: [_jsx("div", { className: "md:col-span-2", children: _jsxs("div", { className: "relative", children: [_jsx(Search, { className: "w-4 h-4 absolute left-3 top-3 text-gray-400" }), _jsx("input", { type: "text", placeholder: "\uAC80\uC0C9...", value: searchTerm, onChange: (e) => setSearchTerm(e.target.value), className: "wp-input pl-10" })] }) }), _jsx("div", { children: _jsxs("select", { value: selectedCategory, onChange: (e) => setSelectedCategory(e.target.value), className: "wp-input", children: [_jsx("option", { value: "all", children: "\uBAA8\uB4E0 \uCE74\uD14C\uACE0\uB9AC" }), _jsx("option", { value: "partners", children: "\uD30C\uD2B8\uB108\uC2A4" }), _jsx("option", { value: "sales", children: "\uB9E4\uCD9C \uBAA9\uD45C" }), _jsx("option", { value: "inventory", children: "\uC7AC\uACE0 \uAD00\uB9AC" }), _jsx("option", { value: "users", children: "\uC0AC\uC6A9\uC790 \uBCF4\uC548" })] }) }), _jsx("div", { children: _jsxs("select", { value: selectedAction, onChange: (e) => setSelectedAction(e.target.value), className: "wp-input", children: [_jsx("option", { value: "all", children: "\uBAA8\uB4E0 \uC561\uC158" }), _jsx("option", { value: "create", children: "\uC0DD\uC131" }), _jsx("option", { value: "update", children: "\uC218\uC815" }), _jsx("option", { value: "delete", children: "\uC0AD\uC81C" })] }) }), _jsx("div", { children: _jsxs("select", { value: dateRange, onChange: (e) => setDateRange(e.target.value), className: "wp-input", children: [_jsx("option", { value: "all", children: "\uC804\uCCB4 \uAE30\uAC04" }), _jsx("option", { value: "1d", children: "\uCD5C\uADFC 1\uC77C" }), _jsx("option", { value: "7d", children: "\uCD5C\uADFC 7\uC77C" }), _jsx("option", { value: "30d", children: "\uCD5C\uADFC 30\uC77C" }), _jsx("option", { value: "90d", children: "\uCD5C\uADFC 90\uC77C" })] }) }), _jsx("div", { children: _jsxs("select", { value: selectedUser, onChange: (e) => setSelectedUser(e.target.value), className: "wp-input", children: [_jsx("option", { value: "all", children: "\uBAA8\uB4E0 \uC0AC\uC6A9\uC790" }), uniqueUsers.map(user => (_jsx("option", { value: user, children: user }, user)))] }) })] }), _jsxs("div", { className: "mt-4 flex items-center justify-between text-sm text-gray-600", children: [_jsxs("div", { children: ["\uCD1D ", filteredItems.length, "\uAC1C\uC758 \uBCC0\uACBD \uC0AC\uD56D (\uC804\uCCB4 ", historyItems.length, "\uAC1C \uC911)"] }), (searchTerm || selectedCategory !== 'all' || selectedAction !== 'all' ||
                                    dateRange !== 'all' || selectedUser !== 'all') && (_jsx("button", { onClick: () => {
                                        setSearchTerm('');
                                        setSelectedCategory('all');
                                        setSelectedAction('all');
                                        setDateRange('all');
                                        setSelectedUser('all');
                                    }, className: "text-blue-600 hover:text-blue-800", children: "\uD544\uD130 \uCD08\uAE30\uD654" }))] })] }) }), _jsx("div", { className: "wp-card", children: _jsx("div", { className: "wp-card-body p-0", children: isLoading ? (_jsx("div", { className: "flex items-center justify-center py-12", children: _jsxs("div", { className: "text-center", children: [_jsx("div", { className: "animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4" }), _jsx("p", { className: "text-gray-600", children: "\uD788\uC2A4\uD1A0\uB9AC\uB97C \uBD88\uB7EC\uC624\uB294 \uC911..." })] }) })) : filteredItems.length === 0 ? (_jsxs("div", { className: "text-center py-12", children: [_jsx(History, { className: "w-12 h-12 text-gray-400 mx-auto mb-4" }), _jsx("p", { className: "text-gray-600", children: "\uD45C\uC2DC\uD560 \uD788\uC2A4\uD1A0\uB9AC\uAC00 \uC5C6\uC2B5\uB2C8\uB2E4." }), (searchTerm || selectedCategory !== 'all' || selectedAction !== 'all' ||
                                dateRange !== 'all' || selectedUser !== 'all') && (_jsx("p", { className: "text-sm text-gray-500 mt-2", children: "\uB2E4\uB978 \uD544\uD130 \uC870\uAC74\uC744 \uC2DC\uB3C4\uD574\uBCF4\uC138\uC694." }))] })) : (_jsx("div", { className: "divide-y divide-gray-200", children: filteredItems.map((item, _index) => (_jsx("div", { className: "p-6 hover:bg-gray-50 transition-colors", children: _jsxs("div", { className: "flex items-start justify-between", children: [_jsxs("div", { className: "flex-1", children: [_jsxs("div", { className: "flex items-center space-x-3 mb-2", children: [getCategoryIcon(item.category), _jsx("span", { className: "text-sm font-medium text-gray-900", children: getCategoryName(item.category) }), _jsxs("span", { className: `px-2 py-1 rounded text-xs font-medium ${getActionColor(item.action)}`, children: [getActionIcon(item.action), _jsx("span", { className: "ml-1", children: getActionName(item.action) })] })] }), _jsx("div", { className: "text-gray-900 mb-2", children: item.description }), renderChangeDetails(item.changes), _jsxs("div", { className: "flex items-center space-x-4 mt-3 text-sm text-gray-500", children: [_jsxs("div", { className: "flex items-center", children: [_jsx(User, { className: "w-4 h-4 mr-1" }), item.userName] }), _jsxs("div", { className: "flex items-center", children: [_jsx(Clock, { className: "w-4 h-4 mr-1" }), formatTimestamp(item.timestamp)] })] })] }), _jsxs("div", { className: "text-right", children: [_jsxs("div", { className: "text-xs text-gray-500", children: ["#", item.id] }), _jsx("button", { className: "text-xs text-blue-600 hover:text-blue-800 mt-1", children: "\uC790\uC138\uD788 \uBCF4\uAE30" })] })] }) }, item.id))) })) }) }), _jsxs("div", { className: "grid grid-cols-1 md:grid-cols-4 gap-4", children: [_jsx("div", { className: "wp-card", children: _jsxs("div", { className: "wp-card-body text-center", children: [_jsx("div", { className: "text-2xl font-bold text-blue-600", children: filteredItems.filter(item => item.action === 'update').length }), _jsx("div", { className: "text-sm text-blue-800", children: "\uC218\uC815" })] }) }), _jsx("div", { className: "wp-card", children: _jsxs("div", { className: "wp-card-body text-center", children: [_jsx("div", { className: "text-2xl font-bold text-green-600", children: filteredItems.filter(item => item.action === 'create').length }), _jsx("div", { className: "text-sm text-green-800", children: "\uC0DD\uC131" })] }) }), _jsx("div", { className: "wp-card", children: _jsxs("div", { className: "wp-card-body text-center", children: [_jsx("div", { className: "text-2xl font-bold text-red-600", children: filteredItems.filter(item => item.action === 'delete').length }), _jsx("div", { className: "text-sm text-red-800", children: "\uC0AD\uC81C" })] }) }), _jsx("div", { className: "wp-card", children: _jsxs("div", { className: "wp-card-body text-center", children: [_jsx("div", { className: "text-2xl font-bold text-gray-600", children: uniqueUsers.length }), _jsx("div", { className: "text-sm text-gray-800", children: "\uC0AC\uC6A9\uC790" })] }) })] })] }));
};
export default PolicyHistory;
//# sourceMappingURL=PolicyHistory.js.map
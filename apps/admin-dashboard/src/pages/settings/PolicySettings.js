import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useState, useEffect, useCallback } from 'react';
import { Settings, Users, Package, Shield, Target, AlertTriangle, CheckCircle, Save, RotateCcw, Info, Clock, Bell, Archive, Globe, Database, Zap } from 'lucide-react';
import PartnerPolicies from './components/PartnerPolicies';
import SalesTargetPolicies from './components/SalesTargetPolicies';
import InventoryPolicies from './components/InventoryPolicies';
import UserSecurityPolicies from './components/UserSecurityPolicies';
const PolicySettings = () => {
    const [activeTab, setActiveTab] = useState('partners');
    const [settings, setSettings] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [hasChanges, setHasChanges] = useState(false);
    const [lastSaved, setLastSaved] = useState(null);
    const policyCategories = [
        {
            id: 'partners',
            name: '파트너스 정책',
            description: '파트너 승인, 커미션 비율, 등급 시스템 관리',
            icon: _jsx(Users, { className: "w-5 h-5" }),
            color: 'blue',
            status: 'active',
            lastModified: '2024-12-29 14:30',
            modifiedBy: '관리자'
        },
        {
            id: 'sales',
            name: '매출 목표 설정',
            description: '월 매출 목표, 알림 임계값, 보너스 기준 설정',
            icon: _jsx(Target, { className: "w-5 h-5" }),
            color: 'green',
            status: 'active',
            lastModified: '2024-12-28 09:15',
            modifiedBy: '관리자'
        },
        {
            id: 'inventory',
            name: '재고 관리 정책',
            description: '재고 부족 임계값, 자동 주문, 품질 관리 설정',
            icon: _jsx(Package, { className: "w-5 h-5" }),
            color: 'orange',
            status: 'warning',
            lastModified: '2024-12-27 16:45',
            modifiedBy: '관리자'
        },
        {
            id: 'users',
            name: '사용자 보안 정책',
            description: '사용자 승인, 세션 관리, 비밀번호 정책 설정',
            icon: _jsx(Shield, { className: "w-5 h-5" }),
            color: 'red',
            status: 'active',
            lastModified: '2024-12-26 11:20',
            modifiedBy: '관리자'
        }
    ];
    useEffect(() => {
        loadPolicySettings();
    }, []);
    const loadPolicySettings = async () => {
        setIsLoading(true);
        try {
            await new Promise(resolve => setTimeout(resolve, 1000));
            const mockSettings = {
                partners: {
                    autoApproval: false,
                    commissionRate: 5.0,
                    tierLevels: [
                        { name: '브론즈', minSales: 0, commissionRate: 3.0 },
                        { name: '실버', minSales: 1000000, commissionRate: 5.0 },
                        { name: '골드', minSales: 5000000, commissionRate: 7.0 },
                        { name: '플래티넘', minSales: 10000000, commissionRate: 10.0 }
                    ]
                },
                sales: {
                    monthlyTarget: 50000000,
                    alertThreshold: 80,
                    bonusThreshold: 110
                },
                inventory: {
                    lowStockThreshold: 10,
                    criticalStockThreshold: 3,
                    autoReorder: false
                },
                users: {
                    requireApproval: true,
                    sessionTimeout: 8,
                    passwordPolicy: {
                        minLength: 8,
                        requireSpecialChars: true
                    }
                }
            };
            setSettings(mockSettings);
        }
        catch (error) {
            console.error('Failed to load policy settings:', error);
        }
        finally {
            setIsLoading(false);
        }
    };
    const handleSave = async () => {
        if (!settings || !hasChanges)
            return;
        setIsSaving(true);
        try {
            await new Promise(resolve => setTimeout(resolve, 1500));
            setHasChanges(false);
            setLastSaved(new Date());
        }
        catch (error) {
            console.error('Failed to save policy settings:', error);
        }
        finally {
            setIsSaving(false);
        }
    };
    const handleReset = () => {
        if (confirm('모든 변경사항을 취소하고 이전 설정으로 되돌리시겠습니까?')) {
            loadPolicySettings();
            setHasChanges(false);
        }
    };
    const updateSettings = useCallback((category, updates) => {
        if (!settings)
            return;
        setSettings(prev => ({
            ...prev,
            [category]: {
                ...prev[category],
                ...updates
            }
        }));
        setHasChanges(true);
    }, [settings]);
    const getTabColor = (categoryId) => {
        const category = policyCategories.find(c => c.id === categoryId);
        if (!category)
            return 'gray';
        const colors = {
            blue: 'border-blue-500 text-blue-600',
            green: 'border-green-500 text-green-600',
            orange: 'border-orange-500 text-orange-600',
            red: 'border-red-500 text-red-600'
        };
        return colors[category.color] || 'border-gray-500 text-gray-600';
    };
    const getStatusColor = (status) => {
        const colors = {
            active: 'bg-green-100 text-green-800',
            warning: 'bg-yellow-100 text-yellow-800',
            error: 'bg-red-100 text-red-800'
        };
        return colors[status];
    };
    const getStatusText = (status) => {
        const texts = {
            active: '정상',
            warning: '주의',
            error: '오류'
        };
        return texts[status];
    };
    if (isLoading) {
        return (_jsx("div", { className: "flex items-center justify-center min-h-screen", children: _jsxs("div", { className: "text-center", children: [_jsx("div", { className: "animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4" }), _jsx("p", { className: "text-gray-600", children: "\uC815\uCC45 \uC124\uC815\uC744 \uBD88\uB7EC\uC624\uB294 \uC911..." })] }) }));
    }
    return (_jsxs("div", { className: "space-y-6", children: [_jsx("div", { className: "bg-white border-b border-gray-200 -mx-6 -mt-6 px-6 py-4", children: _jsxs("div", { className: "flex items-center justify-between", children: [_jsxs("div", { children: [_jsxs("h1", { className: "text-2xl font-bold text-gray-900 flex items-center", children: [_jsx(Settings, { className: "w-6 h-6 mr-3 text-blue-600" }), "\uC815\uCC45 \uC124\uC815 \uC2DC\uC2A4\uD15C"] }), _jsx("p", { className: "text-gray-600 mt-1", children: "O4O \uD50C\uB7AB\uD3FC\uC758 \uBAA8\uB4E0 \uC815\uCC45\uC744 \uC911\uC559\uC5D0\uC11C \uAD00\uB9AC\uD558\uACE0 \uC81C\uC5B4\uD558\uC138\uC694" })] }), _jsxs("div", { className: "flex items-center space-x-3", children: [lastSaved && (_jsxs("div", { className: "flex items-center text-sm text-gray-500", children: [_jsx(Clock, { className: "w-4 h-4 mr-1" }), "\uB9C8\uC9C0\uB9C9 \uC800\uC7A5: ", lastSaved.toLocaleTimeString('ko-KR')] })), hasChanges && (_jsxs("button", { onClick: handleReset, className: "wp-button-secondary", disabled: isSaving, children: [_jsx(RotateCcw, { className: "w-4 h-4 mr-2" }), "\uB418\uB3CC\uB9AC\uAE30"] })), _jsx("button", { onClick: handleSave, className: `wp-button-primary ${!hasChanges ? 'opacity-50 cursor-not-allowed' : ''}`, disabled: !hasChanges || isSaving, children: isSaving ? (_jsxs(_Fragment, { children: [_jsx("div", { className: "animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" }), "\uC800\uC7A5 \uC911..."] })) : (_jsxs(_Fragment, { children: [_jsx(Save, { className: "w-4 h-4 mr-2" }), "\uBCC0\uACBD\uC0AC\uD56D \uC800\uC7A5"] })) })] })] }) }), _jsx("div", { className: "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8", children: policyCategories.map((category) => (_jsx("div", { className: `wp-card cursor-pointer transition-all duration-200 hover:shadow-lg ${activeTab === category.id
                        ? `border-2 ${getTabColor(category.id).split(' ')[0]} bg-blue-50`
                        : 'border-gray-200 hover:border-gray-300'}`, onClick: () => setActiveTab(category.id), children: _jsxs("div", { className: "wp-card-body", children: [_jsxs("div", { className: "flex items-start justify-between mb-3", children: [_jsx("div", { className: `p-2 rounded-lg ${category.color === 'blue' ? 'bg-blue-100' :
                                            category.color === 'green' ? 'bg-green-100' :
                                                category.color === 'orange' ? 'bg-orange-100' :
                                                    'bg-red-100'}`, children: category.icon }), _jsx("span", { className: `px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(category.status)}`, children: getStatusText(category.status) })] }), _jsx("h3", { className: "font-semibold text-gray-900 mb-2", children: category.name }), _jsx("p", { className: "text-sm text-gray-600 mb-3", children: category.description }), _jsxs("div", { className: "text-xs text-gray-500", children: [_jsxs("div", { children: ["\uCD5C\uC885 \uC218\uC815: ", category.lastModified] }), _jsxs("div", { children: ["\uC218\uC815\uC790: ", category.modifiedBy] })] })] }) }, category.id))) }), _jsxs("div", { className: "grid grid-cols-1 lg:grid-cols-4 gap-8", children: [_jsx("div", { className: "lg:col-span-3", children: _jsx("div", { className: "wp-card", children: _jsxs("div", { className: "wp-card-body", children: [activeTab === 'partners' && settings && (_jsx(PartnerPolicies, { settings: settings.partners, onUpdate: (updates) => updateSettings('partners', updates) })), activeTab === 'sales' && settings && (_jsx(SalesTargetPolicies, { settings: settings.sales, onUpdate: (updates) => updateSettings('sales', updates) })), activeTab === 'inventory' && settings && (_jsx(InventoryPolicies, { settings: settings.inventory, onUpdate: (updates) => updateSettings('inventory', updates) })), activeTab === 'users' && settings && (_jsx(UserSecurityPolicies, { settings: settings.users, onUpdate: (updates) => updateSettings('users', updates) }))] }) }) }), _jsxs("div", { className: "lg:col-span-1 space-y-6", children: [_jsxs("div", { className: "wp-card", children: [_jsx("div", { className: "wp-card-header", children: _jsxs("h3", { className: "text-lg font-semibold flex items-center", children: [_jsx(Info, { className: "w-5 h-5 mr-2 text-blue-600" }), "\uC815\uCC45 \uC815\uBCF4"] }) }), _jsx("div", { className: "wp-card-body", children: (() => {
                                            const currentCategory = policyCategories.find(c => c.id === activeTab);
                                            if (!currentCategory)
                                                return null;
                                            return (_jsxs("div", { className: "space-y-4", children: [_jsxs("div", { children: [_jsx("div", { className: "text-sm font-medium text-gray-700 mb-1", children: "\uC815\uCC45 \uBD84\uB958" }), _jsxs("div", { className: "flex items-center", children: [currentCategory.icon, _jsx("span", { className: "ml-2 text-gray-900", children: currentCategory.name })] })] }), _jsxs("div", { children: [_jsx("div", { className: "text-sm font-medium text-gray-700 mb-1", children: "\uD604\uC7AC \uC0C1\uD0DC" }), _jsx("span", { className: `px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(currentCategory.status)}`, children: getStatusText(currentCategory.status) })] }), _jsxs("div", { children: [_jsx("div", { className: "text-sm font-medium text-gray-700 mb-1", children: "\uCD5C\uC885 \uC218\uC815" }), _jsx("div", { className: "text-sm text-gray-600", children: currentCategory.lastModified })] }), _jsxs("div", { children: [_jsx("div", { className: "text-sm font-medium text-gray-700 mb-1", children: "\uC218\uC815\uC790" }), _jsx("div", { className: "text-sm text-gray-600", children: currentCategory.modifiedBy })] })] }));
                                        })() })] }), _jsxs("div", { className: "wp-card", children: [_jsx("div", { className: "wp-card-header", children: _jsxs("h3", { className: "text-lg font-semibold flex items-center", children: [_jsx(Zap, { className: "w-5 h-5 mr-2 text-yellow-600" }), "\uBE60\uB978 \uC791\uC5C5"] }) }), _jsx("div", { className: "wp-card-body", children: _jsxs("div", { className: "space-y-3", children: [_jsxs("button", { className: "w-full wp-button-secondary text-left justify-start", children: [_jsx(Archive, { className: "w-4 h-4 mr-2" }), "\uC815\uCC45 \uBC31\uC5C5 \uC0DD\uC131"] }), _jsxs("button", { className: "w-full wp-button-secondary text-left justify-start", children: [_jsx(Database, { className: "w-4 h-4 mr-2" }), "\uC124\uC815 \uB0B4\uBCF4\uB0B4\uAE30"] }), _jsxs("button", { className: "w-full wp-button-secondary text-left justify-start", children: [_jsx(Globe, { className: "w-4 h-4 mr-2" }), "\uAE30\uBCF8\uAC12\uC73C\uB85C \uBCF5\uC6D0"] })] }) })] }), _jsxs("div", { className: "wp-card", children: [_jsx("div", { className: "wp-card-header", children: _jsxs("h3", { className: "text-lg font-semibold flex items-center", children: [_jsx(Bell, { className: "w-5 h-5 mr-2 text-orange-600" }), "\uC2DC\uC2A4\uD15C \uC54C\uB9BC"] }) }), _jsx("div", { className: "wp-card-body", children: _jsxs("div", { className: "space-y-3", children: [_jsxs("div", { className: "flex items-start p-3 bg-yellow-50 border border-yellow-200 rounded-lg", children: [_jsx(AlertTriangle, { className: "w-4 h-4 text-yellow-600 mt-0.5 mr-2 flex-shrink-0" }), _jsxs("div", { className: "text-sm", children: [_jsx("div", { className: "font-medium text-yellow-800", children: "\uC7AC\uACE0 \uC815\uCC45 \uAC80\uD1A0 \uD544\uC694" }), _jsx("div", { className: "text-yellow-700", children: "\uC77C\uBD80 \uC784\uACC4\uAC12\uC774 \uAD8C\uC7A5 \uC218\uC900\uC744 \uBC97\uC5B4\uB0AC\uC2B5\uB2C8\uB2E4." })] })] }), _jsxs("div", { className: "flex items-start p-3 bg-blue-50 border border-blue-200 rounded-lg", children: [_jsx(Info, { className: "w-4 h-4 text-blue-600 mt-0.5 mr-2 flex-shrink-0" }), _jsxs("div", { className: "text-sm", children: [_jsx("div", { className: "font-medium text-blue-800", children: "\uC0C8\uB85C\uC6B4 \uAE30\uB2A5 \uC0AC\uC6A9 \uAC00\uB2A5" }), _jsx("div", { className: "text-blue-700", children: "\uC790\uB3D9 \uC2B9\uC778 \uC2DC\uC2A4\uD15C\uC774 \uC5C5\uB370\uC774\uD2B8\uB418\uC5C8\uC2B5\uB2C8\uB2E4." })] })] }), _jsxs("div", { className: "flex items-start p-3 bg-green-50 border border-green-200 rounded-lg", children: [_jsx(CheckCircle, { className: "w-4 h-4 text-green-600 mt-0.5 mr-2 flex-shrink-0" }), _jsxs("div", { className: "text-sm", children: [_jsx("div", { className: "font-medium text-green-800", children: "\uC815\uCC45 \uB3D9\uAE30\uD654 \uC644\uB8CC" }), _jsx("div", { className: "text-green-700", children: "\uBAA8\uB4E0 \uC124\uC815\uC774 \uC131\uACF5\uC801\uC73C\uB85C \uC801\uC6A9\uB418\uC5C8\uC2B5\uB2C8\uB2E4." })] })] })] }) })] })] })] }), hasChanges && (_jsx("div", { className: "fixed bottom-6 right-6 bg-orange-100 border border-orange-300 rounded-lg p-4 shadow-lg", children: _jsxs("div", { className: "flex items-center", children: [_jsx(AlertTriangle, { className: "w-5 h-5 text-orange-600 mr-2" }), _jsx("span", { className: "text-orange-800 font-medium", children: "\uC800\uC7A5\uB418\uC9C0 \uC54A\uC740 \uBCC0\uACBD\uC0AC\uD56D\uC774 \uC788\uC2B5\uB2C8\uB2E4" })] }) }))] }));
};
export default PolicySettings;
//# sourceMappingURL=PolicySettings.js.map
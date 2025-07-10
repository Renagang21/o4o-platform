import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import ActionButton from './ActionButton';
import { Plus, FileText, UserCheck, Package, Percent, BarChart3, Users2, Settings } from 'lucide-react';
const QuickActions = () => {
    const actions = [
        {
            id: 'new-product',
            title: '새 상품 추가',
            description: '새로운 상품을 등록합니다',
            icon: _jsx(Plus, { className: "w-5 h-5" }),
            color: 'blue',
            href: '/products/new',
            badge: null
        },
        {
            id: 'new-page',
            title: '새 페이지 생성',
            description: '새로운 콘텐츠 페이지를 만듭니다',
            icon: _jsx(FileText, { className: "w-5 h-5" }),
            color: 'green',
            href: '/pages/new',
            badge: null
        },
        {
            id: 'user-approval',
            title: '사용자 승인',
            description: '대기 중인 사용자를 승인합니다',
            icon: _jsx(UserCheck, { className: "w-5 h-5" }),
            color: 'orange',
            href: '/users/pending',
            badge: 3
        },
        {
            id: 'order-management',
            title: '주문 처리',
            description: '주문 상태를 업데이트합니다',
            icon: _jsx(Package, { className: "w-5 h-5" }),
            color: 'purple',
            href: '/orders',
            badge: 12
        },
        {
            id: 'coupon-create',
            title: '쿠폰 생성',
            description: '새로운 할인 쿠폰을 만듭니다',
            icon: _jsx(Percent, { className: "w-5 h-5" }),
            color: 'pink',
            href: '/coupons/new',
            badge: null
        },
        {
            id: 'detailed-report',
            title: '상세 리포트',
            description: '전체 분석 리포트를 확인합니다',
            icon: _jsx(BarChart3, { className: "w-5 h-5" }),
            color: 'indigo',
            href: '/analytics',
            badge: null
        },
        {
            id: 'partner-approval',
            title: '파트너 승인',
            description: '파트너 신청을 검토합니다',
            icon: _jsx(Users2, { className: "w-5 h-5" }),
            color: 'gray',
            href: '/partners/pending',
            badge: null,
            disabled: true,
            tooltip: '파트너스 시스템 준비 중입니다'
        },
        {
            id: 'policy-settings',
            title: '정책 설정',
            description: '관리자 정책을 설정합니다',
            icon: _jsx(Settings, { className: "w-5 h-5" }),
            color: 'yellow',
            href: '/settings/policies',
            badge: null,
            highlight: true
        }
    ];
    return (_jsxs("div", { className: "wp-card", children: [_jsxs("div", { className: "wp-card-header", children: [_jsx("h3", { className: "wp-card-title", children: "\uBE60\uB978 \uC791\uC5C5" }), _jsx("p", { className: "text-sm text-gray-600 mt-1", children: "\uC790\uC8FC \uC0AC\uC6A9\uD558\uB294 \uAE30\uB2A5\uC5D0 \uBE60\uB974\uAC8C \uC811\uADFC\uD558\uC138\uC694" })] }), _jsxs("div", { className: "wp-card-body", children: [_jsx("div", { className: "grid grid-cols-1 gap-3", children: actions.map((action) => (_jsx(ActionButton, { ...action }, action.id))) }), _jsx("div", { className: "mt-6 pt-4 border-t border-gray-200", children: _jsxs("div", { className: "grid grid-cols-2 gap-4 text-center", children: [_jsxs("div", { children: [_jsx("p", { className: "text-xs text-gray-500", children: "\uB300\uAE30 \uC911\uC778 \uC791\uC5C5" }), _jsx("p", { className: "text-lg font-bold text-orange-600", children: "15\uAC1C" })] }), _jsxs("div", { children: [_jsx("p", { className: "text-xs text-gray-500", children: "\uC624\uB298 \uC644\uB8CC" }), _jsx("p", { className: "text-lg font-bold text-green-600", children: "8\uAC1C" })] })] }) }), _jsx("div", { className: "mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg", children: _jsxs("p", { className: "text-xs text-blue-700", children: ["\uD83D\uDCA1 ", _jsx("strong", { children: "Tip:" }), " \uD0A4\uBCF4\uB4DC \uB2E8\uCD95\uD0A4\uB85C \uB354 \uBE60\uB974\uAC8C \uC811\uADFC\uD560 \uC218 \uC788\uC2B5\uB2C8\uB2E4. Ctrl+Shift+N\uC73C\uB85C \uC0C8 \uC0C1\uD488 \uCD94\uAC00"] }) })] })] }));
};
export default QuickActions;
//# sourceMappingURL=index.js.map
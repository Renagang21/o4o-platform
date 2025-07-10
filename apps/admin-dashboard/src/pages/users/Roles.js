import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Shield, Users, Building, Star, Settings } from 'lucide-react';
import { ROLE_LABELS } from '@/types/user';
const Roles = () => {
    const roleDescriptions = {
        admin: {
            description: '시스템의 모든 기능에 접근할 수 있는 최고 권한자',
            permissions: [
                '모든 사용자 관리 (승인, 거부, 정지)',
                '상품 관리 및 카테고리 설정',
                '주문 관리 및 결제 처리',
                '콘텐츠 관리 (게시글, 페이지, 미디어)',
                '시스템 설정 및 통계 조회',
                '다른 관리자 계정 생성'
            ],
            color: 'red',
            icon: _jsx(Shield, { className: "w-6 h-6" })
        },
        business: {
            description: '도매가로 구매할 수 있는 사업자 회원',
            permissions: [
                '도매가격으로 상품 구매',
                '대량 주문 및 할인 혜택',
                '사업자 전용 상품 접근',
                '세금계산서 발행 요청',
                '전용 고객지원 서비스',
                '비즈니스 대시보드 이용'
            ],
            color: 'blue',
            icon: _jsx(Building, { className: "w-6 h-6" })
        },
        affiliate: {
            description: '상품을 추천하고 수수료를 받는 파트너 회원',
            permissions: [
                '제품 추천 링크 생성',
                '수수료 수익 확인',
                '추천 성과 분석',
                '마케팅 자료 다운로드',
                '파트너 전용 교육 자료',
                '월별 정산 및 출금'
            ],
            color: 'purple',
            icon: _jsx(Star, { className: "w-6 h-6" })
        },
        customer: {
            description: '일반 소비자 가격으로 구매하는 기본 회원',
            permissions: [
                '일반 가격으로 상품 구매',
                '장바구니 및 위시리스트',
                '주문 내역 확인',
                '상품 리뷰 작성',
                '고객 지원 센터 이용',
                '포인트 적립 및 사용'
            ],
            color: 'green',
            icon: _jsx(Users, { className: "w-6 h-6" })
        }
    };
    const getColorClasses = (color) => {
        const colors = {
            red: 'bg-red-50 border-red-200 text-red-800',
            blue: 'bg-blue-50 border-blue-200 text-blue-800',
            purple: 'bg-purple-50 border-purple-200 text-purple-800',
            green: 'bg-green-50 border-green-200 text-green-800'
        };
        return colors[color] || colors.green;
    };
    const getIconColorClasses = (color) => {
        const colors = {
            red: 'text-red-600',
            blue: 'text-blue-600',
            purple: 'text-purple-600',
            green: 'text-green-600'
        };
        return colors[color] || colors.green;
    };
    return (_jsxs("div", { className: "space-y-6", children: [_jsxs("div", { children: [_jsx("h1", { className: "text-2xl font-bold text-gray-900", children: "\uC5ED\uD560 \uBC0F \uAD8C\uD55C \uAD00\uB9AC" }), _jsx("p", { className: "text-gray-600 mt-1", children: "\uC2DC\uC2A4\uD15C\uC758 \uC0AC\uC6A9\uC790 \uC5ED\uD560\uACFC \uAD8C\uD55C\uC744 \uAD00\uB9AC\uD569\uB2C8\uB2E4" })] }), _jsxs("div", { className: "wp-card", children: [_jsx("div", { className: "wp-card-header", children: _jsxs("h3", { className: "wp-card-title", children: [_jsx(Settings, { className: "w-5 h-5 mr-2" }), "\uC5ED\uD560 \uC2DC\uC2A4\uD15C \uAC1C\uC694"] }) }), _jsx("div", { className: "wp-card-body", children: _jsxs("div", { className: "bg-blue-50 border border-blue-200 rounded-lg p-4", children: [_jsx("h4", { className: "font-medium text-blue-900 mb-2", children: "O4O \uD50C\uB7AB\uD3FC \uC5ED\uD560 \uCCB4\uACC4" }), _jsx("p", { className: "text-sm text-blue-800", children: "O4O \uD50C\uB7AB\uD3FC\uC740 \uC0AC\uC6A9\uC790\uC758 \uBAA9\uC801\uACFC \uD544\uC694\uC5D0 \uB530\uB77C 4\uAC00\uC9C0 \uC8FC\uC694 \uC5ED\uD560\uB85C \uAD6C\uBD84\uB429\uB2C8\uB2E4. \uAC01 \uC5ED\uD560\uC740 \uACE0\uC720\uD55C \uAD8C\uD55C\uACFC \uD61C\uD0DD\uC744 \uC81C\uACF5\uD558\uC5EC \uCD5C\uC801\uD654\uB41C \uC0AC\uC6A9\uC790 \uACBD\uD5D8\uC744 \uC81C\uACF5\uD569\uB2C8\uB2E4." })] }) })] }), _jsx("div", { className: "grid grid-cols-1 lg:grid-cols-2 gap-6", children: Object.entries(roleDescriptions).map(([roleKey, roleInfo]) => (_jsxs("div", { className: `wp-card border-l-4 ${getColorClasses(roleInfo.color)}`, children: [_jsx("div", { className: "wp-card-header", children: _jsxs("div", { className: "flex items-center gap-3", children: [_jsx("div", { className: getIconColorClasses(roleInfo.color), children: roleInfo.icon }), _jsxs("div", { children: [_jsx("h3", { className: "wp-card-title text-lg", children: ROLE_LABELS[roleKey] }), _jsx("p", { className: "text-sm text-gray-600 mt-1", children: roleInfo.description })] })] }) }), _jsxs("div", { className: "wp-card-body", children: [_jsx("h4", { className: "font-medium text-gray-900 mb-3", children: "\uC8FC\uC694 \uAD8C\uD55C" }), _jsx("ul", { className: "space-y-2", children: roleInfo.permissions.map((permission, index) => (_jsxs("li", { className: "flex items-start gap-2 text-sm text-gray-700", children: [_jsx("span", { className: `w-1.5 h-1.5 rounded-full mt-2 flex-shrink-0 ${getIconColorClasses(roleInfo.color).replace('text-', 'bg-')}` }), permission] }, index))) })] })] }, roleKey))) }), _jsxs("div", { className: "wp-card", children: [_jsx("div", { className: "wp-card-header", children: _jsx("h3", { className: "wp-card-title", children: "\uC5ED\uD560 \uBCC0\uACBD \uC815\uCC45" }) }), _jsxs("div", { className: "wp-card-body space-y-4", children: [_jsxs("div", { className: "grid grid-cols-1 md:grid-cols-2 gap-4", children: [_jsxs("div", { className: "p-4 bg-green-50 rounded-lg border border-green-200", children: [_jsx("h4", { className: "font-medium text-green-900 mb-2", children: "\u2705 \uD5C8\uC6A9\uB418\uB294 \uBCC0\uACBD" }), _jsxs("ul", { className: "text-sm text-green-800 space-y-1", children: [_jsx("li", { children: "\u2022 \uC77C\uBC18\uD68C\uC6D0 \u2192 \uC0AC\uC5C5\uC790\uD68C\uC6D0 (\uC0AC\uC5C5\uC790 \uC815\uBCF4 \uD655\uC778 \uD6C4)" }), _jsx("li", { children: "\u2022 \uC77C\uBC18\uD68C\uC6D0 \u2192 \uD30C\uD2B8\uB108\uD68C\uC6D0 (\uC2E0\uCCAD \uC2B9\uC778 \uD6C4)" }), _jsx("li", { children: "\u2022 \uC0AC\uC5C5\uC790\uD68C\uC6D0 \u2192 \uD30C\uD2B8\uB108\uD68C\uC6D0 (\uACB8\uC5C5 \uAC00\uB2A5)" }), _jsx("li", { children: "\u2022 \uBAA8\uB4E0 \uC5ED\uD560 \u2192 \uC77C\uBC18\uD68C\uC6D0 (\uAD8C\uD55C \uCD95\uC18C)" })] })] }), _jsxs("div", { className: "p-4 bg-red-50 rounded-lg border border-red-200", children: [_jsx("h4", { className: "font-medium text-red-900 mb-2", children: "\u274C \uC81C\uD55C\uB418\uB294 \uBCC0\uACBD" }), _jsxs("ul", { className: "text-sm text-red-800 space-y-1", children: [_jsx("li", { children: "\u2022 \uC77C\uBC18\uD68C\uC6D0 \u2192 \uAD00\uB9AC\uC790 (\uBCC4\uB3C4 \uC2B9\uC778 \uD544\uC694)" }), _jsx("li", { children: "\u2022 \uC815\uC9C0\uB41C \uC0AC\uC6A9\uC790\uC758 \uC5ED\uD560 \uBCC0\uACBD" }), _jsx("li", { children: "\u2022 \uBCF8\uC778\uC758 \uAD00\uB9AC\uC790 \uAD8C\uD55C \uD574\uC81C" }), _jsx("li", { children: "\u2022 \uC2B9\uC778\uB418\uC9C0 \uC54A\uC740 \uC0AC\uC5C5\uC790 \uC815\uBCF4\uB85C \uC5ED\uD560 \uBCC0\uACBD" })] })] })] }), _jsxs("div", { className: "p-4 bg-yellow-50 rounded-lg border border-yellow-200", children: [_jsx("h4", { className: "font-medium text-yellow-900 mb-2", children: "\u26A0\uFE0F \uC8FC\uC758\uC0AC\uD56D" }), _jsxs("ul", { className: "text-sm text-yellow-800 space-y-1", children: [_jsx("li", { children: "\u2022 \uC5ED\uD560 \uBCC0\uACBD \uC2DC \uAE30\uC874 \uAD8C\uD55C\uC774 \uC989\uC2DC \uC801\uC6A9\uB429\uB2C8\uB2E4" }), _jsx("li", { children: "\u2022 \uC0AC\uC5C5\uC790\uD68C\uC6D0\uC73C\uB85C \uBCC0\uACBD \uC2DC \uC0AC\uC5C5\uC790\uB4F1\uB85D\uBC88\uD638 \uD655\uC778\uC774 \uD544\uC694\uD569\uB2C8\uB2E4" }), _jsx("li", { children: "\u2022 \uD30C\uD2B8\uB108\uD68C\uC6D0\uC740 \uBCC4\uB3C4\uC758 \uC218\uC218\uB8CC \uC815\uCC45\uC774 \uC801\uC6A9\uB429\uB2C8\uB2E4" }), _jsx("li", { children: "\u2022 \uC5ED\uD560 \uBCC0\uACBD \uB0B4\uC5ED\uC740 \uBAA8\uB450 \uB85C\uADF8\uB85C \uAE30\uB85D\uB429\uB2C8\uB2E4" })] })] })] })] }), _jsxs("div", { className: "wp-card", children: [_jsx("div", { className: "wp-card-header", children: _jsx("h3", { className: "wp-card-title", children: "\uC5ED\uD560\uBCC4 \uC0AC\uC6A9\uC790 \uD1B5\uACC4" }) }), _jsxs("div", { className: "wp-card-body", children: [_jsx("div", { className: "grid grid-cols-2 md:grid-cols-4 gap-4", children: Object.entries(ROLE_LABELS).map(([roleKey, roleLabel]) => {
                                    const roleInfo = roleDescriptions[roleKey];
                                    return (_jsxs("div", { className: "text-center p-4 bg-gray-50 rounded-lg", children: [_jsx("div", { className: `mx-auto mb-2 ${getIconColorClasses(roleInfo.color)}`, children: roleInfo.icon }), _jsx("div", { className: "text-2xl font-bold text-gray-900", children: "-" }), _jsx("div", { className: "text-sm text-gray-600", children: roleLabel })] }, roleKey));
                                }) }), _jsx("p", { className: "text-sm text-gray-500 text-center mt-4", children: "* \uC2E4\uC2DC\uAC04 \uD1B5\uACC4\uB294 \uAC1C\uBC1C \uC911\uC785\uB2C8\uB2E4" })] })] })] }));
};
export default Roles;
//# sourceMappingURL=Roles.js.map
import { jsx as _jsx, Fragment as _Fragment, jsxs as _jsxs } from "react/jsx-runtime";
import { Clock } from 'lucide-react';
const ActivityItem = ({ activity, typeColor }) => {
    const { type, message, time, user, icon } = activity;
    const getTypeBgColor = (type) => {
        const colors = {
            user: 'bg-blue-50',
            order: 'bg-green-50',
            product: 'bg-purple-50',
            content: 'bg-orange-50'
        };
        return colors[type] || 'bg-gray-50';
    };
    const formatTime = (timeString) => {
        return timeString;
    };
    return (_jsxs("div", { className: "flex items-start space-x-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors duration-150", children: [_jsx("div", { className: `
        w-8 h-8 rounded-full flex items-center justify-center text-sm flex-shrink-0
        ${getTypeBgColor(type)}
      `, children: _jsx("span", { role: "img", "aria-label": type, children: icon }) }), _jsx("div", { className: "flex-1 min-w-0", children: _jsxs("div", { className: "flex items-start justify-between", children: [_jsxs("div", { className: "flex-1", children: [_jsx("p", { className: "text-sm text-gray-900 leading-relaxed", children: message }), _jsxs("div", { className: "flex items-center mt-1 text-xs text-gray-500", children: [user && (_jsxs(_Fragment, { children: [_jsx("span", { className: "font-medium text-gray-600", children: user }), _jsx("span", { className: "mx-1", children: "\u2022" })] })), _jsxs("div", { className: "flex items-center", children: [_jsx(Clock, { className: "w-3 h-3 mr-1" }), _jsx("time", { dateTime: time, children: formatTime(time) })] })] })] }), _jsxs("span", { className: `
            ml-2 px-2 py-1 text-xs rounded-full font-medium flex-shrink-0
            ${typeColor} ${getTypeBgColor(type)}
          `, children: [type === 'user' && '사용자', type === 'order' && '주문', type === 'product' && '상품', type === 'content' && '콘텐츠'] })] }) })] }));
};
export default ActivityItem;
//# sourceMappingURL=ActivityItem.js.map
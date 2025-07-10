import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { AlertTriangle, Clock, CheckCircle, Info, ExternalLink, X, Eye } from 'lucide-react';
const NotificationItem = ({ notification, onMarkRead, onDismiss, onAction }) => {
    const { id, type, title, message, time, read, actionUrl } = notification;
    const typeConfig = {
        urgent: {
            icon: _jsx(AlertTriangle, { className: "w-4 h-4" }),
            iconColor: 'text-red-600',
            bgColor: 'bg-red-50',
            borderColor: 'border-red-200',
            titleColor: 'text-red-900',
            badge: '긴급'
        },
        approval: {
            icon: _jsx(Clock, { className: "w-4 h-4" }),
            iconColor: 'text-orange-600',
            bgColor: 'bg-orange-50',
            borderColor: 'border-orange-200',
            titleColor: 'text-orange-900',
            badge: '승인'
        },
        success: {
            icon: _jsx(CheckCircle, { className: "w-4 h-4" }),
            iconColor: 'text-green-600',
            bgColor: 'bg-green-50',
            borderColor: 'border-green-200',
            titleColor: 'text-green-900',
            badge: '성과'
        },
        info: {
            icon: _jsx(Info, { className: "w-4 h-4" }),
            iconColor: 'text-blue-600',
            bgColor: 'bg-blue-50',
            borderColor: 'border-blue-200',
            titleColor: 'text-blue-900',
            badge: '정보'
        }
    };
    const config = typeConfig[type];
    const handleMarkRead = () => {
        if (!read && onMarkRead) {
            onMarkRead(id);
        }
    };
    const handleDismiss = () => {
        if (onDismiss) {
            onDismiss(id);
        }
    };
    const handleAction = () => {
        if (actionUrl && onAction) {
            onAction(actionUrl);
        }
        handleMarkRead();
    };
    return (_jsxs("div", { className: `
        relative p-4 rounded-lg border transition-all duration-200 cursor-pointer
        ${read
            ? 'bg-gray-50 border-gray-200 opacity-75'
            : `${config.bgColor} ${config.borderColor} shadow-sm hover:shadow-md`}
      `, onClick: handleMarkRead, children: [!read && (_jsx("div", { className: "absolute top-2 right-2 w-2 h-2 bg-blue-500 rounded-full" })), _jsxs("div", { className: "flex items-start", children: [_jsx("div", { className: `
          w-8 h-8 rounded-lg flex items-center justify-center mr-3 flex-shrink-0
          ${read ? 'bg-gray-200' : config.bgColor}
        `, children: _jsx("div", { className: read ? 'text-gray-500' : config.iconColor, children: config.icon }) }), _jsxs("div", { className: "flex-1 min-w-0", children: [_jsxs("div", { className: "flex items-center justify-between mb-1", children: [_jsxs("div", { className: "flex items-center", children: [_jsx("h4", { className: `text-sm font-medium truncate ${read ? 'text-gray-600' : config.titleColor}`, children: title }), _jsx("span", { className: `
                ml-2 px-2 py-1 text-xs rounded-full
                ${read
                                                    ? 'bg-gray-200 text-gray-600'
                                                    : `${config.bgColor} ${config.iconColor}`}
              `, children: config.badge })] }), _jsxs("div", { className: "flex items-center space-x-1 ml-2", children: [_jsx("span", { className: "text-xs text-gray-500 whitespace-nowrap", children: time }), _jsxs("div", { className: "flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity", children: [!read && (_jsx("button", { onClick: (e) => {
                                                            e.stopPropagation();
                                                            handleMarkRead();
                                                        }, className: "p-1 text-gray-400 hover:text-blue-600 transition-colors", title: "\uC77D\uC74C \uCC98\uB9AC", children: _jsx(Eye, { className: "w-3 h-3" }) })), _jsx("button", { onClick: (e) => {
                                                            e.stopPropagation();
                                                            handleDismiss();
                                                        }, className: "p-1 text-gray-400 hover:text-red-600 transition-colors", title: "\uC0AD\uC81C", children: _jsx(X, { className: "w-3 h-3" }) })] })] })] }), _jsx("p", { className: `text-sm leading-relaxed ${read ? 'text-gray-500' : 'text-gray-700'}`, children: message }), actionUrl && (_jsxs("button", { onClick: (e) => {
                                    e.stopPropagation();
                                    handleAction();
                                }, className: `
                mt-2 inline-flex items-center text-xs font-medium transition-colors
                ${read
                                    ? 'text-gray-400 hover:text-gray-600'
                                    : `${config.iconColor} hover:underline`}
              `, children: [_jsx("span", { children: "\uBC14\uB85C \uAC00\uAE30" }), _jsx(ExternalLink, { className: "w-3 h-3 ml-1" })] }))] })] }), type === 'urgent' && !read && (_jsx("div", { className: "absolute left-0 top-0 bottom-0 w-1 bg-red-500 rounded-l-lg" }))] }));
};
export default NotificationItem;
//# sourceMappingURL=NotificationItem.js.map
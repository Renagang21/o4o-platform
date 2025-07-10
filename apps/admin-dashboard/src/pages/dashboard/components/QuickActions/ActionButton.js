import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { ExternalLink, Clock } from 'lucide-react';
const ActionButton = ({ id: _id, title, description, icon, color, href, badge, disabled = false, highlight = false, tooltip }) => {
    const colorClasses = {
        blue: {
            bg: 'bg-blue-50',
            text: 'text-blue-700',
            border: 'border-blue-200',
            hover: 'hover:bg-blue-100',
            icon: 'text-blue-600'
        },
        green: {
            bg: 'bg-green-50',
            text: 'text-green-700',
            border: 'border-green-200',
            hover: 'hover:bg-green-100',
            icon: 'text-green-600'
        },
        orange: {
            bg: 'bg-orange-50',
            text: 'text-orange-700',
            border: 'border-orange-200',
            hover: 'hover:bg-orange-100',
            icon: 'text-orange-600'
        },
        purple: {
            bg: 'bg-purple-50',
            text: 'text-purple-700',
            border: 'border-purple-200',
            hover: 'hover:bg-purple-100',
            icon: 'text-purple-600'
        },
        pink: {
            bg: 'bg-pink-50',
            text: 'text-pink-700',
            border: 'border-pink-200',
            hover: 'hover:bg-pink-100',
            icon: 'text-pink-600'
        },
        indigo: {
            bg: 'bg-indigo-50',
            text: 'text-indigo-700',
            border: 'border-indigo-200',
            hover: 'hover:bg-indigo-100',
            icon: 'text-indigo-600'
        },
        gray: {
            bg: 'bg-gray-50',
            text: 'text-gray-700',
            border: 'border-gray-200',
            hover: 'hover:bg-gray-100',
            icon: 'text-gray-600'
        },
        yellow: {
            bg: 'bg-yellow-50',
            text: 'text-yellow-700',
            border: 'border-yellow-200',
            hover: 'hover:bg-yellow-100',
            icon: 'text-yellow-600'
        }
    };
    const classes = colorClasses[color];
    const handleClick = () => {
        if (disabled)
            return;
        console.log(`Navigating to: ${href}`);
    };
    const buttonElement = (_jsx("button", { onClick: handleClick, disabled: disabled, className: `
        w-full p-4 rounded-lg border transition-all duration-200
        ${disabled
            ? 'bg-gray-50 text-gray-400 border-gray-200 cursor-not-allowed opacity-60'
            : `${classes.bg} ${classes.text} ${classes.border} ${classes.hover} cursor-pointer hover:shadow-sm active:scale-95`}
        ${highlight ? 'ring-2 ring-yellow-300 ring-opacity-50' : ''}
        text-left
      `, title: tooltip, children: _jsxs("div", { className: "flex items-center justify-between", children: [_jsxs("div", { className: "flex items-center flex-1", children: [_jsx("div", { className: `
            w-10 h-10 rounded-lg flex items-center justify-center mr-3
            ${disabled ? 'bg-gray-200' : classes.bg}
          `, children: _jsx("div", { className: disabled ? 'text-gray-400' : classes.icon, children: icon }) }), _jsxs("div", { className: "flex-1", children: [_jsxs("div", { className: "flex items-center", children: [_jsx("h4", { className: "font-medium text-sm", children: title }), highlight && (_jsx("span", { className: "ml-2 px-2 py-1 bg-yellow-200 text-yellow-800 text-xs rounded-full", children: "NEW" })), disabled && (_jsxs("div", { className: "ml-2 flex items-center", children: [_jsx(Clock, { className: "w-3 h-3 text-gray-400 mr-1" }), _jsx("span", { className: "text-xs text-gray-400", children: "\uC900\uBE44 \uC911" })] }))] }), _jsx("p", { className: "text-xs text-gray-500 mt-1", children: description })] })] }), _jsxs("div", { className: "flex items-center ml-2", children: [badge && badge > 0 && (_jsx("span", { className: "inline-flex items-center justify-center w-6 h-6 bg-red-500 text-white text-xs font-bold rounded-full mr-2", children: badge > 99 ? '99+' : badge })), !disabled && (_jsx(ExternalLink, { className: "w-4 h-4 text-gray-400" }))] })] }) }));
    if (tooltip && disabled) {
        return (_jsxs("div", { className: "relative group", children: [buttonElement, _jsxs("div", { className: "absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-10", children: [tooltip, _jsx("div", { className: "absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900" })] })] }));
    }
    return buttonElement;
};
export default ActionButton;
//# sourceMappingURL=ActionButton.js.map
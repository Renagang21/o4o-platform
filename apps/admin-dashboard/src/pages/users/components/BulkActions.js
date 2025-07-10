import { jsxs as _jsxs, jsx as _jsx, Fragment as _Fragment } from "react/jsx-runtime";
import { useState } from 'react';
import { UserCheck, UserX, UserMinus, Trash2, Mail, Download } from 'lucide-react';
const BulkActions = ({ selectedCount, onBulkAction, onClearSelection, availableActions = ['approve', 'reject', 'suspend', 'reactivate', 'delete'] }) => {
    const [showReasonModal, setShowReasonModal] = useState(null);
    const [reason, setReason] = useState('');
    if (selectedCount === 0)
        return null;
    const handleAction = (action) => {
        if (action === 'reject' || action === 'suspend') {
            setShowReasonModal(action);
        }
        else {
            onBulkAction({
                action: action,
                userIds: [],
                reason: undefined
            });
        }
    };
    const handleReasonSubmit = () => {
        if (showReasonModal && reason.trim()) {
            onBulkAction({
                action: showReasonModal,
                userIds: [],
                reason: reason.trim()
            });
            setShowReasonModal(null);
            setReason('');
        }
    };
    return (_jsxs(_Fragment, { children: [_jsx("div", { className: "wp-card border-l-4 border-l-blue-500", children: _jsx("div", { className: "wp-card-body", children: _jsxs("div", { className: "flex items-center justify-between", children: [_jsxs("div", { className: "flex items-center gap-4", children: [_jsxs("span", { className: "text-sm font-medium text-gray-700", children: [selectedCount, "\uBA85 \uC120\uD0DD\uB428"] }), _jsxs("div", { className: "flex items-center gap-2", children: [availableActions.includes('approve') && (_jsxs("button", { onClick: () => handleAction('approve'), className: "wp-button-secondary text-green-600 hover:text-green-700", title: "\uC120\uD0DD\uB41C \uC0AC\uC6A9\uC790 \uC2B9\uC778", children: [_jsx(UserCheck, { className: "w-4 h-4 mr-1" }), "\uC2B9\uC778"] })), availableActions.includes('reject') && (_jsxs("button", { onClick: () => handleAction('reject'), className: "wp-button-secondary text-red-600 hover:text-red-700", title: "\uC120\uD0DD\uB41C \uC0AC\uC6A9\uC790 \uAC70\uBD80", children: [_jsx(UserX, { className: "w-4 h-4 mr-1" }), "\uAC70\uBD80"] })), availableActions.includes('suspend') && (_jsxs("button", { onClick: () => handleAction('suspend'), className: "wp-button-secondary text-orange-600 hover:text-orange-700", title: "\uC120\uD0DD\uB41C \uC0AC\uC6A9\uC790 \uC815\uC9C0", children: [_jsx(UserMinus, { className: "w-4 h-4 mr-1" }), "\uC815\uC9C0"] })), availableActions.includes('reactivate') && (_jsxs("button", { onClick: () => handleAction('reactivate'), className: "wp-button-secondary text-blue-600 hover:text-blue-700", title: "\uC120\uD0DD\uB41C \uC0AC\uC6A9\uC790 \uC7AC\uD65C\uC131\uD654", children: [_jsx(UserCheck, { className: "w-4 h-4 mr-1" }), "\uC7AC\uD65C\uC131\uD654"] })), availableActions.includes('email') && (_jsxs("button", { onClick: () => handleAction('email'), className: "wp-button-secondary text-blue-600 hover:text-blue-700", title: "\uC120\uD0DD\uB41C \uC0AC\uC6A9\uC790\uC5D0\uAC8C \uC774\uBA54\uC77C \uBC1C\uC1A1", children: [_jsx(Mail, { className: "w-4 h-4 mr-1" }), "\uC774\uBA54\uC77C"] })), _jsx("div", { className: "border-l border-gray-300 h-6 mx-2" }), _jsxs("button", { onClick: () => handleAction('export'), className: "wp-button-secondary", title: "\uC120\uD0DD\uB41C \uC0AC\uC6A9\uC790 \uB0B4\uBCF4\uB0B4\uAE30", children: [_jsx(Download, { className: "w-4 h-4 mr-1" }), "\uB0B4\uBCF4\uB0B4\uAE30"] }), availableActions.includes('delete') && (_jsxs("button", { onClick: () => handleAction('delete'), className: "wp-button-danger", title: "\uC120\uD0DD\uB41C \uC0AC\uC6A9\uC790 \uC0AD\uC81C", children: [_jsx(Trash2, { className: "w-4 h-4 mr-1" }), "\uC0AD\uC81C"] }))] })] }), _jsx("button", { onClick: onClearSelection, className: "text-sm text-gray-500 hover:text-gray-700", children: "\uC120\uD0DD \uD574\uC81C" })] }) }) }), showReasonModal && (_jsx("div", { className: "fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50", children: _jsxs("div", { className: "bg-white rounded-lg p-6 w-full max-w-md", children: [_jsx("h3", { className: "text-lg font-semibold mb-4", children: showReasonModal === 'reject' ? '거부 사유' : '정지 사유' }), _jsx("textarea", { value: reason, onChange: (e) => setReason(e.target.value), placeholder: "\uC0AC\uC720\uB97C \uC785\uB825\uD574\uC8FC\uC138\uC694...", className: "wp-textarea w-full h-24 mb-4", required: true }), _jsxs("div", { className: "flex gap-2 justify-end", children: [_jsx("button", { onClick: () => {
                                        setShowReasonModal(null);
                                        setReason('');
                                    }, className: "wp-button-secondary", children: "\uCDE8\uC18C" }), _jsx("button", { onClick: handleReasonSubmit, disabled: !reason.trim(), className: "wp-button-primary", children: "\uD655\uC778" })] })] }) }))] }));
};
export default BulkActions;
//# sourceMappingURL=BulkActions.js.map
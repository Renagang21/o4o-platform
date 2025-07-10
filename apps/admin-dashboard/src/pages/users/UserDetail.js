import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useParams } from 'react-router-dom';
const UserDetail = () => {
    const { userId } = useParams();
    return (_jsxs("div", { className: "space-y-6", children: [_jsxs("div", { children: [_jsx("h1", { className: "text-2xl font-bold text-gray-900", children: "\uC0AC\uC6A9\uC790 \uC0C1\uC138 \uC815\uBCF4" }), _jsxs("p", { className: "text-gray-600 mt-1", children: ["\uC0AC\uC6A9\uC790 ID: ", userId] })] }), _jsx("div", { className: "wp-card", children: _jsx("div", { className: "wp-card-body", children: _jsx("div", { className: "text-center py-12 text-gray-500", children: _jsx("p", { children: "\uC0AC\uC6A9\uC790 \uC0C1\uC138 \uC815\uBCF4 \uD398\uC774\uC9C0\uB294 \uAC1C\uBC1C \uC911\uC785\uB2C8\uB2E4." }) }) }) })] }));
};
export default UserDetail;
//# sourceMappingURL=UserDetail.js.map
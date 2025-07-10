import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Component } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
class ErrorBoundary extends Component {
    state = {
        hasError: false,
        error: null,
        errorInfo: null
    };
    static getDerivedStateFromError(error) {
        return {
            hasError: true,
            error,
            errorInfo: null
        };
    }
    componentDidCatch(error, errorInfo) {
        console.error('Dashboard Error Boundary caught an error:', error, errorInfo);
        this.setState({
            error,
            errorInfo
        });
    }
    handleRetry = () => {
        this.setState({
            hasError: false,
            error: null,
            errorInfo: null
        });
    };
    handleReload = () => {
        window.location.reload();
    };
    render() {
        if (this.state.hasError) {
            if (this.props.fallback) {
                return this.props.fallback;
            }
            return (_jsx("div", { className: "wp-card", children: _jsxs("div", { className: "wp-card-body text-center py-8", children: [_jsx(AlertTriangle, { className: "w-12 h-12 text-red-500 mx-auto mb-4" }), _jsx("h3", { className: "text-lg font-medium text-gray-900 mb-2", children: "\uBB38\uC81C\uAC00 \uBC1C\uC0DD\uD588\uC2B5\uB2C8\uB2E4" }), _jsx("p", { className: "text-gray-600 mb-6", children: "\uB300\uC2DC\uBCF4\uB4DC \uCEF4\uD3EC\uB10C\uD2B8\uB97C \uB85C\uB4DC\uD558\uB294 \uC911 \uC624\uB958\uAC00 \uBC1C\uC0DD\uD588\uC2B5\uB2C8\uB2E4." }), _jsxs("div", { className: "space-x-3", children: [_jsxs("button", { onClick: this.handleRetry, className: "wp-button-primary", children: [_jsx(RefreshCw, { className: "w-4 h-4 mr-2" }), "\uB2E4\uC2DC \uC2DC\uB3C4"] }), _jsx("button", { onClick: this.handleReload, className: "wp-button-secondary", children: "\uD398\uC774\uC9C0 \uC0C8\uB85C\uACE0\uCE68" })] }), process.env.NODE_ENV === 'development' && this.state.error && (_jsxs("details", { className: "mt-6 text-left", children: [_jsx("summary", { className: "text-sm text-gray-500 cursor-pointer", children: "\uAC1C\uBC1C\uC790 \uC815\uBCF4 (\uAC1C\uBC1C \uBAA8\uB4DC\uC5D0\uC11C\uB9CC \uD45C\uC2DC)" }), _jsxs("pre", { className: "mt-2 text-xs bg-gray-100 p-3 rounded overflow-auto", children: [this.state.error.toString(), this.state.errorInfo?.componentStack] })] }))] }) }));
        }
        return this.props.children;
    }
}
export default ErrorBoundary;
//# sourceMappingURL=ErrorBoundary.js.map
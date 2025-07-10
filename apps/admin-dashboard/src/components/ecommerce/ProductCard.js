import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
export const ProductCard = ({ product, onEdit, onDelete, onDuplicate, }) => {
    const formatPrice = (price) => {
        return new Intl.NumberFormat('ko-KR', {
            style: 'currency',
            currency: 'KRW',
        }).format(price);
    };
    const getStatusBadge = (status) => {
        const statusClasses = {
            published: 'bg-green-100 text-green-800',
            draft: 'bg-yellow-100 text-yellow-800',
            private: 'bg-blue-100 text-blue-800',
            trash: 'bg-red-100 text-red-800',
        };
        const statusLabels = {
            published: '게시됨',
            draft: '임시저장',
            private: '비공개',
            trash: '휴지통',
        };
        return (_jsx("span", { className: `px-2 py-1 text-xs font-medium rounded-full ${statusClasses[status] || 'bg-gray-100 text-gray-800'}`, "data-testid": "product-status-badge", children: statusLabels[status] || status }));
    };
    const getStockStatus = () => {
        if (!product.manageStock) {
            return _jsx("span", { className: "text-blue-600", children: "\uC7AC\uACE0 \uAD00\uB9AC \uC548\uD568" });
        }
        if (product.stockQuantity === 0) {
            return _jsx("span", { className: "text-red-600", "data-testid": "out-of-stock", children: "\uD488\uC808" });
        }
        if (product.lowStockThreshold && product.stockQuantity <= product.lowStockThreshold) {
            return _jsx("span", { className: "text-orange-600", "data-testid": "low-stock", children: "\uBD80\uC871" });
        }
        return _jsx("span", { className: "text-green-600", "data-testid": "in-stock", children: "\uC7AC\uACE0 \uC788\uC74C" });
    };
    return (_jsx("div", { className: "wp-card", "data-testid": "product-card", children: _jsxs("div", { className: "wp-card-body", children: [_jsx("div", { className: "mb-4", children: _jsx("img", { src: product.featuredImage || 'https://via.placeholder.com/200x150', alt: product.name, className: "w-full h-32 object-cover rounded", "data-testid": "product-image" }) }), _jsxs("div", { className: "space-y-2", children: [_jsxs("div", { className: "flex items-start justify-between", children: [_jsx("h3", { className: "font-medium text-gray-900 line-clamp-2", "data-testid": "product-name", children: product.name }), getStatusBadge(product.status)] }), _jsxs("div", { className: "text-sm text-gray-600", "data-testid": "product-sku", children: ["SKU: ", product.sku] }), _jsxs("div", { className: "space-y-1", children: [_jsx("div", { className: "font-semibold text-lg", "data-testid": "product-price", children: formatPrice(product.retailPrice) }), product.wholesalePrice && (_jsxs("div", { className: "text-sm text-gray-600", "data-testid": "wholesale-price", children: ["\uB3C4\uB9E4\uAC00: ", formatPrice(product.wholesalePrice)] }))] }), _jsxs("div", { className: "flex items-center justify-between text-sm", children: [_jsx("span", { children: "\uC7AC\uACE0:" }), _jsxs("div", { className: "flex items-center space-x-2", children: [_jsxs("span", { "data-testid": "stock-quantity", children: [product.stockQuantity, "\uAC1C"] }), getStockStatus()] })] }), _jsxs("div", { className: "flex flex-wrap gap-1", children: [product.featured && (_jsx("span", { className: "px-2 py-1 text-xs bg-purple-100 text-purple-800 rounded", "data-testid": "featured-badge", children: "\uD2B9\uAC00" })), product.virtual && (_jsx("span", { className: "px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded", "data-testid": "virtual-badge", children: "\uAC00\uC0C1\uC0C1\uD488" })), product.downloadable && (_jsx("span", { className: "px-2 py-1 text-xs bg-indigo-100 text-indigo-800 rounded", "data-testid": "downloadable-badge", children: "\uB2E4\uC6B4\uB85C\uB4DC" }))] })] }), _jsxs("div", { className: "mt-4 flex space-x-2", children: [onEdit && (_jsx("button", { onClick: () => onEdit(product), className: "flex-1 wp-button-secondary text-sm py-2", "data-testid": "edit-button", children: "\uD3B8\uC9D1" })), onDuplicate && (_jsx("button", { onClick: () => onDuplicate(product.id), className: "px-3 py-2 text-sm border border-gray-300 rounded hover:bg-gray-50", "data-testid": "duplicate-button", children: "\uBCF5\uC81C" })), onDelete && (_jsx("button", { onClick: () => onDelete(product.id), className: "px-3 py-2 text-sm text-red-600 border border-red-300 rounded hover:bg-red-50", "data-testid": "delete-button", children: "\uC0AD\uC81C" }))] })] }) }));
};
//# sourceMappingURL=ProductCard.js.map
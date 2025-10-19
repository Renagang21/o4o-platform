"use strict";
// Dropshipping Platform Types
Object.defineProperty(exports, "__esModule", { value: true });
exports.hasPermission = exports.ROLE_PERMISSIONS = exports.CommissionStatus = exports.OrderStatus = exports.AffiliateStatus = exports.SellerLevel = exports.SupplierStatus = void 0;
var SupplierStatus;
(function (SupplierStatus) {
    SupplierStatus["PENDING"] = "pending";
    SupplierStatus["VERIFIED"] = "verified";
    SupplierStatus["SUSPENDED"] = "suspended";
    SupplierStatus["REJECTED"] = "rejected";
})(SupplierStatus || (exports.SupplierStatus = SupplierStatus = {}));
var SellerLevel;
(function (SellerLevel) {
    SellerLevel["BRONZE"] = "bronze";
    SellerLevel["SILVER"] = "silver";
    SellerLevel["GOLD"] = "gold";
    SellerLevel["PLATINUM"] = "platinum";
})(SellerLevel || (exports.SellerLevel = SellerLevel = {}));
var AffiliateStatus;
(function (AffiliateStatus) {
    AffiliateStatus["ACTIVE"] = "active";
    AffiliateStatus["INACTIVE"] = "inactive";
    AffiliateStatus["SUSPENDED"] = "suspended";
})(AffiliateStatus || (exports.AffiliateStatus = AffiliateStatus = {}));
var OrderStatus;
(function (OrderStatus) {
    OrderStatus["PENDING"] = "pending";
    OrderStatus["CONFIRMED"] = "confirmed";
    OrderStatus["PROCESSING"] = "processing";
    OrderStatus["SHIPPED"] = "shipped";
    OrderStatus["DELIVERED"] = "delivered";
    OrderStatus["CANCELLED"] = "cancelled";
    OrderStatus["REFUNDED"] = "refunded";
})(OrderStatus || (exports.OrderStatus = OrderStatus = {}));
var CommissionStatus;
(function (CommissionStatus) {
    CommissionStatus["PENDING"] = "pending";
    CommissionStatus["APPROVED"] = "approved";
    CommissionStatus["PAID"] = "paid";
    CommissionStatus["CANCELLED"] = "cancelled";
})(CommissionStatus || (exports.CommissionStatus = CommissionStatus = {}));
// Permission definitions for role-based access control
exports.ROLE_PERMISSIONS = {
    SUPPLIER: [
        'products.create',
        'products.update',
        'products.delete',
        'products.view.own',
        'inventory.manage',
        'orders.view.supplier',
        'orders.process',
        'shipping.manage',
        'analytics.view.supplier'
    ],
    SELLER: [
        'products.view.all',
        'products.import',
        'products.price.set',
        'orders.view.seller',
        'orders.manage',
        'customers.view',
        'customers.manage',
        'marketing.manage',
        'analytics.view.seller'
    ],
    AFFILIATE: [
        'products.view.public',
        'links.generate',
        'commission.view.own',
        'analytics.view.affiliate',
        'payout.request'
    ],
    CUSTOMER: [
        'products.view.public',
        'orders.create',
        'orders.view.own',
        'reviews.create',
        'profile.manage.own'
    ],
    ADMIN: [
        '*' // All permissions
    ]
};
// Helper function to check permissions
function hasPermission(userRoles, requiredPermission) {
    const userPermissions = userRoles.flatMap(role => exports.ROLE_PERMISSIONS[role] || []);
    return userPermissions.includes('*') || userPermissions.includes(requiredPermission);
}
exports.hasPermission = hasPermission;
//# sourceMappingURL=dropshipping.js.map
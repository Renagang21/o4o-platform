"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.roleBasedRateLimit = exports.validateRoleTransition = exports.requireResourceOwner = exports.requireBusinessRole = exports.requireSupplierOrSeller = exports.requireAffiliate = exports.requireSeller = exports.requireSupplier = exports.requirePermission = exports.requireDropshippingRole = void 0;
const auth_1 = require("../types/auth");
// Check if user has specific dropshipping role
const requireDropshippingRole = (allowedRoles) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({
                success: false,
                message: 'Authentication required'
            });
        }
        const hasRequiredRole = req.user.hasAnyRole(allowedRoles);
        if (!hasRequiredRole && !req.user.isAdmin()) {
            return res.status(403).json({
                success: false,
                message: 'Insufficient role permissions'
            });
        }
        next();
    };
};
exports.requireDropshippingRole = requireDropshippingRole;
// Check if user has specific permission
const requirePermission = (permission) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({
                success: false,
                message: 'Authentication required'
            });
        }
        if (!req.user.hasPermission(permission)) {
            return res.status(403).json({
                success: false,
                message: `Permission denied: ${permission}`
            });
        }
        next();
    };
};
exports.requirePermission = requirePermission;
// Middleware for supplier-only routes
exports.requireSupplier = (0, exports.requireDropshippingRole)([auth_1.UserRole.SUPPLIER]);
// Middleware for seller-only routes
exports.requireSeller = (0, exports.requireDropshippingRole)([auth_1.UserRole.SELLER]);
// Middleware for affiliate-only routes
exports.requireAffiliate = (0, exports.requireDropshippingRole)([auth_1.UserRole.AFFILIATE]);
// Middleware for supplier or seller routes
exports.requireSupplierOrSeller = (0, exports.requireDropshippingRole)([
    auth_1.UserRole.SUPPLIER,
    auth_1.UserRole.SELLER
]);
// Middleware for any business role
exports.requireBusinessRole = (0, exports.requireDropshippingRole)([
    auth_1.UserRole.SUPPLIER,
    auth_1.UserRole.SELLER,
    auth_1.UserRole.AFFILIATE,
    auth_1.UserRole.VENDOR,
    auth_1.UserRole.BUSINESS
]);
// Check if user owns the resource
const requireResourceOwner = (resourceIdParam = 'id') => {
    return async (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({
                success: false,
                message: 'Authentication required'
            });
        }
        const resourceId = req.params[resourceIdParam];
        const userId = req.user.id;
        // Admins can access any resource
        if (req.user.isAdmin()) {
            return next();
        }
        // Check ownership based on the route
        // This is a simplified version - you'd need to implement actual ownership checks
        // based on your database structure
        // For now, we'll pass through and let the controller handle ownership
        req.body._requestUserId = userId;
        next();
    };
};
exports.requireResourceOwner = requireResourceOwner;
// Validate role transition
const validateRoleTransition = (req, res, next) => {
    var _a;
    if (!req.user) {
        return res.status(401).json({
            success: false,
            message: 'Authentication required'
        });
    }
    const requestedRole = req.body.role;
    const currentRoles = req.user.getRoleNames();
    // Define allowed transitions
    const allowedTransitions = {
        [auth_1.UserRole.CUSTOMER]: [
            auth_1.UserRole.SELLER,
            auth_1.UserRole.AFFILIATE,
            auth_1.UserRole.SUPPLIER
        ],
        [auth_1.UserRole.SELLER]: [
            auth_1.UserRole.SUPPLIER,
            auth_1.UserRole.AFFILIATE
        ],
        [auth_1.UserRole.AFFILIATE]: [
            auth_1.UserRole.SELLER,
            auth_1.UserRole.SUPPLIER
        ],
        [auth_1.UserRole.SUPPLIER]: [
            auth_1.UserRole.SELLER,
            auth_1.UserRole.AFFILIATE
        ],
        // Admins can't transition to other roles
        [auth_1.UserRole.ADMIN]: [],
        [auth_1.UserRole.SUPER_ADMIN]: [],
        // Other roles
        [auth_1.UserRole.VENDOR]: [auth_1.UserRole.SELLER, auth_1.UserRole.SUPPLIER],
        [auth_1.UserRole.BUSINESS]: [auth_1.UserRole.SELLER, auth_1.UserRole.SUPPLIER, auth_1.UserRole.AFFILIATE],
        [auth_1.UserRole.MODERATOR]: [],
        [auth_1.UserRole.PARTNER]: [auth_1.UserRole.AFFILIATE],
        [auth_1.UserRole.BETA_USER]: [auth_1.UserRole.CUSTOMER],
        [auth_1.UserRole.MANAGER]: [],
        [auth_1.UserRole.VENDOR_MANAGER]: []
    };
    // Check if transition is allowed
    let canTransition = false;
    for (const currentRole of currentRoles) {
        const role = currentRole;
        if ((_a = allowedTransitions[role]) === null || _a === void 0 ? void 0 : _a.includes(requestedRole)) {
            canTransition = true;
            break;
        }
    }
    // Admins can approve any transition
    if (req.user.isAdmin()) {
        canTransition = true;
    }
    if (!canTransition && requestedRole) {
        return res.status(403).json({
            success: false,
            message: `Cannot transition from ${currentRoles.join(', ')} to ${requestedRole}`
        });
    }
    next();
};
exports.validateRoleTransition = validateRoleTransition;
// Rate limiting for specific roles
const roleBasedRateLimit = (req, res, next) => {
    if (!req.user) {
        return next();
    }
    const userRoles = req.user.getRoleNames();
    // Different rate limits for different roles
    const rateLimits = {
        [auth_1.UserRole.CUSTOMER]: 100,
        [auth_1.UserRole.AFFILIATE]: 500,
        [auth_1.UserRole.SELLER]: 1000,
        [auth_1.UserRole.SUPPLIER]: 1000,
        [auth_1.UserRole.ADMIN]: 10000,
        [auth_1.UserRole.SUPER_ADMIN]: 10000
    };
    // Set rate limit header based on highest role
    let maxLimit = 100;
    for (const role of userRoles) {
        const limit = rateLimits[role];
        if (limit && limit > maxLimit) {
            maxLimit = limit;
        }
    }
    res.setHeader('X-RateLimit-Limit', maxLimit.toString());
    next();
};
exports.roleBasedRateLimit = roleBasedRateLimit;
//# sourceMappingURL=dropshipping-auth.js.map
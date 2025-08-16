"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireStaff = exports.requireAdmin = exports.authorize = void 0;
const auth_1 = require("../types/auth");
/**
 * Authorization middleware to check user roles
 * @param allowedRoles Array of roles that are allowed to access the route
 */
const authorize = (allowedRoles) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ error: 'Authentication required' });
        }
        // Map role strings to UserRole enum
        const userRole = req.user.role;
        // Check if user's role is in the allowed roles
        const isAllowed = allowedRoles.some(role => {
            switch (role.toLowerCase()) {
                case 'admin':
                    return userRole === auth_1.UserRole.ADMIN;
                case 'staff':
                    return userRole === auth_1.UserRole.MODERATOR || userRole === auth_1.UserRole.ADMIN || userRole === auth_1.UserRole.SUPER_ADMIN;
                case 'vendor':
                    return userRole === auth_1.UserRole.VENDOR || userRole === auth_1.UserRole.ADMIN;
                case 'customer':
                    return userRole === auth_1.UserRole.CUSTOMER || userRole === auth_1.UserRole.ADMIN;
                default:
                    return false;
            }
        });
        if (!isAllowed) {
            return res.status(403).json({
                error: 'Insufficient permissions',
                required: allowedRoles,
                current: userRole
            });
        }
        next();
    };
};
exports.authorize = authorize;
/**
 * Check if user has admin role
 */
const requireAdmin = (req, res, next) => {
    if (!req.user) {
        return res.status(401).json({ error: 'Authentication required' });
    }
    if (req.user.role !== auth_1.UserRole.ADMIN) {
        return res.status(403).json({ error: 'Admin access required' });
    }
    next();
};
exports.requireAdmin = requireAdmin;
/**
 * Check if user has staff role or higher
 */
const requireStaff = (req, res, next) => {
    if (!req.user) {
        return res.status(401).json({ error: 'Authentication required' });
    }
    if (req.user.role !== auth_1.UserRole.ADMIN && req.user.role !== auth_1.UserRole.MODERATOR && req.user.role !== auth_1.UserRole.SUPER_ADMIN) {
        return res.status(403).json({ error: 'Staff access required' });
    }
    next();
};
exports.requireStaff = requireStaff;
//# sourceMappingURL=authorize.js.map
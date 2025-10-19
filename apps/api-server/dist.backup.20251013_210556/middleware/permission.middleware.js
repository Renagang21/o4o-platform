"use strict";
/**
 * Unified Permission Middleware
 *
 * Centralized permission checking using database-driven role and permission system.
 * This middleware replaces scattered permission checks across the codebase.
 *
 * Features:
 * - Database-driven permissions via User.dbRoles
 * - Fallback to legacy role-based permissions
 * - Support for direct user permissions
 * - Flexible permission checking (single, any, all)
 * - Role-based access control
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.checkOptionalPermission = exports.customPermissionCheck = exports.requireSelfOrAdmin = exports.requireSuperAdmin = exports.requireAdmin = exports.requireAnyRole = exports.requireRole = exports.requireAllPermissions = exports.requireAnyPermission = exports.requirePermission = exports.ensureAuthenticated = void 0;
const User_1 = require("../entities/User");
/**
 * Ensure user is authenticated
 * This should be the first middleware in protected routes
 */
const ensureAuthenticated = (req, res, next) => {
    if (!req.user) {
        return res.status(401).json({
            success: false,
            error: 'Unauthorized',
            code: 'NOT_AUTHENTICATED',
            message: 'Authentication required. Please log in to access this resource.'
        });
    }
    next();
};
exports.ensureAuthenticated = ensureAuthenticated;
/**
 * Check if user has a specific permission
 * @param permission Permission key (e.g., 'users.view', 'content.create')
 */
const requirePermission = (permission) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({
                success: false,
                error: 'Unauthorized',
                code: 'NOT_AUTHENTICATED'
            });
        }
        // Check if user has the required permission
        if (!req.user.hasPermission(permission)) {
            return res.status(403).json({
                success: false,
                error: 'Forbidden',
                code: 'INSUFFICIENT_PERMISSIONS',
                message: `You don't have permission to perform this action. Required: ${permission}`,
                required: permission
            });
        }
        next();
    };
};
exports.requirePermission = requirePermission;
/**
 * Check if user has ANY of the specified permissions
 * @param permissions Array of permission keys
 */
const requireAnyPermission = (permissions) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({
                success: false,
                error: 'Unauthorized',
                code: 'NOT_AUTHENTICATED'
            });
        }
        // Check if user has any of the required permissions
        if (!req.user.hasAnyPermission(permissions)) {
            return res.status(403).json({
                success: false,
                error: 'Forbidden',
                code: 'INSUFFICIENT_PERMISSIONS',
                message: `You need one of these permissions: ${permissions.join(', ')}`,
                required: permissions
            });
        }
        next();
    };
};
exports.requireAnyPermission = requireAnyPermission;
/**
 * Check if user has ALL of the specified permissions
 * @param permissions Array of permission keys
 */
const requireAllPermissions = (permissions) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({
                success: false,
                error: 'Unauthorized',
                code: 'NOT_AUTHENTICATED'
            });
        }
        // Check if user has all required permissions
        if (!req.user.hasAllPermissions(permissions)) {
            return res.status(403).json({
                success: false,
                error: 'Forbidden',
                code: 'INSUFFICIENT_PERMISSIONS',
                message: `You need all of these permissions: ${permissions.join(', ')}`,
                required: permissions
            });
        }
        next();
    };
};
exports.requireAllPermissions = requireAllPermissions;
/**
 * Check if user has a specific role
 * @param role Role name or UserRole enum value
 */
const requireRole = (role) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({
                success: false,
                error: 'Unauthorized',
                code: 'NOT_AUTHENTICATED'
            });
        }
        if (!req.user.hasRole(role)) {
            return res.status(403).json({
                success: false,
                error: 'Forbidden',
                code: 'INSUFFICIENT_ROLE',
                message: `This action requires ${role} role`,
                required: role
            });
        }
        next();
    };
};
exports.requireRole = requireRole;
/**
 * Check if user has ANY of the specified roles
 * @param roles Array of role names
 */
const requireAnyRole = (roles) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({
                success: false,
                error: 'Unauthorized',
                code: 'NOT_AUTHENTICATED'
            });
        }
        if (!req.user.hasAnyRole(roles)) {
            return res.status(403).json({
                success: false,
                error: 'Forbidden',
                code: 'INSUFFICIENT_ROLE',
                message: `This action requires one of these roles: ${roles.join(', ')}`,
                required: roles
            });
        }
        next();
    };
};
exports.requireAnyRole = requireAnyRole;
/**
 * Shorthand for requiring admin role
 * Checks for both ADMIN and SUPER_ADMIN roles
 */
exports.requireAdmin = (0, exports.requireAnyRole)([User_1.UserRole.ADMIN, User_1.UserRole.SUPER_ADMIN]);
/**
 * Shorthand for requiring super admin role
 */
exports.requireSuperAdmin = (0, exports.requireRole)(User_1.UserRole.SUPER_ADMIN);
/**
 * Check if user is accessing their own resource
 * @param paramName Parameter name containing user ID (default: 'id')
 */
const requireSelfOrAdmin = (paramName = 'id') => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({
                success: false,
                error: 'Unauthorized',
                code: 'NOT_AUTHENTICATED'
            });
        }
        const targetUserId = req.params[paramName];
        const isOwner = req.user.id === targetUserId;
        const isAdmin = req.user.isAdmin();
        if (!isOwner && !isAdmin) {
            return res.status(403).json({
                success: false,
                error: 'Forbidden',
                code: 'ACCESS_DENIED',
                message: 'You can only access your own resources'
            });
        }
        next();
    };
};
exports.requireSelfOrAdmin = requireSelfOrAdmin;
/**
 * Custom permission check function
 * For complex permission logic that can't be expressed with standard middleware
 *
 * @example
 * customPermissionCheck((user) => {
 *   return user.isAdmin() || user.hasPermission('special.access');
 * })
 */
const customPermissionCheck = (checkFn, errorMessage = 'You do not have permission to perform this action') => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({
                success: false,
                error: 'Unauthorized',
                code: 'NOT_AUTHENTICATED'
            });
        }
        if (!checkFn(req.user)) {
            return res.status(403).json({
                success: false,
                error: 'Forbidden',
                code: 'CUSTOM_PERMISSION_DENIED',
                message: errorMessage
            });
        }
        next();
    };
};
exports.customPermissionCheck = customPermissionCheck;
/**
 * Optional permission check - allows access but marks in request if user has permission
 * Useful for conditional UI rendering or feature access
 */
const checkOptionalPermission = (permission, markAs = 'hasPermission') => {
    return (req, res, next) => {
        if (req.user) {
            req[markAs] = req.user.hasPermission(permission);
        }
        else {
            req[markAs] = false;
        }
        next();
    };
};
exports.checkOptionalPermission = checkOptionalPermission;
//# sourceMappingURL=permission.middleware.js.map
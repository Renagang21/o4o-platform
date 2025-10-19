"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.contributorOnly = exports.authorOnly = exports.editorOnly = exports.adminOnly = exports.authorize = void 0;
/**
 * Authorization middleware to check user roles
 * @param allowedRoles Array of roles that are allowed to access the route
 */
const authorize = (allowedRoles) => {
    return (req, res, next) => {
        // Check if user is authenticated
        if (!req.user) {
            return res.status(401).json({
                error: {
                    code: 'UNAUTHORIZED',
                    message: 'Authentication required'
                }
            });
        }
        // Get user role(s)
        const userRoles = req.user.roles || (req.user.role ? [req.user.role] : []);
        // Check if user has at least one of the allowed roles
        const hasPermission = allowedRoles.some(role => userRoles.includes(role));
        if (!hasPermission) {
            return res.status(403).json({
                error: {
                    code: 'FORBIDDEN',
                    message: 'Insufficient permissions to access this resource'
                }
            });
        }
        next();
    };
};
exports.authorize = authorize;
// Export convenience functions for common role checks
exports.adminOnly = (0, exports.authorize)(['admin']);
exports.editorOnly = (0, exports.authorize)(['editor', 'admin']);
exports.authorOnly = (0, exports.authorize)(['author', 'editor', 'admin']);
exports.contributorOnly = (0, exports.authorize)(['contributor', 'author', 'editor', 'admin']);
//# sourceMappingURL=authorize.js.map
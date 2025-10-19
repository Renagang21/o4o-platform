"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isAdmin = void 0;
const auth_1 = require("../types/auth");
const isAdmin = (req, res, next) => {
    if (!req.user) {
        return res.status(401).json({
            status: 'error',
            message: 'Authentication required'
        });
    }
    // Check for admin roles using database roles
    if (!req.user.hasAnyRole([auth_1.UserRole.ADMIN, auth_1.UserRole.SUPER_ADMIN])) {
        return res.status(403).json({
            status: 'error',
            message: 'Admin access required'
        });
    }
    next();
};
exports.isAdmin = isAdmin;
//# sourceMappingURL=admin.js.map
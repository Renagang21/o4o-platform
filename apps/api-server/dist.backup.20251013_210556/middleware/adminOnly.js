"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.adminOnly = void 0;
const auth_1 = require("../types/auth");
const adminOnly = (req, res, next) => {
    const authReq = req;
    if (!authReq.user) {
        return res.status(401).json({
            success: false,
            message: 'Authentication required'
        });
    }
    if (!authReq.user.hasAnyRole([auth_1.UserRole.ADMIN, auth_1.UserRole.SUPER_ADMIN])) {
        return res.status(403).json({
            success: false,
            message: 'Admin access required'
        });
    }
    next();
};
exports.adminOnly = adminOnly;
//# sourceMappingURL=adminOnly.js.map
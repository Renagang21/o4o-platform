"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.checkRole = void 0;
const checkRole = (roles) => {
    return (req, res, next) => {
        const authReq = req;
        if (!authReq.user) {
            return res.status(401).json({ error: 'Authentication required' });
        }
        if (!roles.includes(authReq.user.role)) {
            return res.status(403).json({ error: 'Insufficient permissions' });
        }
        next();
    };
};
exports.checkRole = checkRole;
//# sourceMappingURL=checkRole.js.map
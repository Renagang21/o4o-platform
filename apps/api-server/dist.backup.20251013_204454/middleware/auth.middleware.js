"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authenticate = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const connection_1 = require("../database/connection");
const User_1 = require("../entities/User");
const authenticate = async (req, res, next) => {
    try {
        // Get token from header
        const authHeader = req.headers.authorization;
        const token = authHeader && authHeader.startsWith('Bearer ')
            ? authHeader.substring(7)
            : null;
        if (!token) {
            return res.status(403).json({
                error: 'Authentication required',
                code: 'AUTH_REQUIRED',
                message: 'Access token is required for this endpoint'
            });
        }
        // Verify token
        const decoded = jsonwebtoken_1.default.verify(token, process.env.JWT_SECRET || 'your-secret-key');
        // Get user from database
        const userRepo = connection_1.AppDataSource.getRepository(User_1.User);
        const user = await userRepo.findOne({
            where: { id: decoded.userId || decoded.sub },
            relations: ['linkedAccounts', 'dbRoles', 'dbRoles.permissions']
        });
        if (!user) {
            return res.status(403).json({
                error: 'Invalid authentication',
                code: 'INVALID_USER',
                message: 'User account not found or has been deactivated'
            });
        }
        // Attach user to request (preserve User instance methods)
        req.user = user;
        next();
    }
    catch (error) {
        return res.status(403).json({
            error: 'Invalid authentication',
            code: 'INVALID_TOKEN',
            message: 'Access token is invalid or has expired'
        });
    }
};
exports.authenticate = authenticate;
//# sourceMappingURL=auth.middleware.js.map
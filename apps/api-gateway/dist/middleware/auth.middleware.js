"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthMiddleware = void 0;
var jsonwebtoken_1 = require("jsonwebtoken");
var gateway_config_js_1 = require("../config/gateway.config.js");
var logger_js_1 = require("../utils/logger.js");
var logger = (0, logger_js_1.createLogger)('AuthMiddleware');
var AuthMiddleware = /** @class */ (function () {
    function AuthMiddleware(redis) {
        var _this = this;
        /**
         * Verify JWT token and attach user to request
         */
        this.authenticate = function (req, res, next) { return __awaiter(_this, void 0, void 0, function () {
            var token, authHeader, decoded, isBlacklisted, sessionId, sessionData, session, error_1, error_2;
            var _a, _b;
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0:
                        _c.trys.push([0, 8, , 9]);
                        token = (_a = req.cookies) === null || _a === void 0 ? void 0 : _a.accessToken;
                        // Fallback to Authorization header
                        if (!token) {
                            authHeader = req.headers.authorization;
                            if (authHeader === null || authHeader === void 0 ? void 0 : authHeader.startsWith('Bearer ')) {
                                token = authHeader.substring(7);
                            }
                        }
                        if (!token) {
                            res.status(401).json({
                                error: 'No authentication token provided',
                                code: 'NO_TOKEN'
                            });
                            return [2 /*return*/];
                        }
                        _c.label = 1;
                    case 1:
                        _c.trys.push([1, 6, , 7]);
                        decoded = jsonwebtoken_1.default.verify(token, this.jwtSecret);
                        if (!this.redis) return [3 /*break*/, 3];
                        return [4 /*yield*/, this.redis.get("blacklist:".concat(token))];
                    case 2:
                        isBlacklisted = _c.sent();
                        if (isBlacklisted) {
                            res.status(401).json({
                                error: 'Token has been revoked',
                                code: 'TOKEN_REVOKED'
                            });
                            return [2 /*return*/];
                        }
                        _c.label = 3;
                    case 3:
                        // Attach user to request
                        req.user = {
                            id: decoded.id || decoded.userId,
                            email: decoded.email,
                            role: decoded.role,
                            status: decoded.status,
                            permissions: decoded.permissions
                        };
                        sessionId = (_b = req.cookies) === null || _b === void 0 ? void 0 : _b.sessionId;
                        if (!(sessionId && this.redis)) return [3 /*break*/, 5];
                        return [4 /*yield*/, this.redis.get("session:".concat(sessionId))];
                    case 4:
                        sessionData = _c.sent();
                        if (sessionData) {
                            session = JSON.parse(sessionData);
                            if (session.userId === req.user.id) {
                                req.session = {
                                    id: sessionId,
                                    userId: session.userId
                                };
                            }
                        }
                        _c.label = 5;
                    case 5:
                        logger.debug('User authenticated', {
                            userId: req.user.id,
                            role: req.user.role
                        });
                        next();
                        return [3 /*break*/, 7];
                    case 6:
                        error_1 = _c.sent();
                        if (error_1.name === 'TokenExpiredError') {
                            res.status(401).json({
                                error: 'Token has expired',
                                code: 'TOKEN_EXPIRED'
                            });
                            return [2 /*return*/];
                        }
                        if (error_1.name === 'JsonWebTokenError') {
                            res.status(401).json({
                                error: 'Invalid token',
                                code: 'INVALID_TOKEN'
                            });
                            return [2 /*return*/];
                        }
                        throw error_1;
                    case 7: return [3 /*break*/, 9];
                    case 8:
                        error_2 = _c.sent();
                        logger.error('Authentication error', error_2);
                        res.status(500).json({
                            error: 'Authentication failed',
                            code: 'AUTH_ERROR'
                        });
                        return [3 /*break*/, 9];
                    case 9: return [2 /*return*/];
                }
            });
        }); };
        /**
         * Check if user has required role
         */
        this.authorize = function (roles) {
            return function (req, res, next) {
                if (!req.user) {
                    res.status(401).json({
                        error: 'Authentication required',
                        code: 'AUTH_REQUIRED'
                    });
                    return;
                }
                if (!roles.includes(req.user.role)) {
                    logger.warn('Authorization failed', {
                        userId: req.user.id,
                        userRole: req.user.role,
                        requiredRoles: roles
                    });
                    res.status(403).json({
                        error: 'Insufficient permissions',
                        code: 'FORBIDDEN'
                    });
                    return;
                }
                next();
            };
        };
        /**
         * Check if user has required permission
         */
        this.requirePermission = function (permission) {
            return function (req, res, next) {
                var _a;
                if (!req.user) {
                    res.status(401).json({
                        error: 'Authentication required',
                        code: 'AUTH_REQUIRED'
                    });
                    return;
                }
                // Admin has all permissions
                if (req.user.role === 'admin') {
                    next();
                    return;
                }
                if (!((_a = req.user.permissions) === null || _a === void 0 ? void 0 : _a.includes(permission))) {
                    logger.warn('Permission check failed', {
                        userId: req.user.id,
                        permission: permission,
                        userPermissions: req.user.permissions
                    });
                    res.status(403).json({
                        error: 'Missing required permission',
                        code: 'PERMISSION_DENIED',
                        permission: permission
                    });
                    return;
                }
                next();
            };
        };
        /**
         * Optional authentication - attach user if token exists but don't fail
         */
        this.optionalAuth = function (req, res, next) { return __awaiter(_this, void 0, void 0, function () {
            var token, authHeader, decoded, isBlacklisted, _a, error_3;
            var _b;
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0:
                        _c.trys.push([0, 7, , 8]);
                        token = (_b = req.cookies) === null || _b === void 0 ? void 0 : _b.accessToken;
                        if (!token) {
                            authHeader = req.headers.authorization;
                            if (authHeader === null || authHeader === void 0 ? void 0 : authHeader.startsWith('Bearer ')) {
                                token = authHeader.substring(7);
                            }
                        }
                        if (!token) return [3 /*break*/, 6];
                        _c.label = 1;
                    case 1:
                        _c.trys.push([1, 5, , 6]);
                        decoded = jsonwebtoken_1.default.verify(token, this.jwtSecret);
                        if (!this.redis) return [3 /*break*/, 3];
                        return [4 /*yield*/, this.redis.get("blacklist:".concat(token))];
                    case 2:
                        isBlacklisted = _c.sent();
                        if (!isBlacklisted) {
                            req.user = {
                                id: decoded.id || decoded.userId,
                                email: decoded.email,
                                role: decoded.role,
                                status: decoded.status,
                                permissions: decoded.permissions
                            };
                        }
                        return [3 /*break*/, 4];
                    case 3:
                        req.user = {
                            id: decoded.id || decoded.userId,
                            email: decoded.email,
                            role: decoded.role,
                            status: decoded.status,
                            permissions: decoded.permissions
                        };
                        _c.label = 4;
                    case 4: return [3 /*break*/, 6];
                    case 5:
                        _a = _c.sent();
                        return [3 /*break*/, 6];
                    case 6:
                        next();
                        return [3 /*break*/, 8];
                    case 7:
                        error_3 = _c.sent();
                        logger.error('Optional auth error', error_3);
                        next(); // Continue without auth
                        return [3 /*break*/, 8];
                    case 8: return [2 /*return*/];
                }
            });
        }); };
        /**
         * Extract and forward auth headers to downstream services
         */
        this.forwardAuth = function (req, res, next) {
            var _a, _b, _c;
            // Forward cookies
            if ((_a = req.cookies) === null || _a === void 0 ? void 0 : _a.accessToken) {
                req.headers['x-access-token'] = req.cookies.accessToken;
            }
            if ((_b = req.cookies) === null || _b === void 0 ? void 0 : _b.refreshToken) {
                req.headers['x-refresh-token'] = req.cookies.refreshToken;
            }
            if ((_c = req.cookies) === null || _c === void 0 ? void 0 : _c.sessionId) {
                req.headers['x-session-id'] = req.cookies.sessionId;
            }
            // Forward user info if authenticated
            if (req.user) {
                req.headers['x-user-id'] = req.user.id;
                req.headers['x-user-email'] = req.user.email;
                req.headers['x-user-role'] = req.user.role;
                req.headers['x-user-status'] = req.user.status;
            }
            next();
        };
        this.redis = redis || null;
        this.jwtSecret = gateway_config_js_1.gatewayConfig.jwt.secret;
    }
    return AuthMiddleware;
}());
exports.AuthMiddleware = AuthMiddleware;

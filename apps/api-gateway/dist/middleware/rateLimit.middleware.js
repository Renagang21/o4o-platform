"use strict";
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
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
exports.RateLimitMiddleware = void 0;
var express_rate_limit_1 = require("express-rate-limit");
var rate_limit_redis_1 = require("rate-limit-redis");
var gateway_config_js_1 = require("../config/gateway.config.js");
var logger_js_1 = require("../utils/logger.js");
var logger = (0, logger_js_1.createLogger)('RateLimitMiddleware');
var RateLimitMiddleware = /** @class */ (function () {
    function RateLimitMiddleware(redis) {
        this.limiters = new Map();
        this.redis = redis || null;
    }
    /**
     * Create a rate limiter instance
     */
    RateLimitMiddleware.prototype.createLimiter = function (config) {
        var _this = this;
        var baseConfig = {
            windowMs: config.windowMs || gateway_config_js_1.gatewayConfig.rateLimit.windowMs,
            max: config.max || gateway_config_js_1.gatewayConfig.rateLimit.max,
            standardHeaders: true,
            legacyHeaders: false,
            message: config.message || 'Too many requests, please try again later.',
            handler: function (req, res) {
                var _a;
                logger.warn('Rate limit exceeded', {
                    ip: req.ip,
                    path: req.path,
                    user: (_a = req.user) === null || _a === void 0 ? void 0 : _a.id
                });
                res.status(429).json({
                    error: config.message || 'Too many requests',
                    code: 'RATE_LIMIT_EXCEEDED',
                    retryAfter: res.getHeader('Retry-After')
                });
            },
            skip: config.skip,
            keyGenerator: config.keyGenerator || (function (req) {
                var _a;
                // Use user ID if authenticated, otherwise use IP
                var authReq = req;
                return ((_a = authReq.user) === null || _a === void 0 ? void 0 : _a.id) || req.ip || 'unknown';
            })
        };
        // Use Redis store if available
        if (this.redis) {
            return (0, express_rate_limit_1.default)(__assign(__assign({}, baseConfig), { store: new rate_limit_redis_1.default({
                    // @ts-expect-error - RedisStore types might not match exactly
                    client: this.redis,
                    prefix: 'rl:',
                    sendCommand: function () {
                        var _a;
                        var args = [];
                        for (var _i = 0; _i < arguments.length; _i++) {
                            args[_i] = arguments[_i];
                        }
                        return (_a = _this.redis).call.apply(_a, args);
                    }
                }) }));
        }
        // Fallback to memory store
        return (0, express_rate_limit_1.default)(baseConfig);
    };
    /**
     * Global rate limiter
     */
    RateLimitMiddleware.prototype.global = function () {
        var key = 'global';
        if (!this.limiters.has(key)) {
            this.limiters.set(key, this.createLimiter({}));
        }
        return this.limiters.get(key);
    };
    /**
     * Auth endpoints rate limiter (stricter)
     */
    RateLimitMiddleware.prototype.auth = function () {
        var key = 'auth';
        if (!this.limiters.has(key)) {
            this.limiters.set(key, this.createLimiter({
                windowMs: 15 * 60 * 1000, // 15 minutes
                max: 5, // 5 requests per window
                message: 'Too many authentication attempts, please try again later.',
                keyGenerator: function (req) {
                    // Rate limit by IP for auth endpoints
                    return req.ip || 'unknown';
                }
            }));
        }
        return this.limiters.get(key);
    };
    /**
     * API endpoints rate limiter (per user)
     */
    RateLimitMiddleware.prototype.api = function () {
        var key = 'api';
        if (!this.limiters.has(key)) {
            this.limiters.set(key, this.createLimiter({
                windowMs: 15 * 60 * 1000, // 15 minutes
                max: 100, // 100 requests per window
                skip: function (req) {
                    var _a;
                    // Skip rate limiting for admin users
                    var authReq = req;
                    return ((_a = authReq.user) === null || _a === void 0 ? void 0 : _a.role) === 'admin';
                }
            }));
        }
        return this.limiters.get(key);
    };
    /**
     * Public endpoints rate limiter (more lenient)
     */
    RateLimitMiddleware.prototype.public = function () {
        var key = 'public';
        if (!this.limiters.has(key)) {
            this.limiters.set(key, this.createLimiter({
                windowMs: 15 * 60 * 1000, // 15 minutes
                max: 300, // 300 requests per window
                keyGenerator: function (req) {
                    // Rate limit by IP for public endpoints
                    return req.ip || 'unknown';
                }
            }));
        }
        return this.limiters.get(key);
    };
    /**
     * Create custom rate limiter
     */
    RateLimitMiddleware.prototype.custom = function (key, config) {
        if (!this.limiters.has(key)) {
            this.limiters.set(key, this.createLimiter(config));
        }
        return this.limiters.get(key);
    };
    /**
     * Dynamic rate limiter based on route config
     */
    RateLimitMiddleware.prototype.dynamic = function (windowMs, max) {
        var key = "dynamic-".concat(windowMs, "-").concat(max);
        if (!this.limiters.has(key)) {
            this.limiters.set(key, this.createLimiter({ windowMs: windowMs, max: max }));
        }
        return this.limiters.get(key);
    };
    /**
     * Reset rate limit for a specific key
     */
    RateLimitMiddleware.prototype.reset = function (key) {
        return __awaiter(this, void 0, void 0, function () {
            var keys, error_1;
            var _a;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        if (!this.redis) {
                            logger.warn('Cannot reset rate limit without Redis');
                            return [2 /*return*/];
                        }
                        _b.label = 1;
                    case 1:
                        _b.trys.push([1, 5, , 6]);
                        return [4 /*yield*/, this.redis.keys("rl:".concat(key, "*"))];
                    case 2:
                        keys = _b.sent();
                        if (!(keys.length > 0)) return [3 /*break*/, 4];
                        return [4 /*yield*/, (_a = this.redis).del.apply(_a, keys)];
                    case 3:
                        _b.sent();
                        logger.info("Reset rate limit for key: ".concat(key), { count: keys.length });
                        _b.label = 4;
                    case 4: return [3 /*break*/, 6];
                    case 5:
                        error_1 = _b.sent();
                        logger.error('Failed to reset rate limit', { key: key, error: error_1 });
                        return [3 /*break*/, 6];
                    case 6: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Get current rate limit status for a key
     */
    RateLimitMiddleware.prototype.getStatus = function (key) {
        return __awaiter(this, void 0, void 0, function () {
            var value, error_2;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (!this.redis) {
                            return [2 /*return*/, null];
                        }
                        _a.label = 1;
                    case 1:
                        _a.trys.push([1, 3, , 4]);
                        return [4 /*yield*/, this.redis.get("rl:".concat(key))];
                    case 2:
                        value = _a.sent();
                        if (value) {
                            return [2 /*return*/, JSON.parse(value)];
                        }
                        return [2 /*return*/, null];
                    case 3:
                        error_2 = _a.sent();
                        logger.error('Failed to get rate limit status', { key: key, error: error_2 });
                        return [2 /*return*/, null];
                    case 4: return [2 /*return*/];
                }
            });
        });
    };
    return RateLimitMiddleware;
}());
exports.RateLimitMiddleware = RateLimitMiddleware;

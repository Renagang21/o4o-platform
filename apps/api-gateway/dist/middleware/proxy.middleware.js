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
exports.ProxyMiddleware = void 0;
var http_proxy_middleware_1 = require("http-proxy-middleware");
var logger_js_1 = require("../utils/logger.js");
var logger = (0, logger_js_1.createLogger)('ProxyMiddleware');
var ProxyMiddleware = /** @class */ (function () {
    function ProxyMiddleware(serviceRegistry) {
        this.proxies = new Map();
        this.serviceRegistry = serviceRegistry;
    }
    /**
     * Get service registry instance
     */
    ProxyMiddleware.prototype.getServiceRegistry = function () {
        return this.serviceRegistry;
    };
    /**
     * Create proxy middleware for a service
     */
    ProxyMiddleware.prototype.createProxy = function (serviceKey) {
        var _this = this;
        if (this.proxies.has(serviceKey)) {
            return this.proxies.get(serviceKey);
        }
        var service = this.serviceRegistry.getService(serviceKey);
        if (!service) {
            throw new Error("Service ".concat(serviceKey, " not found in registry"));
        }
        var proxyOptions = {
            target: service.url,
            changeOrigin: true,
            timeout: service.timeout || 10000,
            proxyTimeout: service.timeout || 10000,
            // Path rewriting
            pathRewrite: function (path) {
                // Remove /api/v1 prefix as backend services handle their own paths
                var newPath = path.replace(/^\/api\/v\d+/, '/api');
                logger.debug('Path rewrite', { original: path, rewritten: newPath });
                return newPath;
            },
            // Request interceptor
            on: {
                proxyReq: function (proxyReq, req, res) {
                    var _a;
                    var authReq = req;
                    // Forward auth headers
                    if (authReq.user) {
                        proxyReq.setHeader('X-User-Id', authReq.user.id);
                        proxyReq.setHeader('X-User-Email', authReq.user.email);
                        proxyReq.setHeader('X-User-Role', authReq.user.role);
                        proxyReq.setHeader('X-User-Status', authReq.user.status);
                    }
                    // Forward session ID
                    if (authReq.session) {
                        proxyReq.setHeader('X-Session-Id', authReq.session.id);
                    }
                    // Forward original IP
                    var clientIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
                    proxyReq.setHeader('X-Forwarded-For', clientIp);
                    proxyReq.setHeader('X-Real-IP', clientIp);
                    // Forward cookies
                    var cookies = req.headers.cookie;
                    if (cookies) {
                        proxyReq.setHeader('Cookie', cookies);
                    }
                    // Log proxy request
                    logger.debug('Proxying request', {
                        method: req.method,
                        path: req.path,
                        target: service.url,
                        user: (_a = authReq.user) === null || _a === void 0 ? void 0 : _a.id
                    });
                },
                proxyRes: function (proxyRes, req, res) {
                    // Log proxy response
                    logger.debug('Proxy response', {
                        status: proxyRes.statusCode,
                        path: req.path,
                        service: serviceKey
                    });
                    // Add service header
                    proxyRes.headers['X-Served-By'] = service.name;
                },
                error: function (err, req, res) {
                    logger.error('Proxy error', {
                        error: err.message,
                        service: serviceKey,
                        path: req.path
                    });
                    // Check if service is healthy
                    if (!_this.serviceRegistry.isServiceHealthy(serviceKey)) {
                        res.status(503).json({
                            error: 'Service temporarily unavailable',
                            code: 'SERVICE_UNAVAILABLE',
                            service: service.name
                        });
                    }
                    else {
                        res.status(502).json({
                            error: 'Bad gateway',
                            code: 'BAD_GATEWAY',
                            service: service.name
                        });
                    }
                }
            }
        };
        var proxy = (0, http_proxy_middleware_1.createProxyMiddleware)(proxyOptions);
        this.proxies.set(serviceKey, proxy);
        return proxy;
    };
    /**
     * Route to service based on configuration
     */
    ProxyMiddleware.prototype.routeToService = function (route) {
        var _this = this;
        return function (req, res, next) { return __awaiter(_this, void 0, void 0, function () {
            var proxy;
            return __generator(this, function (_a) {
                try {
                    // Check if service is healthy (circuit breaker)
                    if (!this.serviceRegistry.shouldRouteToService(route.service)) {
                        logger.warn('Service unhealthy, circuit breaker open', {
                            service: route.service,
                            path: req.path
                        });
                        return [2 /*return*/, res.status(503).json({
                                error: 'Service temporarily unavailable',
                                code: 'SERVICE_UNAVAILABLE',
                                service: route.service
                            })];
                    }
                    proxy = this.createProxy(route.service);
                    // Execute proxy
                    proxy(req, res, next);
                }
                catch (error) {
                    logger.error('Failed to route request', {
                        error: error.message,
                        service: route.service,
                        path: req.path
                    });
                    res.status(500).json({
                        error: 'Internal gateway error',
                        code: 'GATEWAY_ERROR'
                    });
                }
                return [2 /*return*/];
            });
        }); };
    };
    /**
     * Load balancing proxy (round-robin)
     */
    ProxyMiddleware.prototype.loadBalancedProxy = function (serviceKeys) {
        var _this = this;
        var currentIndex = 0;
        return function (req, res, next) { return __awaiter(_this, void 0, void 0, function () {
            var healthyServices, selectedService, route;
            var _this = this;
            return __generator(this, function (_a) {
                healthyServices = serviceKeys.filter(function (key) {
                    return _this.serviceRegistry.isServiceHealthy(key);
                });
                if (healthyServices.length === 0) {
                    return [2 /*return*/, res.status(503).json({
                            error: 'No healthy services available',
                            code: 'NO_HEALTHY_SERVICES'
                        })];
                }
                selectedService = healthyServices[currentIndex % healthyServices.length];
                currentIndex++;
                route = {
                    path: req.path,
                    service: selectedService
                };
                this.routeToService(route)(req, res, next);
                return [2 /*return*/];
            });
        }); };
    };
    /**
     * Fallback proxy with retries
     */
    ProxyMiddleware.prototype.fallbackProxy = function (primaryService, fallbackService) {
        var _this = this;
        return function (req, res, next) { return __awaiter(_this, void 0, void 0, function () {
            var primaryRoute, fallbackRoute;
            return __generator(this, function (_a) {
                // Try primary service first
                if (this.serviceRegistry.isServiceHealthy(primaryService)) {
                    primaryRoute = {
                        path: req.path,
                        service: primaryService
                    };
                    return [2 /*return*/, this.routeToService(primaryRoute)(req, res, next)];
                }
                // Fallback to secondary service
                logger.info('Using fallback service', {
                    primary: primaryService,
                    fallback: fallbackService,
                    path: req.path
                });
                fallbackRoute = {
                    path: req.path,
                    service: fallbackService
                };
                this.routeToService(fallbackRoute)(req, res, next);
                return [2 /*return*/];
            });
        }); };
    };
    return ProxyMiddleware;
}());
exports.ProxyMiddleware = ProxyMiddleware;

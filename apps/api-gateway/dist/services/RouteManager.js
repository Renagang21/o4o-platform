"use strict";
var __spreadArray = (this && this.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.RouteManager = void 0;
var express_1 = require("express");
var gateway_config_js_1 = require("../config/gateway.config.js");
var logger_js_1 = require("../utils/logger.js");
var logger = (0, logger_js_1.createLogger)('RouteManager');
var RouteManager = /** @class */ (function () {
    function RouteManager(app, authMiddleware, rateLimitMiddleware, proxyMiddleware) {
        this.routes = [];
        this.app = app;
        this.authMiddleware = authMiddleware;
        this.rateLimitMiddleware = rateLimitMiddleware;
        this.proxyMiddleware = proxyMiddleware;
        // Load routes from config
        this.routes = gateway_config_js_1.gatewayConfig.routes;
    }
    /**
     * Initialize all routes
     */
    RouteManager.prototype.initializeRoutes = function () {
        var _this = this;
        logger.info('Initializing API routes', { count: this.routes.length });
        // Group routes by path for better organization
        var routeGroups = this.groupRoutesByPath(this.routes);
        // Register each route group
        routeGroups.forEach(function (routes, path) {
            _this.registerRouteGroup(path, routes);
        });
        // Register health check endpoint
        this.app.get('/health', function (req, res) {
            res.json({
                status: 'healthy',
                service: 'api-gateway',
                timestamp: new Date().toISOString(),
                version: '1.0.0'
            });
        });
        // Register metrics endpoint if enabled
        if (gateway_config_js_1.gatewayConfig.metrics.enabled) {
            this.registerMetricsEndpoint();
        }
        logger.info('Routes initialized successfully');
    };
    /**
     * Group routes by path for efficient registration
     */
    RouteManager.prototype.groupRoutesByPath = function (routes) {
        var groups = new Map();
        routes.forEach(function (route) {
            var existing = groups.get(route.path) || [];
            existing.push(route);
            groups.set(route.path, existing);
        });
        return groups;
    };
    /**
     * Register a group of routes for the same path
     */
    RouteManager.prototype.registerRouteGroup = function (path, routes) {
        var _this = this;
        var router = (0, express_1.Router)();
        // Apply middlewares and handlers for each method
        routes.forEach(function (route) {
            var methods = route.methods || ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'];
            methods.forEach(function (method) {
                var methodLower = method.toLowerCase();
                var middlewares = [];
                // 1. Rate limiting
                if (route.rateLimit) {
                    middlewares.push(_this.rateLimitMiddleware.dynamic(route.rateLimit.windowMs, route.rateLimit.max));
                }
                else if (route.auth === false) {
                    // Public endpoints get more lenient rate limiting
                    middlewares.push(_this.rateLimitMiddleware.public());
                }
                else {
                    // API endpoints get standard rate limiting
                    middlewares.push(_this.rateLimitMiddleware.api());
                }
                // 2. Authentication
                if (route.auth === true) {
                    middlewares.push(_this.authMiddleware.authenticate);
                }
                else if (route.auth !== false) {
                    // Optional auth for endpoints that don't explicitly disable it
                    middlewares.push(_this.authMiddleware.optionalAuth);
                }
                // 3. Auth forwarding (always)
                middlewares.push(_this.authMiddleware.forwardAuth);
                // 4. Proxy to service
                middlewares.push(_this.proxyMiddleware.routeToService(route));
                // Register route
                router[methodLower].apply(router, __spreadArray([path], middlewares, false));
                logger.debug('Route registered', {
                    method: method,
                    path: path,
                    service: route.service,
                    auth: route.auth,
                    version: route.version
                });
            });
        });
        // Mount router
        this.app.use(router);
    };
    /**
     * Register metrics endpoint
     */
    RouteManager.prototype.registerMetricsEndpoint = function () {
        var _this = this;
        this.app.get(gateway_config_js_1.gatewayConfig.metrics.path, function (req, res) {
            var metrics = {
                gateway: {
                    uptime: process.uptime(),
                    memory: process.memoryUsage(),
                    cpu: process.cpuUsage()
                },
                services: _this.proxyMiddleware.getServiceRegistry().getMetrics(),
                routes: {
                    total: _this.routes.length,
                    byService: _this.getRoutesByService()
                }
            };
            res.json(metrics);
        });
        logger.info('Metrics endpoint registered', { path: gateway_config_js_1.gatewayConfig.metrics.path });
    };
    /**
     * Get route count by service
     */
    RouteManager.prototype.getRoutesByService = function () {
        var counts = {};
        this.routes.forEach(function (route) {
            counts[route.service] = (counts[route.service] || 0) + 1;
        });
        return counts;
    };
    /**
     * Add a new route dynamically
     */
    RouteManager.prototype.addRoute = function (route) {
        this.routes.push(route);
        this.registerRouteGroup(route.path, [route]);
        logger.info('Route added dynamically', {
            path: route.path,
            service: route.service
        });
    };
    /**
     * Remove a route dynamically
     */
    RouteManager.prototype.removeRoute = function (path, service) {
        var index = this.routes.findIndex(function (r) {
            return r.path === path && r.service === service;
        });
        if (index !== -1) {
            this.routes.splice(index, 1);
            logger.info('Route removed', { path: path, service: service });
            return true;
        }
        return false;
    };
    /**
     * Get all registered routes
     */
    RouteManager.prototype.getRoutes = function () {
        return __spreadArray([], this.routes, true);
    };
    /**
     * Get routes for a specific service
     */
    RouteManager.prototype.getServiceRoutes = function (service) {
        return this.routes.filter(function (r) { return r.service === service; });
    };
    return RouteManager;
}());
exports.RouteManager = RouteManager;

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
exports.ServiceRegistry = void 0;
var axios_1 = require("axios");
var gateway_config_js_1 = require("../config/gateway.config.js");
var logger_js_1 = require("../utils/logger.js");
var logger = (0, logger_js_1.createLogger)('ServiceRegistry');
var ServiceRegistry = /** @class */ (function () {
    function ServiceRegistry(redis) {
        this.services = new Map();
        this.healthStatus = new Map();
        this.healthCheckInterval = null;
        this.redis = null;
        this.axiosInstances = new Map();
        this.redis = redis || null;
        this.initializeServices();
    }
    /**
     * Initialize services from configuration
     */
    ServiceRegistry.prototype.initializeServices = function () {
        var _this = this;
        Object.entries(gateway_config_js_1.gatewayConfig.services).forEach(function (_a) {
            var key = _a[0], config = _a[1];
            _this.registerService(key, config);
        });
    };
    /**
     * Register a service
     */
    ServiceRegistry.prototype.registerService = function (key, config) {
        var _this = this;
        this.services.set(key, config);
        // Create axios instance for the service
        var axiosInstance = axios_1.default.create({
            baseURL: config.url,
            timeout: config.timeout || 10000,
            headers: {
                'Content-Type': 'application/json'
            }
        });
        // Add retry logic
        axiosInstance.interceptors.response.use(function (response) { return response; }, function (error) { return __awaiter(_this, void 0, void 0, function () {
            var requestConfig;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        requestConfig = error.config;
                        if (!requestConfig || !requestConfig.retry) {
                            requestConfig.retry = 0;
                        }
                        if (!(requestConfig.retry < (config.retries || 3))) return [3 /*break*/, 2];
                        requestConfig.retry += 1;
                        logger.warn("Retrying request to ".concat(config.name), {
                            attempt: requestConfig.retry,
                            url: requestConfig.url
                        });
                        // Exponential backoff
                        return [4 /*yield*/, new Promise(function (resolve) {
                                return setTimeout(resolve, Math.pow(2, requestConfig.retry) * 1000);
                            })];
                    case 1:
                        // Exponential backoff
                        _a.sent();
                        return [2 /*return*/, axiosInstance(requestConfig)];
                    case 2: return [2 /*return*/, Promise.reject(error)];
                }
            });
        }); });
        this.axiosInstances.set(key, axiosInstance);
        // Set initial health status
        this.healthStatus.set(key, {
            name: config.name,
            status: 'unknown',
            lastCheck: new Date()
        });
        logger.info("Service registered: ".concat(config.name), { key: key, url: config.url });
    };
    /**
     * Get service configuration
     */
    ServiceRegistry.prototype.getService = function (key) {
        return this.services.get(key);
    };
    /**
     * Get axios instance for a service
     */
    ServiceRegistry.prototype.getServiceClient = function (key) {
        return this.axiosInstances.get(key);
    };
    /**
     * Get all services
     */
    ServiceRegistry.prototype.getAllServices = function () {
        return this.services;
    };
    /**
     * Start health checks
     */
    ServiceRegistry.prototype.startHealthChecks = function (intervalMs) {
        var _this = this;
        if (intervalMs === void 0) { intervalMs = 30000; }
        if (this.healthCheckInterval) {
            clearInterval(this.healthCheckInterval);
        }
        // Initial health check
        this.checkAllServices();
        // Periodic health checks
        this.healthCheckInterval = setInterval(function () {
            _this.checkAllServices();
        }, intervalMs);
        logger.info('Health checks started', { interval: "".concat(intervalMs, "ms") });
    };
    /**
     * Stop health checks
     */
    ServiceRegistry.prototype.stopHealthChecks = function () {
        if (this.healthCheckInterval) {
            clearInterval(this.healthCheckInterval);
            this.healthCheckInterval = null;
            logger.info('Health checks stopped');
        }
    };
    /**
     * Check health of all services
     */
    ServiceRegistry.prototype.checkAllServices = function () {
        return __awaiter(this, void 0, void 0, function () {
            var checks, healthData;
            var _this = this;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        checks = Array.from(this.services.entries()).map(function (_a) {
                            var key = _a[0], config = _a[1];
                            return _this.checkServiceHealth(key, config);
                        });
                        return [4 /*yield*/, Promise.all(checks)];
                    case 1:
                        _a.sent();
                        if (!this.redis) return [3 /*break*/, 4];
                        healthData = Object.fromEntries(Array.from(this.healthStatus.entries()).map(function (_a) {
                            var key = _a[0], health = _a[1];
                            return [
                                key,
                                JSON.stringify(health)
                            ];
                        }));
                        return [4 /*yield*/, this.redis.hset('gateway:health', healthData)];
                    case 2:
                        _a.sent();
                        return [4 /*yield*/, this.redis.expire('gateway:health', 60)];
                    case 3:
                        _a.sent(); // Expire after 1 minute
                        _a.label = 4;
                    case 4: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Check health of a single service
     */
    ServiceRegistry.prototype.checkServiceHealth = function (key, config) {
        return __awaiter(this, void 0, void 0, function () {
            var start, client, response, responseTime, error_1;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        start = Date.now();
                        client = this.axiosInstances.get(key);
                        if (!client) {
                            logger.error("No axios instance for service ".concat(key));
                            return [2 /*return*/];
                        }
                        _a.label = 1;
                    case 1:
                        _a.trys.push([1, 3, , 4]);
                        return [4 /*yield*/, client.get(config.healthCheck, {
                                timeout: 5000
                                // Don't retry health checks
                            })];
                    case 2:
                        response = _a.sent();
                        responseTime = Date.now() - start;
                        this.healthStatus.set(key, {
                            name: config.name,
                            status: 'healthy',
                            lastCheck: new Date(),
                            responseTime: responseTime
                        });
                        logger.debug("Health check passed: ".concat(config.name), { responseTime: responseTime });
                        return [3 /*break*/, 4];
                    case 3:
                        error_1 = _a.sent();
                        this.healthStatus.set(key, {
                            name: config.name,
                            status: 'unhealthy',
                            lastCheck: new Date(),
                            error: error_1 instanceof Error ? error_1.message : String(error_1)
                        });
                        logger.error("Health check failed: ".concat(config.name), {
                            error: error_1 instanceof Error ? error_1.message : String(error_1),
                            code: error_1.code
                        });
                        return [3 /*break*/, 4];
                    case 4: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Get health status of a service
     */
    ServiceRegistry.prototype.getServiceHealth = function (key) {
        return this.healthStatus.get(key);
    };
    /**
     * Get health status of all services
     */
    ServiceRegistry.prototype.getAllHealth = function () {
        return this.healthStatus;
    };
    /**
     * Check if a service is healthy
     */
    ServiceRegistry.prototype.isServiceHealthy = function (key) {
        var health = this.healthStatus.get(key);
        return (health === null || health === void 0 ? void 0 : health.status) === 'healthy';
    };
    /**
     * Get healthy services
     */
    ServiceRegistry.prototype.getHealthyServices = function () {
        return Array.from(this.healthStatus.entries())
            .filter(function (_a) {
            var _ = _a[0], health = _a[1];
            return health.status === 'healthy';
        })
            .map(function (_a) {
            var key = _a[0], _ = _a[1];
            return key;
        });
    };
    /**
     * Circuit breaker: Check if we should route to a service
     */
    ServiceRegistry.prototype.shouldRouteToService = function (key) {
        var health = this.healthStatus.get(key);
        if (!health) {
            return false;
        }
        // Simple circuit breaker logic
        if (health.status === 'unhealthy') {
            // Check if enough time has passed to retry
            var timeSinceLastCheck = Date.now() - health.lastCheck.getTime();
            var retryAfter = 30000; // 30 seconds
            if (timeSinceLastCheck > retryAfter) {
                // Try to check health again
                var config = this.services.get(key);
                if (config) {
                    this.checkServiceHealth(key, config);
                }
            }
            return false;
        }
        return true;
    };
    /**
     * Get service metrics
     */
    ServiceRegistry.prototype.getMetrics = function () {
        var metrics = {
            totalServices: this.services.size,
            healthyServices: this.getHealthyServices().length,
            services: {}
        };
        this.healthStatus.forEach(function (health, key) {
            metrics.services[key] = {
                status: health.status,
                lastCheck: health.lastCheck,
                responseTime: health.responseTime,
                error: health.error
            };
        });
        return metrics;
    };
    return ServiceRegistry;
}());
exports.ServiceRegistry = ServiceRegistry;

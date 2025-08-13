"use strict";
var __rest = (this && this.__rest) || function (s, e) {
    var t = {};
    for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
        t[p] = s[p];
    if (s != null && typeof Object.getOwnPropertySymbols === "function")
        for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) {
            if (e.indexOf(p[i]) < 0 && Object.prototype.propertyIsEnumerable.call(s, p[i]))
                t[p[i]] = s[p[i]];
        }
    return t;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.requestLogger = exports.createLogger = exports.logger = void 0;
var winston_1 = require("winston");
var gateway_config_js_1 = require("../config/gateway.config.js");
var _a = winston_1.default.format, combine = _a.combine, timestamp = _a.timestamp, printf = _a.printf, colorize = _a.colorize, errors = _a.errors;
// Custom log format
var logFormat = printf(function (_a) {
    var level = _a.level, message = _a.message, timestamp = _a.timestamp, stack = _a.stack, service = _a.service, metadata = __rest(_a, ["level", "message", "timestamp", "stack", "service"]);
    var log = "".concat(timestamp, " [").concat(level, "]");
    if (service) {
        log += " [".concat(service, "]");
    }
    log += ": ".concat(message);
    if (Object.keys(metadata).length > 0) {
        log += " ".concat(JSON.stringify(metadata));
    }
    if (stack) {
        log += "\n".concat(stack);
    }
    return log;
});
// Create logger instance
exports.logger = winston_1.default.createLogger({
    level: gateway_config_js_1.gatewayConfig.logging.level,
    format: combine(errors({ stack: true }), timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }), logFormat),
    defaultMeta: { service: 'api-gateway' },
    transports: [
        // Console transport
        new winston_1.default.transports.Console({
            format: combine(colorize({ all: true }), errors({ stack: true }), timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }), logFormat)
        })
    ]
});
// Add file transport if configured
if (gateway_config_js_1.gatewayConfig.logging.file) {
    exports.logger.add(new winston_1.default.transports.File({
        filename: gateway_config_js_1.gatewayConfig.logging.file,
        maxsize: 10485760, // 10MB
        maxFiles: 5
    }));
}
// Create child loggers for different components
var createLogger = function (component) {
    return exports.logger.child({ component: component });
};
exports.createLogger = createLogger;
// Request logger middleware
var requestLogger = function (req, res, next) {
    var start = Date.now();
    // Log request
    exports.logger.info('Incoming request', {
        method: req.method,
        url: req.url,
        ip: req.ip,
        userAgent: req.get('user-agent')
    });
    // Log response
    res.on('finish', function () {
        var duration = Date.now() - start;
        exports.logger.info('Request completed', {
            method: req.method,
            url: req.url,
            statusCode: res.statusCode,
            duration: "".concat(duration, "ms")
        });
    });
    next();
};
exports.requestLogger = requestLogger;

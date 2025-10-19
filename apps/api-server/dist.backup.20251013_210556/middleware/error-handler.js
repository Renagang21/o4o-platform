"use strict";
/**
 * Global Error Handler Middleware
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.notFoundHandler = exports.asyncHandler = exports.errorHandler = void 0;
const api_error_1 = require("../utils/api-error");
const env_validator_1 = require("../utils/env-validator");
const logger_1 = __importDefault(require("../utils/logger"));
function errorHandler(error, req, res, next) {
    // Log error
    logger_1.default.error({
        message: error.message,
        stack: error.stack,
        path: req.path,
        method: req.method,
        body: req.body,
        query: req.query,
        ip: req.ip,
    });
    // Default error
    let statusCode = 500;
    let message = 'Internal server error';
    let code = 'INTERNAL_ERROR';
    let details;
    // Handle ApiError
    if (error instanceof api_error_1.ApiError) {
        statusCode = error.statusCode;
        message = error.message;
        code = error.code;
        details = error.details;
    }
    // Handle validation errors from express-validator
    else if (error.array && typeof error.array === 'function') {
        statusCode = 400;
        message = 'Validation failed';
        code = 'VALIDATION_ERROR';
        details = error.array();
    }
    // Handle JWT errors
    else if (error.name === 'JsonWebTokenError') {
        statusCode = 401;
        message = 'Invalid token';
        code = 'INVALID_TOKEN';
    }
    else if (error.name === 'TokenExpiredError') {
        statusCode = 401;
        message = 'Token expired';
        code = 'TOKEN_EXPIRED';
    }
    // Handle TypeORM errors
    else if (error.name === 'EntityNotFoundError') {
        statusCode = 404;
        message = 'Entity not found';
        code = 'ENTITY_NOT_FOUND';
    }
    else if (error.name === 'QueryFailedError') {
        statusCode = 500;
        message = 'Database query failed';
        code = 'QUERY_FAILED';
        // Only show details in development
        if (env_validator_1.env.isDevelopment()) {
            details = error.message;
        }
    }
    // Send response
    const response = {
        success: false,
        error: message,
        code,
    };
    // Add details in development mode
    if (env_validator_1.env.isDevelopment() && details) {
        response.details = details;
    }
    // Add stack trace in development
    if (env_validator_1.env.isDevelopment() && error.stack) {
        response.stack = error.stack.split('\n');
    }
    res.status(statusCode).json(response);
}
exports.errorHandler = errorHandler;
// Async error wrapper
function asyncHandler(fn) {
    return (req, res, next) => {
        Promise.resolve(fn(req, res, next)).catch(next);
    };
}
exports.asyncHandler = asyncHandler;
// Not found handler
function notFoundHandler(req, res) {
    res.status(404).json({
        success: false,
        error: 'Route not found',
        code: 'ROUTE_NOT_FOUND',
        path: req.path,
    });
}
exports.notFoundHandler = notFoundHandler;
//# sourceMappingURL=error-handler.js.map
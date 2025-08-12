"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.InternalServerError = exports.TooManyRequestsError = exports.ConflictError = exports.NotFoundError = exports.ForbiddenError = exports.UnauthorizedError = exports.BadRequestError = exports.asyncHandler = exports.errorHandler = exports.ApiError = void 0;
const typeorm_1 = require("typeorm");
const jsonwebtoken_1 = require("jsonwebtoken");
const simpleLogger_1 = __importDefault(require("../utils/simpleLogger"));
// Custom error class for API errors
class ApiError extends Error {
    constructor(statusCode, message, code, isOperational = true) {
        super(message);
        this.statusCode = statusCode;
        this.code = code;
        this.isOperational = isOperational;
        Error.captureStackTrace(this, this.constructor);
    }
}
exports.ApiError = ApiError;
// Error handler middleware
const errorHandler = (err, req, res, _next) => {
    var _a;
    let statusCode = 500;
    let message = 'Internal Server Error';
    let code = 'INTERNAL_ERROR';
    // Handle known error types
    if (err instanceof ApiError) {
        statusCode = err.statusCode;
        message = err.message;
        code = err.code || code;
    }
    else if (err instanceof jsonwebtoken_1.TokenExpiredError) {
        statusCode = 401;
        message = 'Token has expired';
        code = 'TOKEN_EXPIRED';
    }
    else if (err instanceof jsonwebtoken_1.JsonWebTokenError) {
        statusCode = 401;
        message = 'Invalid token';
        code = 'INVALID_TOKEN';
    }
    else if (err instanceof typeorm_1.QueryFailedError) {
        statusCode = 400;
        message = 'Database query failed';
        code = 'DATABASE_ERROR';
        // Handle specific database errors
        const dbError = err;
        if (dbError.code === '23505') {
            message = 'Duplicate entry';
            code = 'DUPLICATE_ENTRY';
        }
        else if (dbError.code === '23503') {
            message = 'Foreign key constraint violation';
            code = 'FOREIGN_KEY_ERROR';
        }
    }
    else if (err.name === 'ValidationError') {
        statusCode = 400;
        message = err.message;
        code = 'VALIDATION_ERROR';
    }
    else if (err.name === 'CastError') {
        statusCode = 400;
        message = 'Invalid data format';
        code = 'CAST_ERROR';
    }
    // Create error response
    const errorResponse = {
        success: false,
        error: {
            message,
            code,
            statusCode,
            timestamp: new Date().toISOString(),
            path: req.path,
            method: req.method
        }
    };
    // Add stack trace in development
    if (process.env.NODE_ENV === 'development') {
        errorResponse.error.stack = err.stack;
    }
    // Log error with structured logging
    simpleLogger_1.default.error(`API Error ${statusCode}: ${message}`, {
        code,
        path: req.path,
        method: req.method,
        ip: req.ip,
        userAgent: req.get('user-agent'),
        stack: err.stack
    });
    // Set CORS headers for error responses
    const origin = req.headers.origin;
    const corsOrigins = ((_a = process.env.CORS_ORIGIN) === null || _a === void 0 ? void 0 : _a.split(',')) || [];
    if (origin && corsOrigins.includes(origin)) {
        res.setHeader('Access-Control-Allow-Origin', origin);
        res.setHeader('Access-Control-Allow-Credentials', 'true');
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
    }
    // Send error response
    res.status(statusCode).json(errorResponse);
};
exports.errorHandler = errorHandler;
// Async error wrapper for route handlers
const asyncHandler = (fn) => (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
};
exports.asyncHandler = asyncHandler;
// Common error creators
const BadRequestError = (message, code) => new ApiError(400, message, code || 'BAD_REQUEST');
exports.BadRequestError = BadRequestError;
const UnauthorizedError = (message = 'Unauthorized', code) => new ApiError(401, message, code || 'UNAUTHORIZED');
exports.UnauthorizedError = UnauthorizedError;
const ForbiddenError = (message = 'Forbidden', code) => new ApiError(403, message, code || 'FORBIDDEN');
exports.ForbiddenError = ForbiddenError;
const NotFoundError = (message = 'Resource not found', code) => new ApiError(404, message, code || 'NOT_FOUND');
exports.NotFoundError = NotFoundError;
const ConflictError = (message, code) => new ApiError(409, message, code || 'CONFLICT');
exports.ConflictError = ConflictError;
const TooManyRequestsError = (message = 'Too many requests', code) => new ApiError(429, message, code || 'RATE_LIMIT_EXCEEDED');
exports.TooManyRequestsError = TooManyRequestsError;
const InternalServerError = (message = 'Internal server error', code) => new ApiError(500, message, code || 'INTERNAL_ERROR');
exports.InternalServerError = InternalServerError;
//# sourceMappingURL=errorHandler.js.map
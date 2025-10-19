"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.asyncHandler = exports.errorHandler = exports.createInsufficientInventoryError = exports.createCommissionAlreadyProcessedError = exports.createSupplierNotApprovedError = exports.createVendorNotActiveError = exports.createConflictError = exports.createValidationError = exports.createNotFoundError = exports.createForbiddenError = exports.createAuthError = exports.AppError = exports.ErrorCode = void 0;
const logger_1 = __importDefault(require("../utils/logger"));
var ErrorCode;
(function (ErrorCode) {
    // Authentication & Authorization
    ErrorCode["UNAUTHORIZED"] = "UNAUTHORIZED";
    ErrorCode["FORBIDDEN"] = "FORBIDDEN";
    ErrorCode["TOKEN_EXPIRED"] = "TOKEN_EXPIRED";
    ErrorCode["INVALID_TOKEN"] = "INVALID_TOKEN";
    ErrorCode["INSUFFICIENT_PERMISSIONS"] = "INSUFFICIENT_PERMISSIONS";
    // Validation
    ErrorCode["VALIDATION_ERROR"] = "VALIDATION_ERROR";
    ErrorCode["MISSING_REQUIRED_FIELDS"] = "MISSING_REQUIRED_FIELDS";
    ErrorCode["INVALID_INPUT_FORMAT"] = "INVALID_INPUT_FORMAT";
    ErrorCode["DUPLICATE_ENTRY"] = "DUPLICATE_ENTRY";
    // Resource Management
    ErrorCode["RESOURCE_NOT_FOUND"] = "RESOURCE_NOT_FOUND";
    ErrorCode["RESOURCE_ALREADY_EXISTS"] = "RESOURCE_ALREADY_EXISTS";
    ErrorCode["RESOURCE_CONFLICT"] = "RESOURCE_CONFLICT";
    ErrorCode["RESOURCE_LOCKED"] = "RESOURCE_LOCKED";
    // Business Logic
    ErrorCode["VENDOR_NOT_ACTIVE"] = "VENDOR_NOT_ACTIVE";
    ErrorCode["SUPPLIER_NOT_APPROVED"] = "SUPPLIER_NOT_APPROVED";
    ErrorCode["COMMISSION_ALREADY_PROCESSED"] = "COMMISSION_ALREADY_PROCESSED";
    ErrorCode["SETTLEMENT_ALREADY_PAID"] = "SETTLEMENT_ALREADY_PAID";
    ErrorCode["INSUFFICIENT_INVENTORY"] = "INSUFFICIENT_INVENTORY";
    ErrorCode["INVALID_COMMISSION_PERIOD"] = "INVALID_COMMISSION_PERIOD";
    // External Services
    ErrorCode["PAYMENT_SERVICE_ERROR"] = "PAYMENT_SERVICE_ERROR";
    ErrorCode["EMAIL_SERVICE_ERROR"] = "EMAIL_SERVICE_ERROR";
    ErrorCode["REDIS_CONNECTION_ERROR"] = "REDIS_CONNECTION_ERROR";
    ErrorCode["DATABASE_CONNECTION_ERROR"] = "DATABASE_CONNECTION_ERROR";
    // System
    ErrorCode["INTERNAL_SERVER_ERROR"] = "INTERNAL_SERVER_ERROR";
    ErrorCode["SERVICE_UNAVAILABLE"] = "SERVICE_UNAVAILABLE";
    ErrorCode["RATE_LIMIT_EXCEEDED"] = "RATE_LIMIT_EXCEEDED";
    ErrorCode["REQUEST_TIMEOUT"] = "REQUEST_TIMEOUT";
})(ErrorCode || (exports.ErrorCode = ErrorCode = {}));
class AppError extends Error {
    constructor(message, statusCode = 500, errorCode = ErrorCode.INTERNAL_SERVER_ERROR, isOperational = true, details) {
        super(message);
        this.statusCode = statusCode;
        this.errorCode = errorCode;
        this.isOperational = isOperational;
        this.details = details;
        this.timestamp = new Date();
        // Maintain proper stack trace
        Error.captureStackTrace(this, this.constructor);
    }
}
exports.AppError = AppError;
// Predefined error creators
const createAuthError = (message = 'Authentication required') => new AppError(message, 401, ErrorCode.UNAUTHORIZED);
exports.createAuthError = createAuthError;
const createForbiddenError = (message = 'Access denied') => new AppError(message, 403, ErrorCode.FORBIDDEN);
exports.createForbiddenError = createForbiddenError;
const createNotFoundError = (resource = 'Resource') => new AppError(`${resource} not found`, 404, ErrorCode.RESOURCE_NOT_FOUND);
exports.createNotFoundError = createNotFoundError;
const createValidationError = (message, details) => new AppError(message, 400, ErrorCode.VALIDATION_ERROR, true, details);
exports.createValidationError = createValidationError;
const createConflictError = (message, details) => new AppError(message, 409, ErrorCode.RESOURCE_CONFLICT, true, details);
exports.createConflictError = createConflictError;
const createVendorNotActiveError = () => new AppError('Vendor account is not active', 403, ErrorCode.VENDOR_NOT_ACTIVE);
exports.createVendorNotActiveError = createVendorNotActiveError;
const createSupplierNotApprovedError = () => new AppError('Supplier is not approved', 403, ErrorCode.SUPPLIER_NOT_APPROVED);
exports.createSupplierNotApprovedError = createSupplierNotApprovedError;
const createCommissionAlreadyProcessedError = () => new AppError('Commission already processed for this period', 409, ErrorCode.COMMISSION_ALREADY_PROCESSED);
exports.createCommissionAlreadyProcessedError = createCommissionAlreadyProcessedError;
const createInsufficientInventoryError = (sku, available, requested) => new AppError(`Insufficient inventory for ${sku}`, 400, ErrorCode.INSUFFICIENT_INVENTORY, true, { sku, available, requested });
exports.createInsufficientInventoryError = createInsufficientInventoryError;
// Main error handler middleware
const errorHandler = (err, req, res, next) => {
    var _a, _b;
    let error = err;
    // Convert known errors to AppError
    if (!(err instanceof AppError)) {
        if (err.name === 'ValidationError') {
            error = (0, exports.createValidationError)('Validation failed', err.message);
        }
        else if (err.name === 'CastError') {
            error = (0, exports.createValidationError)('Invalid ID format');
        }
        else if (err.name === 'JsonWebTokenError') {
            error = (0, exports.createAuthError)('Invalid token');
        }
        else if (err.name === 'TokenExpiredError') {
            error = new AppError('Token expired', 401, ErrorCode.TOKEN_EXPIRED);
        }
        else if (err.message && err.message.includes('duplicate key')) {
            error = (0, exports.createConflictError)('Resource already exists');
        }
        else {
            // Unknown error - create generic internal server error
            error = new AppError('Internal server error', 500, ErrorCode.INTERNAL_SERVER_ERROR, false);
        }
    }
    // Generate request ID for tracking
    const requestId = req.headers['x-request-id'] ||
        `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    // Log error details
    const errorContext = {
        requestId,
        userId: (_a = req.user) === null || _a === void 0 ? void 0 : _a.id,
        userRole: (_b = req.user) === null || _b === void 0 ? void 0 : _b.role,
        method: req.method,
        path: req.path,
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        errorCode: error.errorCode,
        statusCode: error.statusCode,
        message: error.message,
        stack: error.stack,
        details: error.details,
        isOperational: error.isOperational
    };
    // Log based on severity
    if (error.statusCode >= 500) {
        logger_1.default.error('Server Error', errorContext);
    }
    else if (error.statusCode >= 400) {
        logger_1.default.warn('Client Error', errorContext);
    }
    // Set error message in headers for performance tracking
    res.set('X-Error-Message', error.message);
    // Build error response
    const errorResponse = {
        success: false,
        errorCode: error.errorCode,
        message: error.message,
        timestamp: error.timestamp.toISOString(),
        path: req.path,
        method: req.method,
        requestId
    };
    // Add details in development or for operational errors
    if (process.env.NODE_ENV === 'development' || error.isOperational) {
        errorResponse.details = error.details;
    }
    // Add stack trace in development
    if (process.env.NODE_ENV === 'development') {
        errorResponse.stack = error.stack;
    }
    res.status(error.statusCode).json(errorResponse);
};
exports.errorHandler = errorHandler;
// Async error catcher utility
const asyncHandler = (fn) => {
    return (req, res, next) => {
        Promise.resolve(fn(req, res, next)).catch(next);
    };
};
exports.asyncHandler = asyncHandler;
// Handle unhandled promise rejections
process.on('unhandledRejection', (reason) => {
    logger_1.default.error('Unhandled Promise Rejection', {
        reason: reason.message || reason,
        stack: reason.stack
    });
    // Close server gracefully
    process.exit(1);
});
// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
    logger_1.default.error('Uncaught Exception', {
        message: error.message,
        stack: error.stack
    });
    // Close server gracefully
    process.exit(1);
});
exports.default = exports.errorHandler;
//# sourceMappingURL=errorHandler.middleware.js.map
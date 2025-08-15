"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleValidationError = exports.logError = exports.asyncHandler = void 0;
/**
 * Async error handler wrapper
 */
const asyncHandler = (fn) => {
    return (req, res, next) => {
        Promise.resolve(fn(req, res, next)).catch(next);
    };
};
exports.asyncHandler = asyncHandler;
/**
 * Global error logger
 */
const logError = (error, context) => {
    const timestamp = new Date().toISOString();
    const errorLog = {
        timestamp,
        context,
        message: error.message,
        stack: error.stack,
    };
    if (process.env.NODE_ENV === 'development') {
        console.error('[ERROR]', errorLog);
    }
    else {
        // In production, could send to monitoring service
        console.error(`[${timestamp}] ${context || 'Unknown'}: ${error.message}`);
    }
};
exports.logError = logError;
/**
 * Validation error handler
 */
const handleValidationError = (errors) => {
    const formattedErrors = errors.map(err => ({
        field: err.param || err.path,
        message: err.msg || err.message,
    }));
    return {
        success: false,
        error: 'Validation failed',
        errors: formattedErrors,
    };
};
exports.handleValidationError = handleValidationError;
//# sourceMappingURL=errorBoundary.js.map
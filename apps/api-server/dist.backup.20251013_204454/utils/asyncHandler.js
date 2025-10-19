"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.asyncMiddleware = exports.asyncHandler = void 0;
/**
 * Async handler wrapper for Express route handlers
 * Automatically catches async errors and passes them to the error handler
 */
function asyncHandler(fn) {
    return (req, res, next) => {
        Promise.resolve(fn(req, res, next)).catch(next);
    };
}
exports.asyncHandler = asyncHandler;
/**
 * Async handler wrapper for Express middleware
 * Automatically catches async errors and passes them to the error handler
 */
function asyncMiddleware(fn) {
    return (req, res, next) => {
        Promise.resolve(fn(req, res, next)).catch(next);
    };
}
exports.asyncMiddleware = asyncMiddleware;
exports.default = asyncHandler;
//# sourceMappingURL=asyncHandler.js.map
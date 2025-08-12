"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.internalError = exports.tooManyRequests = exports.conflict = exports.notFound = exports.forbidden = exports.unauthorized = exports.badRequest = exports.noContent = exports.created = exports.ok = exports.sendPaginatedResponse = exports.sendError = exports.sendSuccess = void 0;
// Success response helper
const sendSuccess = (res, data, message, statusCode = 200, meta) => {
    const response = {
        success: true,
        data,
        timestamp: new Date().toISOString()
    };
    if (message) {
        response.message = message;
    }
    if (meta) {
        response.meta = meta;
    }
    return res.status(statusCode).json(response);
};
exports.sendSuccess = sendSuccess;
// Error response helper (for manual error responses)
const sendError = (res, message, code = 'ERROR', statusCode = 500, details) => {
    const response = {
        success: false,
        error: {
            message,
            code,
            statusCode,
            timestamp: new Date().toISOString()
        }
    };
    if (details) {
        response.error.details = details;
    }
    return res.status(statusCode).json(response);
};
exports.sendError = sendError;
// Pagination response helper
const sendPaginatedResponse = (res, data, page, limit, total, message) => {
    const totalPages = Math.ceil(total / limit);
    return (0, exports.sendSuccess)(res, data, message, 200, {
        page,
        limit,
        total,
        totalPages
    });
};
exports.sendPaginatedResponse = sendPaginatedResponse;
// Common response shortcuts
const ok = (res, data, message) => (0, exports.sendSuccess)(res, data, message, 200);
exports.ok = ok;
const created = (res, data, message = 'Resource created successfully') => (0, exports.sendSuccess)(res, data, message, 201);
exports.created = created;
const noContent = (res) => res.status(204).send();
exports.noContent = noContent;
const badRequest = (res, message, details) => (0, exports.sendError)(res, message, 'BAD_REQUEST', 400, details);
exports.badRequest = badRequest;
const unauthorized = (res, message = 'Unauthorized') => (0, exports.sendError)(res, message, 'UNAUTHORIZED', 401);
exports.unauthorized = unauthorized;
const forbidden = (res, message = 'Forbidden') => (0, exports.sendError)(res, message, 'FORBIDDEN', 403);
exports.forbidden = forbidden;
const notFound = (res, message = 'Resource not found') => (0, exports.sendError)(res, message, 'NOT_FOUND', 404);
exports.notFound = notFound;
const conflict = (res, message) => (0, exports.sendError)(res, message, 'CONFLICT', 409);
exports.conflict = conflict;
const tooManyRequests = (res, message = 'Too many requests') => (0, exports.sendError)(res, message, 'RATE_LIMIT_EXCEEDED', 429);
exports.tooManyRequests = tooManyRequests;
const internalError = (res, message = 'Internal server error') => (0, exports.sendError)(res, message, 'INTERNAL_ERROR', 500);
exports.internalError = internalError;
//# sourceMappingURL=apiResponse.js.map
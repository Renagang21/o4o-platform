"use strict";
/**
 * Standardized API Response Types
 * All API responses should follow this structure
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.createPaginatedResponse = exports.createErrorResponse = exports.createSuccessResponse = void 0;
/**
 * Helper functions to create standardized responses
 */
const createSuccessResponse = (data, message) => ({
    success: true,
    data,
    message
});
exports.createSuccessResponse = createSuccessResponse;
const createErrorResponse = (error, code) => ({
    success: false,
    error,
    code
});
exports.createErrorResponse = createErrorResponse;
const createPaginatedResponse = (data, total, page, limit) => ({
    success: true,
    data,
    total,
    page,
    limit,
    hasNext: page * limit < total,
    hasPrev: page > 1
});
exports.createPaginatedResponse = createPaginatedResponse;
//# sourceMappingURL=api-response.js.map
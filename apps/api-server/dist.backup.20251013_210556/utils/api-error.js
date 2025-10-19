"use strict";
/**
 * Standardized API Error Classes
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleDatabaseError = exports.EntityNotFoundError = exports.DatabaseError = exports.ServiceUnavailableError = exports.InternalServerError = exports.ValidationError = exports.ConflictError = exports.NotFoundError = exports.ForbiddenError = exports.UnauthorizedError = exports.BadRequestError = exports.ApiError = void 0;
class ApiError extends Error {
    constructor(statusCode, message, code, isOperational = true, details) {
        super(message);
        Object.setPrototypeOf(this, new.target.prototype);
        this.statusCode = statusCode;
        this.code = code;
        this.isOperational = isOperational;
        this.details = details;
        Error.captureStackTrace(this);
    }
}
exports.ApiError = ApiError;
// Common API Errors
class BadRequestError extends ApiError {
    constructor(message = 'Bad Request', code = 'BAD_REQUEST', details) {
        super(400, message, code, true, details);
    }
}
exports.BadRequestError = BadRequestError;
class UnauthorizedError extends ApiError {
    constructor(message = 'Unauthorized', code = 'UNAUTHORIZED') {
        super(401, message, code, true);
    }
}
exports.UnauthorizedError = UnauthorizedError;
class ForbiddenError extends ApiError {
    constructor(message = 'Forbidden', code = 'FORBIDDEN') {
        super(403, message, code, true);
    }
}
exports.ForbiddenError = ForbiddenError;
class NotFoundError extends ApiError {
    constructor(resource = 'Resource', code = 'NOT_FOUND') {
        super(404, `${resource} not found`, code, true);
    }
}
exports.NotFoundError = NotFoundError;
class ConflictError extends ApiError {
    constructor(message = 'Conflict', code = 'CONFLICT', details) {
        super(409, message, code, true, details);
    }
}
exports.ConflictError = ConflictError;
class ValidationError extends ApiError {
    constructor(message = 'Validation failed', details) {
        super(422, message, 'VALIDATION_ERROR', true, details);
    }
}
exports.ValidationError = ValidationError;
class InternalServerError extends ApiError {
    constructor(message = 'Internal server error', code = 'INTERNAL_ERROR') {
        super(500, message, code, false);
    }
}
exports.InternalServerError = InternalServerError;
class ServiceUnavailableError extends ApiError {
    constructor(message = 'Service temporarily unavailable', code = 'SERVICE_UNAVAILABLE') {
        super(503, message, code, true);
    }
}
exports.ServiceUnavailableError = ServiceUnavailableError;
// Database specific errors
class DatabaseError extends ApiError {
    constructor(message = 'Database error', code = 'DATABASE_ERROR', details) {
        super(500, message, code, false, details);
    }
}
exports.DatabaseError = DatabaseError;
class EntityNotFoundError extends NotFoundError {
    constructor(entity, id) {
        const message = id ? `${entity} with id ${id} not found` : `${entity} not found`;
        super(message, 'ENTITY_NOT_FOUND');
    }
}
exports.EntityNotFoundError = EntityNotFoundError;
// Helper function to handle TypeORM errors
function handleDatabaseError(error) {
    // PostgreSQL error codes
    if (error.code === '23505') {
        return new ConflictError('Duplicate entry', 'DUPLICATE_ENTRY', {
            field: error.detail
        });
    }
    if (error.code === '23503') {
        return new BadRequestError('Foreign key constraint violation', 'FK_VIOLATION');
    }
    if (error.code === '42P01') {
        return new DatabaseError('Table does not exist', 'TABLE_NOT_FOUND');
    }
    if (error.code === '42501') {
        return new DatabaseError('Insufficient permissions', 'PERMISSION_DENIED');
    }
    // TypeORM specific
    if (error.name === 'EntityNotFoundError') {
        return new EntityNotFoundError('Entity');
    }
    if (error.name === 'QueryFailedError') {
        return new DatabaseError(error.message, 'QUERY_FAILED');
    }
    return new DatabaseError('Unknown database error', 'DATABASE_ERROR');
}
exports.handleDatabaseError = handleDatabaseError;
//# sourceMappingURL=api-error.js.map
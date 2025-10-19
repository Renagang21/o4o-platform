"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateUUIDOrThrow = exports.validateUUID = exports.sanitizeString = exports.validateAllowedValues = exports.validateStringLength = exports.validateRange = exports.validatePhoneNumber = exports.validateEmail = exports.createBadRequestError = exports.createConflictError = exports.createInternalServerError = exports.createUnauthorizedError = exports.createForbiddenError = exports.createNotFoundError = exports.createValidationError = exports.validateRequiredFields = exports.BadRequestError = exports.ConflictError = exports.InternalServerError = exports.UnauthorizedError = exports.ForbiddenError = exports.NotFoundError = exports.ValidationError = void 0;
class ValidationError extends Error {
    constructor(message) {
        super(message);
        this.name = 'ValidationError';
    }
}
exports.ValidationError = ValidationError;
class NotFoundError extends Error {
    constructor(message) {
        super(message);
        this.name = 'NotFoundError';
    }
}
exports.NotFoundError = NotFoundError;
class ForbiddenError extends Error {
    constructor(message) {
        super(message);
        this.name = 'ForbiddenError';
    }
}
exports.ForbiddenError = ForbiddenError;
class UnauthorizedError extends Error {
    constructor(message) {
        super(message);
        this.name = 'UnauthorizedError';
    }
}
exports.UnauthorizedError = UnauthorizedError;
class InternalServerError extends Error {
    constructor(message) {
        super(message);
        this.name = 'InternalServerError';
    }
}
exports.InternalServerError = InternalServerError;
class ConflictError extends Error {
    constructor(message) {
        super(message);
        this.name = 'ConflictError';
    }
}
exports.ConflictError = ConflictError;
class BadRequestError extends Error {
    constructor(message) {
        super(message);
        this.name = 'BadRequestError';
    }
}
exports.BadRequestError = BadRequestError;
/**
 * Validate that required fields are present in the request body
 */
function validateRequiredFields(body, requiredFields) {
    const missingFields = requiredFields.filter(field => !body[field]);
    if (missingFields.length > 0) {
        throw new ValidationError(`Missing required fields: ${missingFields.join(', ')}`);
    }
}
exports.validateRequiredFields = validateRequiredFields;
/**
 * Create a validation error with a custom message
 */
function createValidationError(message) {
    return new ValidationError(message);
}
exports.createValidationError = createValidationError;
/**
 * Create a not found error with a custom message
 */
function createNotFoundError(message) {
    return new NotFoundError(message);
}
exports.createNotFoundError = createNotFoundError;
/**
 * Create a forbidden error with a custom message
 */
function createForbiddenError(message) {
    return new ForbiddenError(message);
}
exports.createForbiddenError = createForbiddenError;
/**
 * Create an unauthorized error with a custom message
 */
function createUnauthorizedError(message) {
    return new UnauthorizedError(message);
}
exports.createUnauthorizedError = createUnauthorizedError;
/**
 * Create an internal server error with a custom message
 */
function createInternalServerError(message) {
    return new InternalServerError(message);
}
exports.createInternalServerError = createInternalServerError;
/**
 * Create a conflict error with a custom message
 */
function createConflictError(message) {
    return new ConflictError(message);
}
exports.createConflictError = createConflictError;
/**
 * Create a bad request error with a custom message
 */
function createBadRequestError(message) {
    return new BadRequestError(message);
}
exports.createBadRequestError = createBadRequestError;
/**
 * Validate email format
 */
function validateEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}
exports.validateEmail = validateEmail;
/**
 * Validate phone number format (basic validation)
 */
function validatePhoneNumber(phone) {
    const phoneRegex = /^\+?[\d\s\-()]{10,}$/;
    return phoneRegex.test(phone);
}
exports.validatePhoneNumber = validatePhoneNumber;
/**
 * Validate that a value is within a specific range
 */
function validateRange(value, min, max, fieldName) {
    if (value < min || value > max) {
        throw new ValidationError(`${fieldName} must be between ${min} and ${max}`);
    }
}
exports.validateRange = validateRange;
/**
 * Validate that a string has a minimum and maximum length
 */
function validateStringLength(value, min, max, fieldName) {
    if (value.length < min || value.length > max) {
        throw new ValidationError(`${fieldName} must be between ${min} and ${max} characters`);
    }
}
exports.validateStringLength = validateStringLength;
/**
 * Validate that a value is one of the allowed values
 */
function validateAllowedValues(value, allowedValues, fieldName) {
    if (!allowedValues.includes(value)) {
        throw new ValidationError(`${fieldName} must be one of: ${allowedValues.join(', ')}`);
    }
}
exports.validateAllowedValues = validateAllowedValues;
/**
 * Sanitize string input to prevent XSS
 */
function sanitizeString(input) {
    return input
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#x27;')
        .replace(/\//g, '&#x2F;');
}
exports.sanitizeString = sanitizeString;
/**
 * Validate UUID format
 */
function validateUUID(uuid) {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidRegex.test(uuid);
}
exports.validateUUID = validateUUID;
/**
 * Create a validation error for invalid UUID
 */
function validateUUIDOrThrow(uuid, fieldName) {
    if (!validateUUID(uuid)) {
        throw new ValidationError(`${fieldName} must be a valid UUID`);
    }
}
exports.validateUUIDOrThrow = validateUUIDOrThrow;
//# sourceMappingURL=errorUtils.js.map
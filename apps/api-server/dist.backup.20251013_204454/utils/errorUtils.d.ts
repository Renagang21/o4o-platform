export declare class ValidationError extends Error {
    constructor(message: string);
}
export declare class NotFoundError extends Error {
    constructor(message: string);
}
export declare class ForbiddenError extends Error {
    constructor(message: string);
}
export declare class UnauthorizedError extends Error {
    constructor(message: string);
}
export declare class InternalServerError extends Error {
    constructor(message: string);
}
export declare class ConflictError extends Error {
    constructor(message: string);
}
export declare class BadRequestError extends Error {
    constructor(message: string);
}
/**
 * Validate that required fields are present in the request body
 */
export declare function validateRequiredFields(body: any, requiredFields: string[]): void;
/**
 * Create a validation error with a custom message
 */
export declare function createValidationError(message: string): ValidationError;
/**
 * Create a not found error with a custom message
 */
export declare function createNotFoundError(message: string): NotFoundError;
/**
 * Create a forbidden error with a custom message
 */
export declare function createForbiddenError(message: string): ForbiddenError;
/**
 * Create an unauthorized error with a custom message
 */
export declare function createUnauthorizedError(message: string): UnauthorizedError;
/**
 * Create an internal server error with a custom message
 */
export declare function createInternalServerError(message: string): InternalServerError;
/**
 * Create a conflict error with a custom message
 */
export declare function createConflictError(message: string): ConflictError;
/**
 * Create a bad request error with a custom message
 */
export declare function createBadRequestError(message: string): BadRequestError;
/**
 * Validate email format
 */
export declare function validateEmail(email: string): boolean;
/**
 * Validate phone number format (basic validation)
 */
export declare function validatePhoneNumber(phone: string): boolean;
/**
 * Validate that a value is within a specific range
 */
export declare function validateRange(value: number, min: number, max: number, fieldName: string): void;
/**
 * Validate that a string has a minimum and maximum length
 */
export declare function validateStringLength(value: string, min: number, max: number, fieldName: string): void;
/**
 * Validate that a value is one of the allowed values
 */
export declare function validateAllowedValues<T>(value: T, allowedValues: T[], fieldName: string): void;
/**
 * Sanitize string input to prevent XSS
 */
export declare function sanitizeString(input: string): string;
/**
 * Validate UUID format
 */
export declare function validateUUID(uuid: string): boolean;
/**
 * Create a validation error for invalid UUID
 */
export declare function validateUUIDOrThrow(uuid: string, fieldName: string): void;
//# sourceMappingURL=errorUtils.d.ts.map
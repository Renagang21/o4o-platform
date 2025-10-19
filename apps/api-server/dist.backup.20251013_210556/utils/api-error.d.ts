/**
 * Standardized API Error Classes
 */
export declare class ApiError extends Error {
    readonly statusCode: number;
    readonly code: string;
    readonly isOperational: boolean;
    readonly details?: any;
    constructor(statusCode: number, message: string, code: string, isOperational?: boolean, details?: any);
}
export declare class BadRequestError extends ApiError {
    constructor(message?: string, code?: string, details?: any);
}
export declare class UnauthorizedError extends ApiError {
    constructor(message?: string, code?: string);
}
export declare class ForbiddenError extends ApiError {
    constructor(message?: string, code?: string);
}
export declare class NotFoundError extends ApiError {
    constructor(resource?: string, code?: string);
}
export declare class ConflictError extends ApiError {
    constructor(message?: string, code?: string, details?: any);
}
export declare class ValidationError extends ApiError {
    constructor(message?: string, details?: any);
}
export declare class InternalServerError extends ApiError {
    constructor(message?: string, code?: string);
}
export declare class ServiceUnavailableError extends ApiError {
    constructor(message?: string, code?: string);
}
export declare class DatabaseError extends ApiError {
    constructor(message?: string, code?: string, details?: any);
}
export declare class EntityNotFoundError extends NotFoundError {
    constructor(entity: string, id?: string | number);
}
export declare function handleDatabaseError(error: any): ApiError;
//# sourceMappingURL=api-error.d.ts.map
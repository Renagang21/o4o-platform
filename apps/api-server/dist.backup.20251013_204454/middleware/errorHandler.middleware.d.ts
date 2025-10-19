import { Response, NextFunction } from 'express';
import { AuthRequest } from '../types/auth';
export declare enum ErrorCode {
    UNAUTHORIZED = "UNAUTHORIZED",
    FORBIDDEN = "FORBIDDEN",
    TOKEN_EXPIRED = "TOKEN_EXPIRED",
    INVALID_TOKEN = "INVALID_TOKEN",
    INSUFFICIENT_PERMISSIONS = "INSUFFICIENT_PERMISSIONS",
    VALIDATION_ERROR = "VALIDATION_ERROR",
    MISSING_REQUIRED_FIELDS = "MISSING_REQUIRED_FIELDS",
    INVALID_INPUT_FORMAT = "INVALID_INPUT_FORMAT",
    DUPLICATE_ENTRY = "DUPLICATE_ENTRY",
    RESOURCE_NOT_FOUND = "RESOURCE_NOT_FOUND",
    RESOURCE_ALREADY_EXISTS = "RESOURCE_ALREADY_EXISTS",
    RESOURCE_CONFLICT = "RESOURCE_CONFLICT",
    RESOURCE_LOCKED = "RESOURCE_LOCKED",
    VENDOR_NOT_ACTIVE = "VENDOR_NOT_ACTIVE",
    SUPPLIER_NOT_APPROVED = "SUPPLIER_NOT_APPROVED",
    COMMISSION_ALREADY_PROCESSED = "COMMISSION_ALREADY_PROCESSED",
    SETTLEMENT_ALREADY_PAID = "SETTLEMENT_ALREADY_PAID",
    INSUFFICIENT_INVENTORY = "INSUFFICIENT_INVENTORY",
    INVALID_COMMISSION_PERIOD = "INVALID_COMMISSION_PERIOD",
    PAYMENT_SERVICE_ERROR = "PAYMENT_SERVICE_ERROR",
    EMAIL_SERVICE_ERROR = "EMAIL_SERVICE_ERROR",
    REDIS_CONNECTION_ERROR = "REDIS_CONNECTION_ERROR",
    DATABASE_CONNECTION_ERROR = "DATABASE_CONNECTION_ERROR",
    INTERNAL_SERVER_ERROR = "INTERNAL_SERVER_ERROR",
    SERVICE_UNAVAILABLE = "SERVICE_UNAVAILABLE",
    RATE_LIMIT_EXCEEDED = "RATE_LIMIT_EXCEEDED",
    REQUEST_TIMEOUT = "REQUEST_TIMEOUT"
}
export declare class AppError extends Error {
    readonly statusCode: number;
    readonly errorCode: ErrorCode;
    readonly isOperational: boolean;
    readonly details?: any;
    readonly timestamp: Date;
    constructor(message: string, statusCode?: number, errorCode?: ErrorCode, isOperational?: boolean, details?: any);
}
export declare const createAuthError: (message?: string) => AppError;
export declare const createForbiddenError: (message?: string) => AppError;
export declare const createNotFoundError: (resource?: string) => AppError;
export declare const createValidationError: (message: string, details?: any) => AppError;
export declare const createConflictError: (message: string, details?: any) => AppError;
export declare const createVendorNotActiveError: () => AppError;
export declare const createSupplierNotApprovedError: () => AppError;
export declare const createCommissionAlreadyProcessedError: () => AppError;
export declare const createInsufficientInventoryError: (sku: string, available: number, requested: number) => AppError;
export declare const errorHandler: (err: Error | AppError, req: AuthRequest, res: Response, next: NextFunction) => void;
export declare const asyncHandler: (fn: any) => any;
export default errorHandler;
//# sourceMappingURL=errorHandler.middleware.d.ts.map
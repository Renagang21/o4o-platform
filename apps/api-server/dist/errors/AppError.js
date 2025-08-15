"use strict";
/**
 * Enhanced Error Handling System
 * 강화된 에러 처리 시스템
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.RateLimitError = exports.ExternalServiceError = exports.DatabaseError = exports.BusinessLogicError = exports.NotFoundError = exports.ValidationAppError = exports.AuthorizationError = exports.AuthenticationError = exports.AppError = exports.ErrorCodes = exports.ErrorSeverity = exports.ErrorCategory = void 0;
// Error categories
var ErrorCategory;
(function (ErrorCategory) {
    ErrorCategory["AUTHENTICATION"] = "AUTHENTICATION";
    ErrorCategory["AUTHORIZATION"] = "AUTHORIZATION";
    ErrorCategory["VALIDATION"] = "VALIDATION";
    ErrorCategory["BUSINESS_LOGIC"] = "BUSINESS_LOGIC";
    ErrorCategory["DATABASE"] = "DATABASE";
    ErrorCategory["EXTERNAL_SERVICE"] = "EXTERNAL_SERVICE";
    ErrorCategory["SYSTEM"] = "SYSTEM";
    ErrorCategory["NETWORK"] = "NETWORK";
    ErrorCategory["RATE_LIMIT"] = "RATE_LIMIT";
    ErrorCategory["NOT_FOUND"] = "NOT_FOUND";
})(ErrorCategory || (exports.ErrorCategory = ErrorCategory = {}));
// Error severity levels
var ErrorSeverity;
(function (ErrorSeverity) {
    ErrorSeverity["LOW"] = "LOW";
    ErrorSeverity["MEDIUM"] = "MEDIUM";
    ErrorSeverity["HIGH"] = "HIGH";
    ErrorSeverity["CRITICAL"] = "CRITICAL";
})(ErrorSeverity || (exports.ErrorSeverity = ErrorSeverity = {}));
// Error codes mapping
exports.ErrorCodes = {
    // Authentication Errors (AUTH_*)
    AUTH_INVALID_CREDENTIALS: { code: 'AUTH_INVALID_CREDENTIALS', message: '잘못된 인증 정보', status: 401 },
    AUTH_TOKEN_EXPIRED: { code: 'AUTH_TOKEN_EXPIRED', message: '토큰이 만료되었습니다', status: 401 },
    AUTH_TOKEN_INVALID: { code: 'AUTH_TOKEN_INVALID', message: '유효하지 않은 토큰', status: 401 },
    AUTH_REFRESH_TOKEN_INVALID: { code: 'AUTH_REFRESH_TOKEN_INVALID', message: '유효하지 않은 리프레시 토큰', status: 401 },
    AUTH_SESSION_EXPIRED: { code: 'AUTH_SESSION_EXPIRED', message: '세션이 만료되었습니다', status: 401 },
    AUTH_ACCOUNT_SUSPENDED: { code: 'AUTH_ACCOUNT_SUSPENDED', message: '계정이 정지되었습니다', status: 403 },
    AUTH_ACCOUNT_NOT_VERIFIED: { code: 'AUTH_ACCOUNT_NOT_VERIFIED', message: '이메일 인증이 필요합니다', status: 403 },
    AUTH_2FA_REQUIRED: { code: 'AUTH_2FA_REQUIRED', message: '2단계 인증이 필요합니다', status: 401 },
    AUTH_2FA_INVALID: { code: 'AUTH_2FA_INVALID', message: '잘못된 2단계 인증 코드', status: 401 },
    // Authorization Errors (AUTHZ_*)
    AUTHZ_INSUFFICIENT_PERMISSIONS: { code: 'AUTHZ_INSUFFICIENT_PERMISSIONS', message: '권한이 부족합니다', status: 403 },
    AUTHZ_RESOURCE_FORBIDDEN: { code: 'AUTHZ_RESOURCE_FORBIDDEN', message: '접근이 거부되었습니다', status: 403 },
    AUTHZ_ROLE_REQUIRED: { code: 'AUTHZ_ROLE_REQUIRED', message: '특정 역할이 필요합니다', status: 403 },
    // Validation Errors (VAL_*)
    VAL_REQUIRED_FIELD: { code: 'VAL_REQUIRED_FIELD', message: '필수 필드가 누락되었습니다', status: 400 },
    VAL_INVALID_FORMAT: { code: 'VAL_INVALID_FORMAT', message: '잘못된 형식입니다', status: 400 },
    VAL_INVALID_EMAIL: { code: 'VAL_INVALID_EMAIL', message: '유효하지 않은 이메일 주소', status: 400 },
    VAL_INVALID_PHONE: { code: 'VAL_INVALID_PHONE', message: '유효하지 않은 전화번호', status: 400 },
    VAL_DUPLICATE_ENTRY: { code: 'VAL_DUPLICATE_ENTRY', message: '중복된 항목입니다', status: 409 },
    VAL_INVALID_RANGE: { code: 'VAL_INVALID_RANGE', message: '유효하지 않은 범위입니다', status: 400 },
    VAL_INVALID_DATE: { code: 'VAL_INVALID_DATE', message: '유효하지 않은 날짜', status: 400 },
    VAL_INVALID_JSON: { code: 'VAL_INVALID_JSON', message: '유효하지 않은 JSON 형식', status: 400 },
    VAL_FILE_TOO_LARGE: { code: 'VAL_FILE_TOO_LARGE', message: '파일 크기가 너무 큽니다', status: 413 },
    VAL_INVALID_FILE_TYPE: { code: 'VAL_INVALID_FILE_TYPE', message: '지원하지 않는 파일 형식', status: 415 },
    // Business Logic Errors (BIZ_*)
    BIZ_OUT_OF_STOCK: { code: 'BIZ_OUT_OF_STOCK', message: '재고가 부족합니다', status: 400 },
    BIZ_ORDER_CANCELLED: { code: 'BIZ_ORDER_CANCELLED', message: '주문이 취소되었습니다', status: 400 },
    BIZ_ORDER_CANNOT_CANCEL: { code: 'BIZ_ORDER_CANNOT_CANCEL', message: '취소할 수 없는 주문입니다', status: 400 },
    BIZ_PAYMENT_FAILED: { code: 'BIZ_PAYMENT_FAILED', message: '결제에 실패했습니다', status: 402 },
    BIZ_PAYMENT_REQUIRED: { code: 'BIZ_PAYMENT_REQUIRED', message: '결제가 필요합니다', status: 402 },
    BIZ_COUPON_EXPIRED: { code: 'BIZ_COUPON_EXPIRED', message: '쿠폰이 만료되었습니다', status: 400 },
    BIZ_COUPON_INVALID: { code: 'BIZ_COUPON_INVALID', message: '유효하지 않은 쿠폰', status: 400 },
    BIZ_LIMIT_EXCEEDED: { code: 'BIZ_LIMIT_EXCEEDED', message: '한도를 초과했습니다', status: 400 },
    BIZ_ALREADY_EXISTS: { code: 'BIZ_ALREADY_EXISTS', message: '이미 존재합니다', status: 409 },
    BIZ_OPERATION_NOT_ALLOWED: { code: 'BIZ_OPERATION_NOT_ALLOWED', message: '허용되지 않은 작업입니다', status: 400 },
    // Database Errors (DB_*)
    DB_CONNECTION_ERROR: { code: 'DB_CONNECTION_ERROR', message: '데이터베이스 연결 오류', status: 503 },
    DB_QUERY_ERROR: { code: 'DB_QUERY_ERROR', message: '쿼리 실행 오류', status: 500 },
    DB_TRANSACTION_ERROR: { code: 'DB_TRANSACTION_ERROR', message: '트랜잭션 오류', status: 500 },
    DB_CONSTRAINT_VIOLATION: { code: 'DB_CONSTRAINT_VIOLATION', message: '데이터 제약 조건 위반', status: 400 },
    DB_DEADLOCK: { code: 'DB_DEADLOCK', message: '데드락이 발생했습니다', status: 503 },
    // External Service Errors (EXT_*)
    EXT_SERVICE_UNAVAILABLE: { code: 'EXT_SERVICE_UNAVAILABLE', message: '외부 서비스를 사용할 수 없습니다', status: 503 },
    EXT_API_ERROR: { code: 'EXT_API_ERROR', message: '외부 API 오류', status: 502 },
    EXT_TIMEOUT: { code: 'EXT_TIMEOUT', message: '외부 서비스 응답 시간 초과', status: 504 },
    // System Errors (SYS_*)
    SYS_INTERNAL_ERROR: { code: 'SYS_INTERNAL_ERROR', message: '내부 서버 오류', status: 500 },
    SYS_FILE_NOT_FOUND: { code: 'SYS_FILE_NOT_FOUND', message: '파일을 찾을 수 없습니다', status: 404 },
    SYS_FILE_UPLOAD_ERROR: { code: 'SYS_FILE_UPLOAD_ERROR', message: '파일 업로드 오류', status: 500 },
    SYS_RATE_LIMIT_EXCEEDED: { code: 'SYS_RATE_LIMIT_EXCEEDED', message: '요청 제한 초과', status: 429 },
    SYS_MAINTENANCE: { code: 'SYS_MAINTENANCE', message: '시스템 점검 중입니다', status: 503 },
    // Not Found Errors (404_*)
    NOT_FOUND_USER: { code: '404_USER_NOT_FOUND', message: '사용자를 찾을 수 없습니다', status: 404 },
    NOT_FOUND_RESOURCE: { code: '404_RESOURCE_NOT_FOUND', message: '리소스를 찾을 수 없습니다', status: 404 },
    NOT_FOUND_PAGE: { code: '404_PAGE_NOT_FOUND', message: '페이지를 찾을 수 없습니다', status: 404 },
    NOT_FOUND_ENDPOINT: { code: '404_ENDPOINT_NOT_FOUND', message: '엔드포인트를 찾을 수 없습니다', status: 404 }
};
/**
 * Base application error class
 */
class AppError extends Error {
    constructor(code, message, status = 500, category = ErrorCategory.SYSTEM, severity = ErrorSeverity.MEDIUM, isOperational = true, context, details, originalError) {
        super(message);
        this.name = this.constructor.name;
        this.code = code;
        this.status = status;
        this.category = category;
        this.severity = severity;
        this.isOperational = isOperational;
        this.context = context;
        this.details = details;
        this.originalError = originalError;
        // Capture stack trace
        Error.captureStackTrace(this, this.constructor);
    }
    /**
     * Create error from predefined error code
     */
    static fromErrorCode(errorCode, context, details, originalError) {
        const errorDef = exports.ErrorCodes[errorCode];
        const category = AppError.getCategoryFromCode(errorCode);
        const severity = AppError.getSeverityFromStatus(errorDef.status);
        return new AppError(errorDef.code, errorDef.message, errorDef.status, category, severity, true, context, details, originalError);
    }
    /**
     * Create error from validation errors
     */
    static fromValidationErrors(errors, context) {
        const details = errors.map(error => ({
            field: error.property,
            value: error.value,
            constraints: error.constraints
        }));
        return new AppError('VAL_VALIDATION_ERROR', 'Validation failed', 400, ErrorCategory.VALIDATION, ErrorSeverity.LOW, true, context, details);
    }
    /**
     * Determine category from error code
     */
    static getCategoryFromCode(code) {
        if (code.startsWith('AUTH_'))
            return ErrorCategory.AUTHENTICATION;
        if (code.startsWith('AUTHZ_'))
            return ErrorCategory.AUTHORIZATION;
        if (code.startsWith('VAL_'))
            return ErrorCategory.VALIDATION;
        if (code.startsWith('BIZ_'))
            return ErrorCategory.BUSINESS_LOGIC;
        if (code.startsWith('DB_'))
            return ErrorCategory.DATABASE;
        if (code.startsWith('EXT_'))
            return ErrorCategory.EXTERNAL_SERVICE;
        if (code.startsWith('SYS_'))
            return ErrorCategory.SYSTEM;
        if (code.startsWith('404_'))
            return ErrorCategory.NOT_FOUND;
        return ErrorCategory.SYSTEM;
    }
    /**
     * Determine severity from status code
     */
    static getSeverityFromStatus(status) {
        if (status >= 500)
            return ErrorSeverity.HIGH;
        if (status >= 400 && status < 500)
            return ErrorSeverity.MEDIUM;
        return ErrorSeverity.LOW;
    }
    /**
     * Convert to JSON response
     */
    toJSON() {
        const response = {
            success: false,
            error: this.message,
            code: this.code
        };
        // Add details if available
        if (this.details) {
            response.details = this.details;
        }
        // Add debug info in development
        if (process.env.NODE_ENV === 'development') {
            response.debug = {
                category: this.category,
                severity: this.severity,
                context: this.context,
                stack: this.stack
            };
        }
        return response;
    }
    /**
     * Log error with appropriate level
     */
    log(logger) {
        const logData = {
            code: this.code,
            message: this.message,
            category: this.category,
            severity: this.severity,
            context: this.context,
            details: this.details,
            stack: this.stack
        };
        switch (this.severity) {
            case ErrorSeverity.CRITICAL:
                logger.error('CRITICAL ERROR:', logData);
                break;
            case ErrorSeverity.HIGH:
                logger.error('Error:', logData);
                break;
            case ErrorSeverity.MEDIUM:
                logger.warn('Warning:', logData);
                break;
            case ErrorSeverity.LOW:
                logger.info('Info:', logData);
                break;
        }
    }
}
exports.AppError = AppError;
// Specific error classes
class AuthenticationError extends AppError {
    constructor(message = '인증이 필요합니다', code = 'AUTH_REQUIRED', context) {
        super(code, message, 401, ErrorCategory.AUTHENTICATION, ErrorSeverity.MEDIUM, true, context);
    }
}
exports.AuthenticationError = AuthenticationError;
class AuthorizationError extends AppError {
    constructor(message = '권한이 부족합니다', code = 'AUTHZ_INSUFFICIENT_PERMISSIONS', context) {
        super(code, message, 403, ErrorCategory.AUTHORIZATION, ErrorSeverity.MEDIUM, true, context);
    }
}
exports.AuthorizationError = AuthorizationError;
class ValidationAppError extends AppError {
    constructor(message = '유효성 검사 실패', details, context) {
        super('VAL_VALIDATION_ERROR', message, 400, ErrorCategory.VALIDATION, ErrorSeverity.LOW, true, context, details);
    }
}
exports.ValidationAppError = ValidationAppError;
class NotFoundError extends AppError {
    constructor(resource = 'Resource', context) {
        super('404_RESOURCE_NOT_FOUND', `${resource}를 찾을 수 없습니다`, 404, ErrorCategory.NOT_FOUND, ErrorSeverity.LOW, true, context);
    }
}
exports.NotFoundError = NotFoundError;
class BusinessLogicError extends AppError {
    constructor(message, code = 'BIZ_ERROR', context, details) {
        super(code, message, 400, ErrorCategory.BUSINESS_LOGIC, ErrorSeverity.MEDIUM, true, context, details);
    }
}
exports.BusinessLogicError = BusinessLogicError;
class DatabaseError extends AppError {
    constructor(message = '데이터베이스 오류', originalError, context) {
        super('DB_ERROR', message, 500, ErrorCategory.DATABASE, ErrorSeverity.HIGH, false, context, undefined, originalError);
    }
}
exports.DatabaseError = DatabaseError;
class ExternalServiceError extends AppError {
    constructor(service, message = '외부 서비스 오류', originalError, context) {
        super('EXT_SERVICE_ERROR', `${service}: ${message}`, 502, ErrorCategory.EXTERNAL_SERVICE, ErrorSeverity.HIGH, true, context, undefined, originalError);
    }
}
exports.ExternalServiceError = ExternalServiceError;
class RateLimitError extends AppError {
    constructor(limit, window, context) {
        super('SYS_RATE_LIMIT_EXCEEDED', `요청 제한 초과: ${window}당 ${limit}회`, 429, ErrorCategory.RATE_LIMIT, ErrorSeverity.LOW, true, context);
    }
}
exports.RateLimitError = RateLimitError;
//# sourceMappingURL=AppError.js.map
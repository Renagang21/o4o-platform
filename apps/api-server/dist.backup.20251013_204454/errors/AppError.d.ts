/**
 * Enhanced Error Handling System
 * 강화된 에러 처리 시스템
 */
import { ValidationError } from 'class-validator';
export declare enum ErrorCategory {
    AUTHENTICATION = "AUTHENTICATION",
    AUTHORIZATION = "AUTHORIZATION",
    VALIDATION = "VALIDATION",
    BUSINESS_LOGIC = "BUSINESS_LOGIC",
    DATABASE = "DATABASE",
    EXTERNAL_SERVICE = "EXTERNAL_SERVICE",
    SYSTEM = "SYSTEM",
    NETWORK = "NETWORK",
    RATE_LIMIT = "RATE_LIMIT",
    NOT_FOUND = "NOT_FOUND"
}
export declare enum ErrorSeverity {
    LOW = "LOW",
    MEDIUM = "MEDIUM",
    HIGH = "HIGH",
    CRITICAL = "CRITICAL"
}
export declare const ErrorCodes: {
    readonly AUTH_INVALID_CREDENTIALS: {
        readonly code: "AUTH_INVALID_CREDENTIALS";
        readonly message: "잘못된 인증 정보";
        readonly status: 401;
    };
    readonly AUTH_TOKEN_EXPIRED: {
        readonly code: "AUTH_TOKEN_EXPIRED";
        readonly message: "토큰이 만료되었습니다";
        readonly status: 401;
    };
    readonly AUTH_TOKEN_INVALID: {
        readonly code: "AUTH_TOKEN_INVALID";
        readonly message: "유효하지 않은 토큰";
        readonly status: 401;
    };
    readonly AUTH_REFRESH_TOKEN_INVALID: {
        readonly code: "AUTH_REFRESH_TOKEN_INVALID";
        readonly message: "유효하지 않은 리프레시 토큰";
        readonly status: 401;
    };
    readonly AUTH_SESSION_EXPIRED: {
        readonly code: "AUTH_SESSION_EXPIRED";
        readonly message: "세션이 만료되었습니다";
        readonly status: 401;
    };
    readonly AUTH_ACCOUNT_SUSPENDED: {
        readonly code: "AUTH_ACCOUNT_SUSPENDED";
        readonly message: "계정이 정지되었습니다";
        readonly status: 403;
    };
    readonly AUTH_ACCOUNT_NOT_VERIFIED: {
        readonly code: "AUTH_ACCOUNT_NOT_VERIFIED";
        readonly message: "이메일 인증이 필요합니다";
        readonly status: 403;
    };
    readonly AUTH_2FA_REQUIRED: {
        readonly code: "AUTH_2FA_REQUIRED";
        readonly message: "2단계 인증이 필요합니다";
        readonly status: 401;
    };
    readonly AUTH_2FA_INVALID: {
        readonly code: "AUTH_2FA_INVALID";
        readonly message: "잘못된 2단계 인증 코드";
        readonly status: 401;
    };
    readonly AUTHZ_INSUFFICIENT_PERMISSIONS: {
        readonly code: "AUTHZ_INSUFFICIENT_PERMISSIONS";
        readonly message: "권한이 부족합니다";
        readonly status: 403;
    };
    readonly AUTHZ_RESOURCE_FORBIDDEN: {
        readonly code: "AUTHZ_RESOURCE_FORBIDDEN";
        readonly message: "접근이 거부되었습니다";
        readonly status: 403;
    };
    readonly AUTHZ_ROLE_REQUIRED: {
        readonly code: "AUTHZ_ROLE_REQUIRED";
        readonly message: "특정 역할이 필요합니다";
        readonly status: 403;
    };
    readonly VAL_REQUIRED_FIELD: {
        readonly code: "VAL_REQUIRED_FIELD";
        readonly message: "필수 필드가 누락되었습니다";
        readonly status: 400;
    };
    readonly VAL_INVALID_FORMAT: {
        readonly code: "VAL_INVALID_FORMAT";
        readonly message: "잘못된 형식입니다";
        readonly status: 400;
    };
    readonly VAL_INVALID_EMAIL: {
        readonly code: "VAL_INVALID_EMAIL";
        readonly message: "유효하지 않은 이메일 주소";
        readonly status: 400;
    };
    readonly VAL_INVALID_PHONE: {
        readonly code: "VAL_INVALID_PHONE";
        readonly message: "유효하지 않은 전화번호";
        readonly status: 400;
    };
    readonly VAL_DUPLICATE_ENTRY: {
        readonly code: "VAL_DUPLICATE_ENTRY";
        readonly message: "중복된 항목입니다";
        readonly status: 409;
    };
    readonly VAL_INVALID_RANGE: {
        readonly code: "VAL_INVALID_RANGE";
        readonly message: "유효하지 않은 범위입니다";
        readonly status: 400;
    };
    readonly VAL_INVALID_DATE: {
        readonly code: "VAL_INVALID_DATE";
        readonly message: "유효하지 않은 날짜";
        readonly status: 400;
    };
    readonly VAL_INVALID_JSON: {
        readonly code: "VAL_INVALID_JSON";
        readonly message: "유효하지 않은 JSON 형식";
        readonly status: 400;
    };
    readonly VAL_FILE_TOO_LARGE: {
        readonly code: "VAL_FILE_TOO_LARGE";
        readonly message: "파일 크기가 너무 큽니다";
        readonly status: 413;
    };
    readonly VAL_INVALID_FILE_TYPE: {
        readonly code: "VAL_INVALID_FILE_TYPE";
        readonly message: "지원하지 않는 파일 형식";
        readonly status: 415;
    };
    readonly BIZ_OUT_OF_STOCK: {
        readonly code: "BIZ_OUT_OF_STOCK";
        readonly message: "재고가 부족합니다";
        readonly status: 400;
    };
    readonly BIZ_ORDER_CANCELLED: {
        readonly code: "BIZ_ORDER_CANCELLED";
        readonly message: "주문이 취소되었습니다";
        readonly status: 400;
    };
    readonly BIZ_ORDER_CANNOT_CANCEL: {
        readonly code: "BIZ_ORDER_CANNOT_CANCEL";
        readonly message: "취소할 수 없는 주문입니다";
        readonly status: 400;
    };
    readonly BIZ_PAYMENT_FAILED: {
        readonly code: "BIZ_PAYMENT_FAILED";
        readonly message: "결제에 실패했습니다";
        readonly status: 402;
    };
    readonly BIZ_PAYMENT_REQUIRED: {
        readonly code: "BIZ_PAYMENT_REQUIRED";
        readonly message: "결제가 필요합니다";
        readonly status: 402;
    };
    readonly BIZ_COUPON_EXPIRED: {
        readonly code: "BIZ_COUPON_EXPIRED";
        readonly message: "쿠폰이 만료되었습니다";
        readonly status: 400;
    };
    readonly BIZ_COUPON_INVALID: {
        readonly code: "BIZ_COUPON_INVALID";
        readonly message: "유효하지 않은 쿠폰";
        readonly status: 400;
    };
    readonly BIZ_LIMIT_EXCEEDED: {
        readonly code: "BIZ_LIMIT_EXCEEDED";
        readonly message: "한도를 초과했습니다";
        readonly status: 400;
    };
    readonly BIZ_ALREADY_EXISTS: {
        readonly code: "BIZ_ALREADY_EXISTS";
        readonly message: "이미 존재합니다";
        readonly status: 409;
    };
    readonly BIZ_OPERATION_NOT_ALLOWED: {
        readonly code: "BIZ_OPERATION_NOT_ALLOWED";
        readonly message: "허용되지 않은 작업입니다";
        readonly status: 400;
    };
    readonly DB_CONNECTION_ERROR: {
        readonly code: "DB_CONNECTION_ERROR";
        readonly message: "데이터베이스 연결 오류";
        readonly status: 503;
    };
    readonly DB_QUERY_ERROR: {
        readonly code: "DB_QUERY_ERROR";
        readonly message: "쿼리 실행 오류";
        readonly status: 500;
    };
    readonly DB_TRANSACTION_ERROR: {
        readonly code: "DB_TRANSACTION_ERROR";
        readonly message: "트랜잭션 오류";
        readonly status: 500;
    };
    readonly DB_CONSTRAINT_VIOLATION: {
        readonly code: "DB_CONSTRAINT_VIOLATION";
        readonly message: "데이터 제약 조건 위반";
        readonly status: 400;
    };
    readonly DB_DEADLOCK: {
        readonly code: "DB_DEADLOCK";
        readonly message: "데드락이 발생했습니다";
        readonly status: 503;
    };
    readonly EXT_SERVICE_UNAVAILABLE: {
        readonly code: "EXT_SERVICE_UNAVAILABLE";
        readonly message: "외부 서비스를 사용할 수 없습니다";
        readonly status: 503;
    };
    readonly EXT_API_ERROR: {
        readonly code: "EXT_API_ERROR";
        readonly message: "외부 API 오류";
        readonly status: 502;
    };
    readonly EXT_TIMEOUT: {
        readonly code: "EXT_TIMEOUT";
        readonly message: "외부 서비스 응답 시간 초과";
        readonly status: 504;
    };
    readonly SYS_INTERNAL_ERROR: {
        readonly code: "SYS_INTERNAL_ERROR";
        readonly message: "내부 서버 오류";
        readonly status: 500;
    };
    readonly SYS_FILE_NOT_FOUND: {
        readonly code: "SYS_FILE_NOT_FOUND";
        readonly message: "파일을 찾을 수 없습니다";
        readonly status: 404;
    };
    readonly SYS_FILE_UPLOAD_ERROR: {
        readonly code: "SYS_FILE_UPLOAD_ERROR";
        readonly message: "파일 업로드 오류";
        readonly status: 500;
    };
    readonly SYS_RATE_LIMIT_EXCEEDED: {
        readonly code: "SYS_RATE_LIMIT_EXCEEDED";
        readonly message: "요청 제한 초과";
        readonly status: 429;
    };
    readonly SYS_MAINTENANCE: {
        readonly code: "SYS_MAINTENANCE";
        readonly message: "시스템 점검 중입니다";
        readonly status: 503;
    };
    readonly NOT_FOUND_USER: {
        readonly code: "404_USER_NOT_FOUND";
        readonly message: "사용자를 찾을 수 없습니다";
        readonly status: 404;
    };
    readonly NOT_FOUND_RESOURCE: {
        readonly code: "404_RESOURCE_NOT_FOUND";
        readonly message: "리소스를 찾을 수 없습니다";
        readonly status: 404;
    };
    readonly NOT_FOUND_PAGE: {
        readonly code: "404_PAGE_NOT_FOUND";
        readonly message: "페이지를 찾을 수 없습니다";
        readonly status: 404;
    };
    readonly NOT_FOUND_ENDPOINT: {
        readonly code: "404_ENDPOINT_NOT_FOUND";
        readonly message: "엔드포인트를 찾을 수 없습니다";
        readonly status: 404;
    };
};
interface ErrorContext {
    userId?: string;
    requestId?: string;
    sessionId?: string;
    ip?: string;
    userAgent?: string;
    endpoint?: string;
    method?: string;
    timestamp?: Date;
    [key: string]: any;
}
/**
 * Base application error class
 */
export declare class AppError extends Error {
    readonly code: string;
    readonly status: number;
    readonly category: ErrorCategory;
    readonly severity: ErrorSeverity;
    readonly isOperational: boolean;
    readonly context?: ErrorContext;
    readonly details?: any;
    readonly originalError?: Error;
    constructor(code: string, message: string, status?: number, category?: ErrorCategory, severity?: ErrorSeverity, isOperational?: boolean, context?: ErrorContext, details?: any, originalError?: Error);
    /**
     * Create error from predefined error code
     */
    static fromErrorCode(errorCode: keyof typeof ErrorCodes, context?: ErrorContext, details?: any, originalError?: Error): AppError;
    /**
     * Create error from validation errors
     */
    static fromValidationErrors(errors: ValidationError[], context?: ErrorContext): AppError;
    /**
     * Determine category from error code
     */
    private static getCategoryFromCode;
    /**
     * Determine severity from status code
     */
    private static getSeverityFromStatus;
    /**
     * Convert to JSON response
     */
    toJSON(): any;
    /**
     * Log error with appropriate level
     */
    log(logger: any): void;
}
export declare class AuthenticationError extends AppError {
    constructor(message?: string, code?: string, context?: ErrorContext);
}
export declare class AuthorizationError extends AppError {
    constructor(message?: string, code?: string, context?: ErrorContext);
}
export declare class ValidationAppError extends AppError {
    constructor(message?: string, details?: any, context?: ErrorContext);
}
export declare class NotFoundError extends AppError {
    constructor(resource?: string, context?: ErrorContext);
}
export declare class BusinessLogicError extends AppError {
    constructor(message: string, code?: string, context?: ErrorContext, details?: any);
}
export declare class DatabaseError extends AppError {
    constructor(message?: string, originalError?: Error, context?: ErrorContext);
}
export declare class ExternalServiceError extends AppError {
    constructor(service: string, message?: string, originalError?: Error, context?: ErrorContext);
}
export declare class RateLimitError extends AppError {
    constructor(limit: number, window: string, context?: ErrorContext);
}
export {};
//# sourceMappingURL=AppError.d.ts.map
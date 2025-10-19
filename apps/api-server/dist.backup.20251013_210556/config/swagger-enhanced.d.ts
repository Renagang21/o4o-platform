/**
 * Enhanced Swagger/OpenAPI Configuration
 * 완전한 API 문서화 시스템
 */
import { Application } from 'express';
declare const errorCodes: {
    AUTH_INVALID_CREDENTIALS: string;
    AUTH_TOKEN_EXPIRED: string;
    AUTH_TOKEN_INVALID: string;
    AUTH_INSUFFICIENT_PERMISSIONS: string;
    AUTH_ACCOUNT_SUSPENDED: string;
    VAL_REQUIRED_FIELD: string;
    VAL_INVALID_FORMAT: string;
    VAL_DUPLICATE_ENTRY: string;
    VAL_INVALID_RANGE: string;
    BIZ_OUT_OF_STOCK: string;
    BIZ_ORDER_CANCELLED: string;
    BIZ_PAYMENT_FAILED: string;
    BIZ_COUPON_EXPIRED: string;
    SYS_DATABASE_ERROR: string;
    SYS_EXTERNAL_SERVICE_ERROR: string;
    SYS_FILE_UPLOAD_ERROR: string;
    SYS_RATE_LIMIT_EXCEEDED: string;
    '404_USER_NOT_FOUND': string;
    '404_RESOURCE_NOT_FOUND': string;
    '404_PAGE_NOT_FOUND': string;
};
declare let swaggerSpec: any;
export declare const setupSwagger: (app: Application) => void;
export { swaggerSpec, errorCodes };
export default setupSwagger;
//# sourceMappingURL=swagger-enhanced.d.ts.map
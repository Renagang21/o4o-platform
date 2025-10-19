/**
 * Route Helper Utilities
 * 라우트 경로를 일관성 있게 관리하기 위한 유틸리티
 */
export declare class RouteHelper {
    private static readonly API_VERSION;
    private static readonly BASE_PATH;
    private static readonly VERSIONED_PATH;
    /**
     * 버전이 있는 API 경로 생성
     */
    static versioned(path: string): string;
    /**
     * 버전 없는 API 경로 생성 (하위 호환용)
     */
    static unversioned(path: string): string;
    /**
     * 라우트 그룹 생성 헬퍼
     */
    static createRouteGroup(basePath: string): {
        v1: (subPath?: string) => string;
        base: (subPath?: string) => string;
        both: (subPath?: string) => string[];
    };
}
/**
 * 표준 API 경로 정의
 */
export declare const API_ROUTES: {
    AUTH: {
        LOGIN: string;
        REGISTER: string;
        LOGOUT: string;
        REFRESH: string;
        ME: string;
        VERIFY: string;
        FORGOT_PASSWORD: string;
        RESET_PASSWORD: string;
    };
    USERS: {
        LIST: string;
        GET: string;
        CREATE: string;
        UPDATE: string;
        DELETE: string;
    };
    PRODUCTS: {
        LIST: string;
        GET: string;
        CREATE: string;
        UPDATE: string;
        DELETE: string;
        BULK: string;
    };
    ORDERS: {
        LIST: string;
        GET: string;
        CREATE: string;
        UPDATE: string;
        DELETE: string;
        STATUS: string;
    };
    INVENTORY: {
        LIST: string;
        STATS: string;
        ADJUST: string;
        ALERTS: string;
    };
    PAYMENTS: {
        CREATE: string;
        CONFIRM: string;
        CANCEL: string;
        REFUND: string;
        LIST: string;
        GET: string;
        TOSS: {
            CREATE: string;
            CONFIRM: string;
            CANCEL: string;
            CONFIG: string;
            WEBHOOK: string;
        };
    };
    SETTINGS: {
        GET: string;
        UPDATE: string;
        GENERAL: string;
        PAYMENT: string;
        SHIPPING: string;
        EMAIL: string;
    };
    HEALTH: string;
    ADMIN: {
        DASHBOARD: string;
        STATS: string;
        USERS: string;
        SETTINGS: string;
    };
};
/**
 * 라우트 경로 검증
 */
export declare function validateRoutePath(path: string): boolean;
/**
 * 라우트 파라미터 추출
 */
export declare function extractRouteParams(path: string): string[];
//# sourceMappingURL=route-helper.d.ts.map
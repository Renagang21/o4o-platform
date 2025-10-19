/**
 * Standardized API Response Types
 * All API responses should follow this structure
 */
export interface ApiResponse<T = any> {
    success: boolean;
    data?: T;
    message?: string;
    error?: string;
    total?: number;
    page?: number;
    limit?: number;
}
export interface ApiError {
    success: false;
    error: string;
    message?: string;
    code?: string;
    statusCode?: number;
}
export interface PaginatedResponse<T> extends ApiResponse<T[]> {
    total: number;
    page: number;
    limit: number;
    hasNext: boolean;
    hasPrev: boolean;
}
/**
 * Helper functions to create standardized responses
 */
export declare const createSuccessResponse: <T>(data: T, message?: string) => ApiResponse<T>;
export declare const createErrorResponse: (error: string, code?: string) => ApiError;
export declare const createPaginatedResponse: <T>(data: T[], total: number, page: number, limit: number) => PaginatedResponse<T>;
//# sourceMappingURL=api-response.d.ts.map
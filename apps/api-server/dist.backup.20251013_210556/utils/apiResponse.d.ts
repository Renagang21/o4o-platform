import { Response } from 'express';
interface ApiSuccessResponse<T = any> {
    success: true;
    data: T;
    message?: string;
    meta?: {
        page?: number;
        limit?: number;
        total?: number;
        totalPages?: number;
    };
    timestamp: string;
}
export declare const sendSuccess: <T = any>(res: Response, data: T, message?: string, statusCode?: number, meta?: ApiSuccessResponse['meta']) => Response;
export declare const sendError: (res: Response, message: string, code?: string, statusCode?: number, details?: any) => Response;
export declare const sendPaginatedResponse: <T = any>(res: Response, data: T[], page: number, limit: number, total: number, message?: string) => Response;
export declare const ok: <T = any>(res: Response, data: T, message?: string) => Response<any, Record<string, any>>;
export declare const created: <T = any>(res: Response, data: T, message?: string) => Response<any, Record<string, any>>;
export declare const noContent: (res: Response) => Response<any, Record<string, any>>;
export declare const badRequest: (res: Response, message: string, details?: any) => Response<any, Record<string, any>>;
export declare const unauthorized: (res: Response, message?: string) => Response<any, Record<string, any>>;
export declare const forbidden: (res: Response, message?: string) => Response<any, Record<string, any>>;
export declare const notFound: (res: Response, message?: string) => Response<any, Record<string, any>>;
export declare const conflict: (res: Response, message: string) => Response<any, Record<string, any>>;
export declare const tooManyRequests: (res: Response, message?: string) => Response<any, Record<string, any>>;
export declare const internalError: (res: Response, message?: string) => Response<any, Record<string, any>>;
export {};
//# sourceMappingURL=apiResponse.d.ts.map
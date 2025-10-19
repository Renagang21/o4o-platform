import { Request, Response, NextFunction } from 'express';
export declare class ApiError extends Error {
    statusCode: number;
    code?: string;
    isOperational: boolean;
    constructor(statusCode: number, message: string, code?: string, isOperational?: boolean);
}
export declare const errorHandler: (err: Error | ApiError, req: Request, res: Response, _next: NextFunction) => void;
export declare const asyncHandler: (fn: (req: Request, res: Response, next: NextFunction) => Promise<any>) => (req: Request, res: Response, next: NextFunction) => void;
export declare const BadRequestError: (message: string, code?: string) => ApiError;
export declare const UnauthorizedError: (message?: string, code?: string) => ApiError;
export declare const ForbiddenError: (message?: string, code?: string) => ApiError;
export declare const NotFoundError: (message?: string, code?: string) => ApiError;
export declare const ConflictError: (message: string, code?: string) => ApiError;
export declare const TooManyRequestsError: (message?: string, code?: string) => ApiError;
export declare const InternalServerError: (message?: string, code?: string) => ApiError;
//# sourceMappingURL=errorHandler.d.ts.map
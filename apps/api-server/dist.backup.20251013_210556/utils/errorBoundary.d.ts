import { Request, Response, NextFunction } from 'express';
/**
 * Async error handler wrapper
 */
export declare const asyncHandler: (fn: Function) => (req: Request, res: Response, next: NextFunction) => void;
/**
 * Global error logger
 */
export declare const logError: (error: Error, context?: string) => void;
/**
 * Validation error handler
 */
export declare const handleValidationError: (errors: any[]) => {
    success: boolean;
    error: string;
    errors: {
        field: any;
        message: any;
    }[];
};
//# sourceMappingURL=errorBoundary.d.ts.map
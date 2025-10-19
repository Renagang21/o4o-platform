import { Response, NextFunction } from 'express';
import { AuthRequest } from '../types/auth';
export declare const performanceMiddleware: (req: AuthRequest, res: Response, next: NextFunction) => void;
export declare const getPerformanceStats: (timeRange?: 'hour' | 'day' | 'week') => Promise<{
    summary: any;
    slowestEndpoints: any;
}>;
export declare const getErrorAnalytics: (timeRange?: 'hour' | 'day' | 'week') => Promise<{
    errorsByType: any;
    errorTrends: any;
}>;
//# sourceMappingURL=performance.middleware.d.ts.map
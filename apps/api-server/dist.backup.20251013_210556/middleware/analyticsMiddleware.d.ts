import { Request, Response, NextFunction } from 'express';
export declare class AnalyticsMiddleware {
    private analyticsService;
    constructor();
    initializeTracking(): (req: Request, res: Response, next: NextFunction) => Promise<void>;
    trackPerformance(): (req: Request, res: Response, next: NextFunction) => Promise<void>;
    trackActions(): (req: Request, res: Response, next: NextFunction) => Promise<void>;
    trackErrors(): (err: Error, req: Request, res: Response, next: NextFunction) => Promise<void>;
    manageSession(): (req: Request, res: Response, next: NextFunction) => Promise<void>;
    trackLogin(): (req: Request, res: Response, next: NextFunction) => Promise<void>;
    trackFeedback(): (req: Request, res: Response, next: NextFunction) => Promise<void>;
    trackContentUsage(): (req: Request, res: Response, next: NextFunction) => Promise<void>;
    private getActionTypeFromRequest;
    private getActionNameFromRequest;
    private getContentActionType;
}
export declare const analyticsMiddleware: AnalyticsMiddleware;
//# sourceMappingURL=analyticsMiddleware.d.ts.map
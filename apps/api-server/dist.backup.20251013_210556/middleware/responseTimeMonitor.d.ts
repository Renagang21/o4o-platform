import { Request, Response, NextFunction } from 'express';
declare class ResponseTimeMonitor {
    private metricsFile;
    private metrics;
    private flushInterval;
    constructor();
    private startFlushTimer;
    private flushMetrics;
    middleware(): (req: Request, res: Response, next: NextFunction) => void;
    getStats(): {
        avgResponseTime: number;
        maxResponseTime: number;
        minResponseTime: number;
        slowRequests: number;
        totalRequests: number;
    };
}
export declare const responseTimeMonitor: ResponseTimeMonitor;
declare const middleware: (req: Request, res: Response, next: NextFunction) => void;
export default middleware;
//# sourceMappingURL=responseTimeMonitor.d.ts.map
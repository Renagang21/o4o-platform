import { Request, Response, NextFunction } from 'express';
interface RequestWithTiming extends Request {
    startTime?: number;
}
export declare const performanceMonitor: (req: RequestWithTiming, res: Response, next: NextFunction) => void;
export declare const memoryMonitor: () => void;
export declare const logQueryPerformance: (query: string, parameters: any[], duration: number) => void;
export {};
//# sourceMappingURL=performanceMonitor.d.ts.map
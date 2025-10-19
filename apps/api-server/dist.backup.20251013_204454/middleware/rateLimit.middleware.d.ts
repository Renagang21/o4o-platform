import { Request, Response, NextFunction } from 'express';
interface RateLimitOptions {
    windowMs: number;
    max: number;
    message?: string;
    keyGenerator?: (req: Request) => string;
}
export declare function rateLimitMiddleware(options: RateLimitOptions): (req: Request, res: Response, next: NextFunction) => Promise<void>;
export {};
//# sourceMappingURL=rateLimit.middleware.d.ts.map
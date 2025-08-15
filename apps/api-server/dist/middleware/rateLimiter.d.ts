import { Request, Response } from 'express';
export declare const defaultLimiter: import("express-rate-limit").RateLimitRequestHandler;
export declare const strictLimiter: import("express-rate-limit").RateLimitRequestHandler;
export declare const apiLimiter: import("express-rate-limit").RateLimitRequestHandler;
export declare const uploadLimiter: import("express-rate-limit").RateLimitRequestHandler;
export declare const dynamicLimiter: (tier?: "free" | "basic" | "premium") => import("express-rate-limit").RateLimitRequestHandler;
export declare class SmartRateLimiter {
    private requestCounts;
    private suspiciousIPs;
    middleware(): (req: Request, res: Response, next: Function) => Promise<Response<any, Record<string, any>>>;
    blockIP(ip: string): void;
    unblockIP(ip: string): void;
    getBlockedIPs(): string[];
}
export declare const smartLimiter: SmartRateLimiter;
//# sourceMappingURL=rateLimiter.d.ts.map
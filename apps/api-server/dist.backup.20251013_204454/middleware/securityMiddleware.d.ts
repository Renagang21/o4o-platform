import { Request, Response, NextFunction } from 'express';
/**
 * Security middleware to check blocked IPs and log security events
 */
export declare function securityMiddleware(req: Request, res: Response, next: NextFunction): Response<any, Record<string, any>>;
/**
 * Enhanced authentication failure handler
 */
export declare function handleAuthFailure(req: Request, error: string, userEmail?: string): void;
/**
 * SQL injection detection middleware
 */
export declare function sqlInjectionDetection(req: Request, res: Response, next: NextFunction): Response<any, Record<string, any>>;
//# sourceMappingURL=securityMiddleware.d.ts.map
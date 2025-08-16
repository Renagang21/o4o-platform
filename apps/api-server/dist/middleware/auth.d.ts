import { Request, Response, NextFunction } from 'express';
import { AuthRequest } from '../types/auth';
export { AuthRequest };
export declare const authenticateToken: (req: Request, res: Response, next: NextFunction) => Promise<void | Response<any, Record<string, any>>>;
export declare const requireRole: (roles: string[]) => (req: Request, res: Response, next: NextFunction) => Response<any, Record<string, any>>;
export declare const requireAdmin: (req: Request, res: Response, next: NextFunction) => Response<any, Record<string, any>>;
export declare const requireManagerOrAdmin: (req: Request, res: Response, next: NextFunction) => Response<any, Record<string, any>>;
export declare const optionalAuth: (req: Request, res: Response, next: NextFunction) => Promise<void>;
export declare const authenticate: (req: Request, res: Response, next: NextFunction) => Promise<void | Response<any, Record<string, any>>>;
//# sourceMappingURL=auth.d.ts.map
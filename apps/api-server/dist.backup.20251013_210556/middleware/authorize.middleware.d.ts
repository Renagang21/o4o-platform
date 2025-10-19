import { Response, NextFunction } from 'express';
import { AuthRequest } from '../types/auth';
export declare const authorize: (allowedRoles: string[]) => (req: AuthRequest, res: Response, next: NextFunction) => Response<any, Record<string, any>>;
//# sourceMappingURL=authorize.middleware.d.ts.map
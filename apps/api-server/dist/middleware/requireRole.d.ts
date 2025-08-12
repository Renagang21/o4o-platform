import { Response, NextFunction } from 'express';
import { AuthRequest } from '../types/auth';
export declare function requireRole(roles: string[]): (req: AuthRequest, res: Response, next: NextFunction) => Response<any, Record<string, any>>;
//# sourceMappingURL=requireRole.d.ts.map
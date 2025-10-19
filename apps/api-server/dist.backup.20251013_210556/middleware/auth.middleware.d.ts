import { Response, NextFunction } from 'express';
import { AuthRequest } from '../types/auth';
export declare const authenticate: (req: AuthRequest, res: Response, next: NextFunction) => Promise<Response<any, Record<string, any>>>;
//# sourceMappingURL=auth.middleware.d.ts.map
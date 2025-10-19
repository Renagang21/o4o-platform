import { Request, Response, NextFunction } from 'express';
import { ValidationChain } from 'express-validator';
export declare const validateRequest: (validations: ValidationChain[]) => (req: Request, res: Response, next: NextFunction) => Promise<Response<any, Record<string, any>>>;
export declare const createValidationError: (message: string, field?: string) => any;
//# sourceMappingURL=validation.middleware.d.ts.map
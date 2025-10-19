import { Request, Response, NextFunction } from 'express';
/**
 * Authorization middleware to check user roles
 * @param allowedRoles Array of roles that are allowed to access the route
 */
export declare const authorize: (allowedRoles: string[]) => (req: Request, res: Response, next: NextFunction) => Response<any, Record<string, any>>;
export declare const adminOnly: (req: Request, res: Response, next: NextFunction) => Response<any, Record<string, any>>;
export declare const editorOnly: (req: Request, res: Response, next: NextFunction) => Response<any, Record<string, any>>;
export declare const authorOnly: (req: Request, res: Response, next: NextFunction) => Response<any, Record<string, any>>;
export declare const contributorOnly: (req: Request, res: Response, next: NextFunction) => Response<any, Record<string, any>>;
//# sourceMappingURL=authorize.d.ts.map
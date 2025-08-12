import { Request, Response } from 'express';
import { AuthRequest } from '../types/auth';
export declare const getPendingUsers: (req: Request, res: Response) => Promise<void>;
export declare const getAllUsers: (req: Request, res: Response) => Promise<void>;
export declare const approveUser: (req: AuthRequest, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const rejectUser: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const suspendUser: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const reactivateUser: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const getDashboardStats: (req: Request, res: Response) => Promise<void>;
//# sourceMappingURL=adminController.d.ts.map
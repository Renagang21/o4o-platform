import { Request, Response } from 'express';
import { AuthRequest } from '../types/auth';
export declare class UserManagementController {
    private userRepository;
    constructor();
    getUsers: (req: Request, res: Response) => Promise<void>;
    getUserStatistics: (req: Request, res: Response) => Promise<void>;
    getPendingUsers: (req: Request, res: Response) => Promise<void>;
    getUser: (req: Request, res: Response) => Promise<void>;
    createUser: (req: Request, res: Response) => Promise<void>;
    updateUser: (req: Request, res: Response) => Promise<void>;
    deleteUser: (req: Request, res: Response) => Promise<void>;
    approveUser: (req: AuthRequest, res: Response) => Promise<void>;
    rejectUser: (req: AuthRequest, res: Response) => Promise<void>;
    bulkApprove: (req: AuthRequest, res: Response) => Promise<void>;
    bulkReject: (req: AuthRequest, res: Response) => Promise<void>;
    updateUserRoles: (req: Request, res: Response) => Promise<void>;
    getUserApprovalHistory: (req: Request, res: Response) => Promise<void>;
    exportUsers: (req: Request, res: Response) => Promise<void>;
}
//# sourceMappingURL=UserManagementController.d.ts.map
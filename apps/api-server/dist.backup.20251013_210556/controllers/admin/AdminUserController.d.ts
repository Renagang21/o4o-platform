import { Request, Response } from 'express';
export declare class AdminUserController {
    getUsers: (req: Request, res: Response) => Promise<void>;
    getUser: (req: Request, res: Response) => Promise<void>;
    createUser: (req: Request, res: Response) => Promise<void>;
    updateUser: (req: Request, res: Response) => Promise<void>;
    updateUserStatus: (req: Request, res: Response) => Promise<void>;
    deleteUser: (req: Request, res: Response) => Promise<void>;
    getUserStatistics: (req: Request, res: Response) => Promise<void>;
}
//# sourceMappingURL=AdminUserController.d.ts.map
import { Request, Response } from 'express';
export declare class UserController {
    constructor();
    getProfile(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    updateUserRole(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    updateBusinessInfo(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    getUsers(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    suspendUser(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
}
//# sourceMappingURL=userController.d.ts.map
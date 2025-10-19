import { Request, Response } from 'express';
export declare class UserActivityController {
    private static userActivityRepository;
    private static userRepository;
    static getUserActivityLog(req: Request, res: Response): Promise<void>;
    static createUserActivity(req: Request, res: Response): Promise<void>;
    static getActivityCategories(req: Request, res: Response): Promise<void>;
    static getActivityTypes(req: Request, res: Response): Promise<void>;
    static getActivitySummary(req: Request, res: Response): Promise<void>;
}
//# sourceMappingURL=userActivity.controller.d.ts.map
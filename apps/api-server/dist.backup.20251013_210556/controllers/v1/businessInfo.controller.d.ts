import { Request, Response } from 'express';
export declare class BusinessInfoController {
    private static businessInfoRepository;
    private static userRepository;
    private static activityRepository;
    static getBusinessInfo(req: Request, res: Response): Promise<void>;
    static createBusinessInfo(req: Request, res: Response): Promise<void>;
    static updateBusinessInfo(req: Request, res: Response): Promise<void>;
    static deleteBusinessInfo(req: Request, res: Response): Promise<void>;
    static verifyBusinessInfo(req: Request, res: Response): Promise<void>;
    static getBusinessTypes(req: Request, res: Response): Promise<void>;
    static getBusinessSizes(req: Request, res: Response): Promise<void>;
    static getIndustries(req: Request, res: Response): Promise<void>;
    static getBusinessStatistics(req: Request, res: Response): Promise<void>;
}
//# sourceMappingURL=businessInfo.controller.d.ts.map
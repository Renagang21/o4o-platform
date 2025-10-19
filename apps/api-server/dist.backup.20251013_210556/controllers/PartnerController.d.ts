import { Request, Response } from 'express';
export declare class PartnerController {
    private partnerService;
    constructor();
    applyAsPartner: (req: Request, res: Response) => Promise<void>;
    approvePartner: (req: Request, res: Response) => Promise<void>;
    getPartner: (req: Request, res: Response) => Promise<void>;
    getPartners: (req: Request, res: Response) => Promise<void>;
    updatePartner: (req: Request, res: Response) => Promise<void>;
    generateReferralLink: (req: Request, res: Response) => Promise<void>;
    trackClick: (req: Request, res: Response) => Promise<void>;
    getCommissions: (req: Request, res: Response) => Promise<void>;
    getPartnerStats: (req: Request, res: Response) => Promise<void>;
    updatePartnerTiers: (req: Request, res: Response) => Promise<void>;
    getOverallStats: (req: Request, res: Response) => Promise<void>;
    getMyPartnerInfo: (req: Request, res: Response) => Promise<void>;
    getPartnerDashboard: (req: Request, res: Response) => Promise<void>;
}
export default PartnerController;
//# sourceMappingURL=PartnerController.d.ts.map
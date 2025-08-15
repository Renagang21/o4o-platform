import { Request, Response } from 'express';
import { AuthRequest } from '../types/auth';
export declare class StatusPageController {
    private statusPageService;
    constructor();
    getPublicStatus(req: Request, res: Response): Promise<void>;
    getComponentUptime(req: Request, res: Response): Promise<void>;
    getIncidents(req: Request, res: Response): Promise<void>;
    getIncident(req: Request, res: Response): Promise<void>;
    subscribe(req: Request, res: Response): Promise<void>;
    confirmSubscription(req: Request, res: Response): Promise<void>;
    unsubscribe(req: Request, res: Response): Promise<void>;
    getComponents(req: Request, res: Response): Promise<void>;
    createComponent(req: Request, res: Response): Promise<void>;
    updateComponentStatus(req: Request, res: Response): Promise<void>;
    createIncident(req: AuthRequest, res: Response): Promise<void>;
    updateIncident(req: AuthRequest, res: Response): Promise<void>;
    scheduleMaintenance(req: AuthRequest, res: Response): Promise<void>;
    startMaintenance(req: Request, res: Response): Promise<void>;
    completeMaintenance(req: Request, res: Response): Promise<void>;
    performHealthChecks(req: Request, res: Response): Promise<void>;
    recordMetric(req: Request, res: Response): Promise<void>;
    getStatusAnalytics(req: Request, res: Response): Promise<void>;
}
export declare const statusPageController: StatusPageController;
//# sourceMappingURL=statusPageController.d.ts.map
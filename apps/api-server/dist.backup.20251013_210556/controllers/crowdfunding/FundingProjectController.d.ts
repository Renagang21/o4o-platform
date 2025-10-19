import { Request, Response } from 'express';
export declare class FundingProjectController {
    private projectService;
    constructor();
    getProjects(req: Request, res: Response): Promise<void>;
    getProject(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    createProject(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    updateProject(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    getMyProjects(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    getProjectStats(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
}
//# sourceMappingURL=FundingProjectController.d.ts.map
import { Request, Response } from 'express';
import { AuthRequest } from '../types/auth';
export declare class TemplatesController {
    private templateRepository;
    private userRepository;
    getTemplates(req: Request, res: Response): Promise<void>;
    getTemplate(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    getSystemTemplate(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    createTemplate(req: AuthRequest, res: Response): Promise<Response<any, Record<string, any>>>;
    updateTemplate(req: AuthRequest, res: Response): Promise<Response<any, Record<string, any>>>;
    deleteTemplate(req: AuthRequest, res: Response): Promise<Response<any, Record<string, any>>>;
    importTemplate(req: AuthRequest, res: Response): Promise<Response<any, Record<string, any>>>;
    exportTemplate(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    private getSystemTemplates;
    private createDefaultSystemTemplates;
}
//# sourceMappingURL=templatesController.d.ts.map
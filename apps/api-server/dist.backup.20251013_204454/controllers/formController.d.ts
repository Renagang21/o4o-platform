import { Request, Response } from 'express';
import { AuthRequest } from '../types/auth';
export declare const formController: {
    createForm(req: AuthRequest, res: Response): Promise<Response<any, Record<string, any>>>;
    updateForm(req: AuthRequest, res: Response): Promise<Response<any, Record<string, any>>>;
    getForms(req: AuthRequest, res: Response): Promise<void>;
    getForm(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    deleteForm(req: AuthRequest, res: Response): Promise<Response<any, Record<string, any>>>;
    submitForm(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    getSubmissions(req: AuthRequest, res: Response): Promise<void>;
    updateSubmission(req: AuthRequest, res: Response): Promise<Response<any, Record<string, any>>>;
    deleteSubmission(req: AuthRequest, res: Response): Promise<Response<any, Record<string, any>>>;
    getFormReport(req: AuthRequest, res: Response): Promise<Response<any, Record<string, any>>>;
};
//# sourceMappingURL=formController.d.ts.map
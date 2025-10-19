import { Request, Response } from 'express';
export declare class FormsController {
    private formRepo;
    private submissionRepo;
    getAllForms(req: Request, res: Response): Promise<void>;
    getFormById(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    getFormByName(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    createForm(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    updateForm(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    deleteForm(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    duplicateForm(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    updateFormStatus(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    getFormSubmissions(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    submitForm(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    private validateAndProcessFields;
    private processFormSettings;
    private validateSubmissionData;
    private validateFieldValue;
}
//# sourceMappingURL=FormsController.d.ts.map
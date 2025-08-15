import { Request, Response } from 'express';
export declare class CustomFieldsController {
    private fieldGroupRepository;
    private customFieldRepository;
    private customFieldValueRepository;
    getFieldGroups(req: Request, res: Response): Promise<void>;
    getFieldGroup(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    createFieldGroup(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    updateFieldGroup(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    deleteFieldGroup(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    getCustomFields(req: Request, res: Response): Promise<void>;
    getCustomField(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    createCustomField(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    updateCustomField(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    deleteCustomField(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    getCustomFieldValues(req: Request, res: Response): Promise<void>;
    saveCustomFieldValues(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    exportFieldGroups(req: Request, res: Response): Promise<void>;
    importFieldGroups(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
}
//# sourceMappingURL=customFieldsController.d.ts.map
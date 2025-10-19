import { Request, Response } from 'express';
export declare class FieldGroupsController {
    private fieldGroupRepo;
    private customFieldRepo;
    private fieldValueRepo;
    getAllFieldGroups(req: Request, res: Response): Promise<void>;
    getFieldGroupById(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    createFieldGroup(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    updateFieldGroup(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    deleteFieldGroup(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    duplicateFieldGroup(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    toggleFieldGroupStatus(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    reorderFieldGroups(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    getFieldGroupsByLocation(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
}
//# sourceMappingURL=FieldGroupsController.d.ts.map
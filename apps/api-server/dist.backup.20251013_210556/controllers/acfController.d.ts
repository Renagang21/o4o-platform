import { Request, Response } from 'express';
export declare class ACFController {
    static getFieldGroups(req: Request, res: Response): Promise<void>;
    static getFieldGroup(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    static createFieldGroup(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    static updateFieldGroup(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    static deleteFieldGroup(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    static getFieldValues(req: Request, res: Response): Promise<void>;
    static saveFieldValues(req: Request, res: Response): Promise<void>;
    static exportFieldGroups(req: Request, res: Response): Promise<void>;
    static importFieldGroups(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
}
//# sourceMappingURL=acfController.d.ts.map
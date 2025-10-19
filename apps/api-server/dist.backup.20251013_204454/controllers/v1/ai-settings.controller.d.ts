import { Request, Response } from 'express';
export declare class AISettingsController {
    private getRepository;
    getSettings: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
    saveSettings: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
    deleteSetting: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
    testApiKey: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
}
//# sourceMappingURL=ai-settings.controller.d.ts.map
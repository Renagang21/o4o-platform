import { Request, Response } from 'express';
export declare class SettingsController {
    private readonly validTypes;
    getSettings(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    updateSettings(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    getHomepageSettings(req: Request, res: Response): Promise<void>;
    getGeneralSettings(req: Request, res: Response): Promise<void>;
    getCustomizerSettings(req: Request, res: Response): Promise<void>;
    initializeSettings(req: Request, res: Response): Promise<void>;
}
//# sourceMappingURL=settingsController.d.ts.map
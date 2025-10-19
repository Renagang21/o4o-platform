import { Request, Response } from 'express';
export declare class PlatformController {
    private apps;
    getApps: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
    getActiveApps: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
    getApp: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
    updateAppStatus: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
    updateAppSettings: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
    getPlatformSettings: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
    updatePlatformSettings: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
    getPlatformStats: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
    getCustomPostTypes: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
    getCustomPostType: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
    createCustomPostType: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
    updateCustomPostType: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
    deleteCustomPostType: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
}
//# sourceMappingURL=platform.controller.d.ts.map
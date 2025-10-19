import { Request, Response } from 'express';
export declare class SignageController {
    private contentRepository;
    private storeRepository;
    private playlistRepository;
    private playlistItemRepository;
    private scheduleRepository;
    private templateRepository;
    private logRepository;
    private userRepository;
    getContents(req: Request, res: Response): Promise<void>;
    getContentById(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    createContent(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    updateContent(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    deleteContent(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    approveRejectContent(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    getStores(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    createStore(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    updateStore(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    deleteStore(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
}
//# sourceMappingURL=signageController.d.ts.map
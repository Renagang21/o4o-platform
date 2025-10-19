import { Request, Response } from 'express';
export declare class MediaController {
    private get mediaRepository();
    private get userRepository();
    uploadMedia: (req: Request, res: Response) => Promise<void>;
    getMedia: (req: Request, res: Response) => Promise<void>;
    getMediaById: (req: Request, res: Response) => Promise<void>;
    updateMedia: (req: Request, res: Response) => Promise<void>;
    deleteMedia: (req: Request, res: Response) => Promise<void>;
    private getFileCategory;
    private generateImageVariants;
    private getStorageStats;
    private getMediaUsage;
    private formatMediaResponse;
    private formatFileSize;
}
//# sourceMappingURL=MediaController.d.ts.map
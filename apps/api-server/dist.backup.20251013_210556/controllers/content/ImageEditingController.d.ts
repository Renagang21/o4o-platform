import { Request, Response } from 'express';
export declare class ImageEditingController {
    resizeImage: (req: Request, res: Response) => Promise<void>;
    cropImage: (req: Request, res: Response) => Promise<void>;
    rotateImage: (req: Request, res: Response) => Promise<void>;
    addWatermark: (req: Request, res: Response) => Promise<void>;
    optimizeImage: (req: Request, res: Response) => Promise<void>;
    getImageAnalysis: (req: Request, res: Response) => Promise<void>;
    batchOptimizeImages: (req: Request, res: Response) => Promise<void>;
    generateResponsiveImages: (req: Request, res: Response) => Promise<void>;
}
//# sourceMappingURL=ImageEditingController.d.ts.map
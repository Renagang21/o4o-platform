import { Request, Response } from 'express';
export declare class GalleryController {
    private get mediaRepository();
    /**
     * Generate image thumbnails and variants
     */
    private generateImageVariants;
    /**
     * Upload images for gallery
     */
    uploadGalleryImages: any[];
    /**
     * Get gallery images with pagination
     */
    getGalleryImages(req: Request, res: Response): Promise<void>;
    /**
     * Update image metadata (alt text, caption)
     */
    updateGalleryImage(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    /**
     * Delete gallery image
     */
    deleteGalleryImage(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
}
//# sourceMappingURL=GalleryController.d.ts.map
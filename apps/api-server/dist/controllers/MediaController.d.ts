import { Request, Response } from 'express';
export declare class MediaController {
    private mediaRepository;
    private folderRepository;
    constructor();
    /**
     * Upload single file
     */
    uploadSingle: any[];
    /**
     * Upload multiple files
     */
    uploadMultiple: any[];
    /**
     * Get all media files
     */
    getMedia: (req: Request, res: Response) => Promise<void>;
    /**
     * Get media by ID
     */
    getMediaById: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
    /**
     * Update media
     */
    updateMedia: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
    /**
     * Delete media
     */
    deleteMedia: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
    /**
     * Create folder
     */
    createFolder: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
    /**
     * Get folders
     */
    getFolders: (req: Request, res: Response) => Promise<void>;
    /**
     * Delete folder
     */
    deleteFolder: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
}
//# sourceMappingURL=MediaController.d.ts.map
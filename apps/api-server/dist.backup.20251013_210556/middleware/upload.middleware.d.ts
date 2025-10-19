import { Request, Response, NextFunction } from 'express';
declare const FILE_SIZE_LIMITS: {
    image: number;
    video: number;
    audio: number;
    document: number;
    default: number;
};
declare const ALLOWED_MIME_TYPES: string[];
declare const getFileType: (mimeType: string) => string;
export declare const uploadMiddleware: (fieldName?: string, maxFiles?: number) => (req: Request, res: Response, next: NextFunction) => void;
export declare const uploadSingleMiddleware: (fieldName?: string) => (req: Request, res: Response, next: NextFunction) => void;
export declare const ensureUploadDirectories: () => void;
export declare const getFileInfo: (file: Express.Multer.File) => {
    originalName: string;
    mimeType: string;
    size: number;
    fileType: string;
    sizeLimit: any;
    isWithinLimit: boolean;
    sizeLimitMB: number;
};
export declare const cleanupTempFiles: (files: Express.Multer.File[]) => void;
export declare const getUploadStats: () => {
    totalSizeMB: number;
    totalFiles: number;
    totalSize: number;
    byCategory: {};
};
export { ALLOWED_MIME_TYPES, FILE_SIZE_LIMITS, getFileType };
//# sourceMappingURL=upload.middleware.d.ts.map
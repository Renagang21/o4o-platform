export interface ImageEditOptions {
    width?: number;
    height?: number;
    x?: number;
    y?: number;
    angle?: number;
    quality?: number;
    format?: 'jpeg' | 'png' | 'webp';
    watermarkPath?: string;
    watermarkPosition?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'center';
    watermarkOpacity?: number;
}
export interface ImageEditResult {
    success: boolean;
    originalPath: string;
    editedPath: string;
    editedUrl: string;
    metadata: {
        width: number;
        height: number;
        format: string;
        size: number;
    };
    error?: string;
}
export declare class ImageProcessingService {
    private mediaRepository;
    /**
     * Initialize folder structure for edited images
     */
    initializeFolders(): Promise<void>;
    /**
     * Resize image
     */
    resizeImage(mediaId: string, width: number, height: number, options?: {
        maintainAspectRatio?: boolean;
        quality?: number;
    }): Promise<ImageEditResult>;
    /**
     * Crop image
     */
    cropImage(mediaId: string, x: number, y: number, width: number, height: number, options?: {
        quality?: number;
    }): Promise<ImageEditResult>;
    /**
     * Rotate image
     */
    rotateImage(mediaId: string, angle: number, options?: {
        backgroundColor?: string;
        quality?: number;
    }): Promise<ImageEditResult>;
    /**
     * Add watermark to image
     */
    addWatermark(mediaId: string, watermarkText: string, position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'center', options?: {
        opacity?: number;
        fontSize?: number;
        color?: string;
        quality?: number;
    }): Promise<ImageEditResult>;
    /**
     * Optimize image (compress and convert format)
     */
    optimizeImage(mediaId: string, options?: {
        format?: 'jpeg' | 'png' | 'webp';
        quality?: number;
        removeMetadata?: boolean;
        progressive?: boolean;
    }): Promise<ImageEditResult>;
    /**
     * Get image metadata and analysis
     */
    getImageAnalysis(mediaId: string): Promise<{
        success: boolean;
        metadata?: {
            width: number;
            height: number;
            format: string;
            size: number;
            channels: number;
            hasAlpha: boolean;
            colorspace: string;
            density?: number;
        };
        recommendations?: string[];
        error?: string;
    }>;
}
export declare const imageProcessingService: ImageProcessingService;
//# sourceMappingURL=image-processing.service.d.ts.map
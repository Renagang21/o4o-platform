import sharp from 'sharp';
import { MediaSize, ImageFormats } from '../entities/MediaFile';
export interface ProcessImageOptions {
    originalPath: string;
    filename: string;
    uploadPath: string;
    formats?: ('webp' | 'avif' | 'jpg')[];
    quality?: {
        webp?: number;
        avif?: number;
        jpg?: number;
    };
}
export declare class ImageProcessingService {
    private static readonly SIZES;
    private static readonly DEFAULT_QUALITY;
    /**
     * Process image into multiple sizes and formats
     */
    static processImage(options: ProcessImageOptions): Promise<{
        sizes: Record<string, MediaSize>;
        formats: ImageFormats;
        originalDimensions: {
            width: number;
            height: number;
        };
    }>;
    /**
     * Generate upload path with year/month structure
     */
    static generateUploadPath(baseUploadDir: string): string;
    /**
     * Ensure directory exists
     */
    static ensureDirectoryExists(dirPath: string): Promise<void>;
    /**
     * Get MIME type for format
     */
    private static getMimeType;
    /**
     * Validate image file
     */
    static validateImage(filePath: string): Promise<{
        isValid: boolean;
        metadata?: sharp.Metadata;
        error?: string;
    }>;
    /**
     * Generate responsive image srcset
     */
    static generateSrcSet(formats: ImageFormats, preferredFormat?: 'webp' | 'avif' | 'jpg'): string;
    /**
     * Clean up temporary files
     */
    static cleanupTempFiles(tempPaths: string[]): Promise<void>;
    /**
     * Get optimized image URL based on client capabilities
     */
    static getOptimizedImageUrl(formats: ImageFormats, size?: string, clientSupports?: {
        webp?: boolean;
        avif?: boolean;
    }): string;
}
//# sourceMappingURL=imageProcessingService.d.ts.map
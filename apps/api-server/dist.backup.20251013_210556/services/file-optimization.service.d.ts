export interface FileOptimizationResult {
    success: boolean;
    originalSize: number;
    optimizedSize: number;
    reductionPercentage: number;
    optimizedPath: string;
    optimizedUrl: string;
    format: string;
    error?: string;
}
export interface BatchOptimizationResult {
    success: boolean;
    totalFiles: number;
    optimizedFiles: number;
    totalOriginalSize: number;
    totalOptimizedSize: number;
    totalReductionPercentage: number;
    results: FileOptimizationResult[];
    errors: string[];
}
export declare class FileOptimizationService {
    private optimizationPresets;
    /**
     * Optimize a single image file
     */
    optimizeImage(imagePath: string, outputPath: string, options?: {
        preset?: 'web' | 'thumbnail' | 'print';
        format?: 'jpeg' | 'png' | 'webp';
        quality?: number;
        maxWidth?: number;
        maxHeight?: number;
        removeMetadata?: boolean;
    }): Promise<FileOptimizationResult>;
    /**
     * Batch optimize multiple images
     */
    batchOptimizeImages(imagePaths: string[], outputDirectory: string, options?: {
        preset?: 'web' | 'thumbnail' | 'print';
        format?: 'jpeg' | 'png' | 'webp';
        quality?: number;
        maxWidth?: number;
        maxHeight?: number;
        removeMetadata?: boolean;
        skipExisting?: boolean;
    }): Promise<BatchOptimizationResult>;
    /**
     * Generate responsive image sizes
     */
    generateResponsiveImages(imagePath: string, outputDirectory: string, sizes?: {
        name: string;
        width: number;
        height?: number;
        quality?: number;
    }[]): Promise<{
        success: boolean;
        variants: {
            [key: string]: string;
        };
        errors: string[];
    }>;
    /**
     * Clean up old optimized files
     */
    cleanupOptimizedFiles(directory: string, olderThanDays?: number): Promise<{
        success: boolean;
        deletedFiles: number;
        freedSpace: number;
        errors: string[];
    }>;
    /**
     * Get file size statistics
     */
    getOptimizationStats(directory: string): Promise<{
        totalFiles: number;
        totalSize: number;
        averageSize: number;
        largestFile: {
            name: string;
            size: number;
        } | null;
        smallestFile: {
            name: string;
            size: number;
        } | null;
        formatDistribution: {
            [key: string]: number;
        };
    }>;
    private getOptimalFormat;
    private isOptimizedFile;
    private isImageFile;
}
export declare const fileOptimizationService: FileOptimizationService;
//# sourceMappingURL=file-optimization.service.d.ts.map
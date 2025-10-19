"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.fileOptimizationService = exports.FileOptimizationService = void 0;
const sharp_1 = __importDefault(require("sharp"));
const path = __importStar(require("path"));
const fs = __importStar(require("fs"));
const logger_1 = __importDefault(require("../utils/logger"));
class FileOptimizationService {
    constructor() {
        // Default optimization settings for different image types
        this.optimizationPresets = {
            web: {
                jpeg: { quality: 85, progressive: true, mozjpeg: true },
                png: { quality: 90, compressionLevel: 9, progressive: true },
                webp: { quality: 85, effort: 6 }
            },
            thumbnail: {
                jpeg: { quality: 75, progressive: true, mozjpeg: true },
                png: { quality: 80, compressionLevel: 9, progressive: true },
                webp: { quality: 75, effort: 6 }
            },
            print: {
                jpeg: { quality: 95, progressive: false, mozjpeg: true },
                png: { quality: 100, compressionLevel: 6, progressive: false },
                webp: { quality: 95, effort: 6 }
            }
        };
    }
    /**
     * Optimize a single image file
     */
    async optimizeImage(imagePath, outputPath, options = {}) {
        var _a;
        try {
            if (!fs.existsSync(imagePath)) {
                return {
                    success: false,
                    originalSize: 0,
                    optimizedSize: 0,
                    reductionPercentage: 0,
                    optimizedPath: '',
                    optimizedUrl: '',
                    format: '',
                    error: 'Source image not found'
                };
            }
            const originalStats = fs.statSync(imagePath);
            const originalMetadata = await (0, sharp_1.default)(imagePath).metadata();
            // Determine output format
            const targetFormat = options.format || this.getOptimalFormat(originalMetadata);
            const preset = options.preset || 'web';
            // Ensure output directory exists
            const outputDir = path.dirname(outputPath);
            if (!fs.existsSync(outputDir)) {
                fs.mkdirSync(outputDir, { recursive: true });
            }
            let sharpInstance = (0, sharp_1.default)(imagePath);
            // Resize if max dimensions are specified
            if (options.maxWidth || options.maxHeight) {
                sharpInstance = sharpInstance.resize({
                    width: options.maxWidth,
                    height: options.maxHeight,
                    fit: 'inside',
                    withoutEnlargement: true
                });
            }
            // Remove metadata if requested
            if (options.removeMetadata !== false) {
                sharpInstance = sharpInstance.withMetadata(false);
            }
            // Apply format-specific optimizations
            const presetSettings = this.optimizationPresets[preset];
            const quality = options.quality || ((_a = presetSettings[targetFormat]) === null || _a === void 0 ? void 0 : _a.quality) || 85;
            switch (targetFormat) {
                case 'jpeg':
                    sharpInstance = sharpInstance.jpeg({
                        quality,
                        progressive: presetSettings.jpeg.progressive,
                        mozjpeg: presetSettings.jpeg.mozjpeg
                    });
                    break;
                case 'png':
                    sharpInstance = sharpInstance.png({
                        quality,
                        compressionLevel: presetSettings.png.compressionLevel,
                        progressive: presetSettings.png.progressive
                    });
                    break;
                case 'webp':
                    sharpInstance = sharpInstance.webp({
                        quality,
                        effort: presetSettings.webp.effort
                    });
                    break;
            }
            // Process and save
            await sharpInstance.toFile(outputPath);
            const optimizedStats = fs.statSync(outputPath);
            const reductionPercentage = Math.round((1 - optimizedStats.size / originalStats.size) * 100);
            logger_1.default.info(`Optimized ${path.basename(imagePath)}: ${originalStats.size} → ${optimizedStats.size} bytes (${reductionPercentage}% reduction)`);
            return {
                success: true,
                originalSize: originalStats.size,
                optimizedSize: optimizedStats.size,
                reductionPercentage,
                optimizedPath: outputPath,
                optimizedUrl: outputPath.replace(process.cwd(), '').replace(/\\/g, '/'),
                format: targetFormat
            };
        }
        catch (error) {
            logger_1.default.error('Error optimizing image:', error);
            return {
                success: false,
                originalSize: 0,
                optimizedSize: 0,
                reductionPercentage: 0,
                optimizedPath: '',
                optimizedUrl: '',
                format: '',
                error: error.message || 'Failed to optimize image'
            };
        }
    }
    /**
     * Batch optimize multiple images
     */
    async batchOptimizeImages(imagePaths, outputDirectory, options = {}) {
        const results = [];
        const errors = [];
        let totalOriginalSize = 0;
        let totalOptimizedSize = 0;
        let optimizedFiles = 0;
        // Ensure output directory exists
        if (!fs.existsSync(outputDirectory)) {
            fs.mkdirSync(outputDirectory, { recursive: true });
        }
        for (const imagePath of imagePaths) {
            try {
                const filename = path.parse(imagePath).name;
                const targetFormat = options.format || this.getOptimalFormat(await (0, sharp_1.default)(imagePath).metadata());
                const outputPath = path.join(outputDirectory, `${filename}_optimized.${targetFormat}`);
                // Skip if file exists and skipExisting is true
                if (options.skipExisting && fs.existsSync(outputPath)) {
                    logger_1.default.info(`Skipping existing file: ${outputPath}`);
                    continue;
                }
                const result = await this.optimizeImage(imagePath, outputPath, options);
                results.push(result);
                if (result.success) {
                    totalOriginalSize += result.originalSize;
                    totalOptimizedSize += result.optimizedSize;
                    optimizedFiles++;
                }
                else {
                    errors.push(`${imagePath}: ${result.error}`);
                }
            }
            catch (error) {
                const errorMsg = `${imagePath}: ${error.message}`;
                errors.push(errorMsg);
                logger_1.default.error('Batch optimization error:', errorMsg);
            }
        }
        const totalReductionPercentage = totalOriginalSize > 0
            ? Math.round((1 - totalOptimizedSize / totalOriginalSize) * 100)
            : 0;
        return {
            success: optimizedFiles > 0,
            totalFiles: imagePaths.length,
            optimizedFiles,
            totalOriginalSize,
            totalOptimizedSize,
            totalReductionPercentage,
            results,
            errors
        };
    }
    /**
     * Generate responsive image sizes
     */
    async generateResponsiveImages(imagePath, outputDirectory, sizes = [
        { name: 'thumbnail', width: 150, height: 150, quality: 75 },
        { name: 'small', width: 300, quality: 80 },
        { name: 'medium', width: 768, quality: 85 },
        { name: 'large', width: 1024, quality: 85 },
        { name: 'xlarge', width: 1920, quality: 90 }
    ]) {
        const variants = {};
        const errors = [];
        if (!fs.existsSync(imagePath)) {
            return {
                success: false,
                variants: {},
                errors: ['Source image not found']
            };
        }
        // Ensure output directory exists
        if (!fs.existsSync(outputDirectory)) {
            fs.mkdirSync(outputDirectory, { recursive: true });
        }
        const baseName = path.parse(imagePath).name;
        const originalMetadata = await (0, sharp_1.default)(imagePath).metadata();
        for (const size of sizes) {
            try {
                const outputPath = path.join(outputDirectory, `${baseName}_${size.name}.jpg`);
                let sharpInstance = (0, sharp_1.default)(imagePath);
                if (size.height) {
                    // Fixed dimensions (for thumbnails)
                    sharpInstance = sharpInstance.resize(size.width, size.height, {
                        fit: 'cover',
                        position: 'center'
                    });
                }
                else {
                    // Maintain aspect ratio
                    sharpInstance = sharpInstance.resize(size.width, null, {
                        fit: 'inside',
                        withoutEnlargement: true
                    });
                }
                await sharpInstance
                    .jpeg({
                    quality: size.quality || 85,
                    progressive: true,
                    mozjpeg: true
                })
                    .toFile(outputPath);
                variants[size.name] = outputPath.replace(process.cwd(), '').replace(/\\/g, '/');
                logger_1.default.debug(`Generated ${size.name} variant: ${outputPath}`);
            }
            catch (error) {
                const errorMsg = `Failed to generate ${size.name} variant: ${error.message}`;
                errors.push(errorMsg);
                logger_1.default.error(errorMsg);
            }
        }
        return {
            success: Object.keys(variants).length > 0,
            variants,
            errors
        };
    }
    /**
     * Clean up old optimized files
     */
    async cleanupOptimizedFiles(directory, olderThanDays = 30) {
        const errors = [];
        let deletedFiles = 0;
        let freedSpace = 0;
        try {
            if (!fs.existsSync(directory)) {
                return { success: true, deletedFiles: 0, freedSpace: 0, errors: [] };
            }
            const cutoffDate = new Date();
            cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);
            const files = fs.readdirSync(directory, { withFileTypes: true });
            for (const file of files) {
                if (file.isFile()) {
                    const filePath = path.join(directory, file.name);
                    const stats = fs.statSync(filePath);
                    if (stats.mtime < cutoffDate && this.isOptimizedFile(file.name)) {
                        try {
                            freedSpace += stats.size;
                            fs.unlinkSync(filePath);
                            deletedFiles++;
                            logger_1.default.debug(`Cleaned up old optimized file: ${filePath}`);
                        }
                        catch (error) {
                            errors.push(`Failed to delete ${filePath}: ${error.message}`);
                        }
                    }
                }
            }
            logger_1.default.info(`Cleanup complete: ${deletedFiles} files deleted, ${Math.round(freedSpace / 1024 / 1024)}MB freed`);
            return {
                success: true,
                deletedFiles,
                freedSpace,
                errors
            };
        }
        catch (error) {
            logger_1.default.error('Error during cleanup:', error);
            return {
                success: false,
                deletedFiles: 0,
                freedSpace: 0,
                errors: [error.message || 'Unknown cleanup error']
            };
        }
    }
    /**
     * Get file size statistics
     */
    async getOptimizationStats(directory) {
        try {
            if (!fs.existsSync(directory)) {
                return {
                    totalFiles: 0,
                    totalSize: 0,
                    averageSize: 0,
                    largestFile: null,
                    smallestFile: null,
                    formatDistribution: {}
                };
            }
            const files = fs.readdirSync(directory, { withFileTypes: true });
            const imageFiles = files.filter(file => file.isFile() && this.isImageFile(file.name));
            let totalSize = 0;
            let largestFile = null;
            let smallestFile = null;
            const formatDistribution = {};
            for (const file of imageFiles) {
                const filePath = path.join(directory, file.name);
                const stats = fs.statSync(filePath);
                const ext = path.extname(file.name).toLowerCase();
                totalSize += stats.size;
                formatDistribution[ext] = (formatDistribution[ext] || 0) + 1;
                if (!largestFile || stats.size > largestFile.size) {
                    largestFile = { name: file.name, size: stats.size };
                }
                if (!smallestFile || stats.size < smallestFile.size) {
                    smallestFile = { name: file.name, size: stats.size };
                }
            }
            return {
                totalFiles: imageFiles.length,
                totalSize,
                averageSize: imageFiles.length > 0 ? Math.round(totalSize / imageFiles.length) : 0,
                largestFile,
                smallestFile,
                formatDistribution
            };
        }
        catch (error) {
            logger_1.default.error('Error getting optimization stats:', error);
            return {
                totalFiles: 0,
                totalSize: 0,
                averageSize: 0,
                largestFile: null,
                smallestFile: null,
                formatDistribution: {}
            };
        }
    }
    // Private helper methods
    getOptimalFormat(metadata) {
        // If image has transparency, use PNG
        if (metadata.hasAlpha) {
            return 'png';
        }
        // For photos, use JPEG
        if (metadata.channels && metadata.channels >= 3) {
            return 'jpeg';
        }
        // Default to JPEG for web
        return 'jpeg';
    }
    isOptimizedFile(filename) {
        return filename.includes('_optimized') ||
            filename.includes('_resized') ||
            filename.includes('_cropped') ||
            filename.includes('_rotated') ||
            filename.includes('_watermarked');
    }
    isImageFile(filename) {
        const imageExtensions = ['.jpg', '.jpeg', '.png', '.webp', '.gif', '.bmp', '.tiff'];
        const ext = path.extname(filename).toLowerCase();
        return imageExtensions.includes(ext);
    }
}
exports.FileOptimizationService = FileOptimizationService;
exports.fileOptimizationService = new FileOptimizationService();
//# sourceMappingURL=file-optimization.service.js.map
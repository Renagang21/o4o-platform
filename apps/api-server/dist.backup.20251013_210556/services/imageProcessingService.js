"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ImageProcessingService = void 0;
const sharp_1 = __importDefault(require("sharp"));
const path_1 = __importDefault(require("path"));
const promises_1 = __importDefault(require("fs/promises"));
class ImageProcessingService {
    /**
     * Process image into multiple sizes and formats
     */
    static async processImage(options) {
        const { originalPath, filename, uploadPath, formats = ['webp', 'avif', 'jpg'], quality = this.DEFAULT_QUALITY } = options;
        try {
            // Get original image metadata
            const image = (0, sharp_1.default)(originalPath);
            const metadata = await image.metadata();
            if (!metadata.width || !metadata.height) {
                throw new Error('Unable to read image dimensions');
            }
            const originalDimensions = {
                width: metadata.width,
                height: metadata.height
            };
            // Remove EXIF data for privacy
            image.rotate();
            // Prepare results
            const sizes = {};
            const formatResults = {
                webp: {},
                jpg: {}
            };
            // Initialize AVIF if requested
            if (formats.includes('avif')) {
                formatResults.avif = {};
            }
            // Process each size
            for (const [sizeName, dimensions] of Object.entries(this.SIZES)) {
                const shouldResize = metadata.width > dimensions.width || metadata.height > dimensions.height;
                let processedImage = image.clone();
                if (shouldResize) {
                    processedImage = processedImage.resize(dimensions.width, dimensions.height, {
                        fit: 'inside',
                        withoutEnlargement: true
                    }).sharpen(); // Sharpen after resize
                }
                // Process each format
                for (const format of formats) {
                    const fileExtension = format === 'jpg' ? 'jpg' : format;
                    const filenameParts = path_1.default.parse(filename);
                    const outputFilename = `${filenameParts.name}-${sizeName}.${fileExtension}`;
                    const outputPath = path_1.default.join(uploadPath, outputFilename);
                    let formatImage = processedImage.clone();
                    // Apply format-specific settings
                    switch (format) {
                        case 'webp':
                            formatImage = formatImage.webp({
                                quality: quality.webp || this.DEFAULT_QUALITY.webp,
                                effort: 4 // Better compression
                            });
                            break;
                        case 'avif':
                            formatImage = formatImage.avif({
                                quality: quality.avif || this.DEFAULT_QUALITY.avif,
                                effort: 4
                            });
                            break;
                        case 'jpg':
                            formatImage = formatImage.jpeg({
                                quality: quality.jpg || this.DEFAULT_QUALITY.jpg,
                                progressive: true,
                                mozjpeg: true // Better compression
                            });
                            break;
                    }
                    // Save the processed image
                    await formatImage.toFile(outputPath);
                    // Get file stats
                    const stats = await promises_1.default.stat(outputPath);
                    const finalMetadata = await (0, sharp_1.default)(outputPath).metadata();
                    const mediaSize = {
                        name: sizeName,
                        width: finalMetadata.width || dimensions.width,
                        height: finalMetadata.height || dimensions.height,
                        url: `/uploads/${path_1.default.relative(uploadPath, '').split(path_1.default.sep).slice(-2).join('/')}/${outputFilename}`,
                        fileSize: stats.size,
                        mimeType: this.getMimeType(format)
                    };
                    // Store in appropriate format object
                    if (format === 'webp') {
                        formatResults.webp[sizeName] = mediaSize;
                    }
                    else if (format === 'avif' && formatResults.avif) {
                        formatResults.avif[sizeName] = mediaSize;
                    }
                    else if (format === 'jpg') {
                        formatResults.jpg[sizeName] = mediaSize;
                    }
                    // Store in sizes for the primary format (jpg)
                    if (format === 'jpg') {
                        sizes[sizeName] = mediaSize;
                    }
                }
            }
            return {
                sizes,
                formats: formatResults,
                originalDimensions
            };
        }
        catch (error) {
            // Error log removed
            throw new Error(`Image processing failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
    /**
     * Generate upload path with year/month structure
     */
    static generateUploadPath(baseUploadDir) {
        const now = new Date();
        const year = now.getFullYear().toString();
        const month = (now.getMonth() + 1).toString().padStart(2, '0');
        return path_1.default.join(baseUploadDir, year, month);
    }
    /**
     * Ensure directory exists
     */
    static async ensureDirectoryExists(dirPath) {
        try {
            await promises_1.default.access(dirPath);
        }
        catch (_a) {
            await promises_1.default.mkdir(dirPath, { recursive: true });
        }
    }
    /**
     * Get MIME type for format
     */
    static getMimeType(format) {
        switch (format) {
            case 'webp': return 'image/webp';
            case 'avif': return 'image/avif';
            case 'jpg': return 'image/jpeg';
            default: return 'image/jpeg';
        }
    }
    /**
     * Validate image file
     */
    static async validateImage(filePath) {
        try {
            const image = (0, sharp_1.default)(filePath);
            const metadata = await image.metadata();
            // Check if it's a valid image
            if (!metadata.width || !metadata.height) {
                return {
                    isValid: false,
                    error: 'Invalid image: Unable to read dimensions'
                };
            }
            // Check file size limits (e.g., max 50MB)
            const stats = await promises_1.default.stat(filePath);
            if (stats.size > 50 * 1024 * 1024) {
                return {
                    isValid: false,
                    error: 'File too large: Maximum size is 50MB'
                };
            }
            // Check dimensions (e.g., max 10000x10000)
            if (metadata.width > 10000 || metadata.height > 10000) {
                return {
                    isValid: false,
                    error: 'Image dimensions too large: Maximum is 10000x10000'
                };
            }
            return {
                isValid: true,
                metadata
            };
        }
        catch (error) {
            return {
                isValid: false,
                error: `Invalid image file: ${error instanceof Error ? error.message : 'Unknown error'}`
            };
        }
    }
    /**
     * Generate responsive image srcset
     */
    static generateSrcSet(formats, preferredFormat = 'webp') {
        const selectedFormat = formats[preferredFormat] || formats.jpg;
        const srcSetEntries = Object.entries(selectedFormat)
            .filter(([_, size]) => size && size.url)
            .map(([sizeName, size]) => {
            var _a;
            const width = ((_a = this.SIZES[sizeName]) === null || _a === void 0 ? void 0 : _a.width) || size.width;
            return `${size.url} ${width}w`;
        });
        return srcSetEntries.join(', ');
    }
    /**
     * Clean up temporary files
     */
    static async cleanupTempFiles(tempPaths) {
        await Promise.all(tempPaths.map(async (tempPath) => {
            try {
                await promises_1.default.unlink(tempPath);
            }
            catch (error) {
                // Warning log removed
            }
        }));
    }
    /**
     * Get optimized image URL based on client capabilities
     */
    static getOptimizedImageUrl(formats, size = 'medium', clientSupports = {}) {
        var _a, _b;
        // Prefer AVIF if supported and available
        if (clientSupports.avif && ((_a = formats.avif) === null || _a === void 0 ? void 0 : _a[size])) {
            return formats.avif[size].url;
        }
        // Fall back to WebP if supported and available
        if (clientSupports.webp && formats.webp[size]) {
            return formats.webp[size].url;
        }
        // Fall back to JPEG
        return ((_b = formats.jpg[size]) === null || _b === void 0 ? void 0 : _b.url) || '';
    }
}
exports.ImageProcessingService = ImageProcessingService;
ImageProcessingService.SIZES = {
    thumbnail: { width: 150, height: 150 },
    small: { width: 300, height: 300 },
    medium: { width: 768, height: 768 },
    large: { width: 1200, height: 1200 },
    original: { width: 2400, height: 2400 }
};
ImageProcessingService.DEFAULT_QUALITY = {
    webp: 75,
    avif: 65,
    jpg: 85
};
//# sourceMappingURL=imageProcessingService.js.map
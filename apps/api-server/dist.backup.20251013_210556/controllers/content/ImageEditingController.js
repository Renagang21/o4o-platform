"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ImageEditingController = void 0;
const image_processing_service_1 = require("../../services/image-processing.service");
const logger_1 = __importDefault(require("../../utils/logger"));
class ImageEditingController {
    constructor() {
        // POST /api/cms/media/images/resize - 이미지 리사이징
        this.resizeImage = async (req, res) => {
            try {
                const { mediaId, width, height, maintainAspectRatio = true, quality } = req.body;
                if (!mediaId || !width || !height) {
                    res.status(400).json({
                        success: false,
                        error: 'Missing required parameters: mediaId, width, height'
                    });
                    return;
                }
                if (width < 1 || height < 1 || width > 5000 || height > 5000) {
                    res.status(400).json({
                        success: false,
                        error: 'Invalid dimensions: width and height must be between 1 and 5000 pixels'
                    });
                    return;
                }
                const result = await image_processing_service_1.imageProcessingService.resizeImage(mediaId, parseInt(width), parseInt(height), {
                    maintainAspectRatio: maintainAspectRatio === 'true' || maintainAspectRatio === true,
                    quality: quality ? parseInt(quality) : undefined
                });
                if (result.success) {
                    res.json({
                        success: true,
                        message: 'Image resized successfully',
                        data: {
                            originalPath: result.originalPath,
                            editedUrl: result.editedUrl,
                            metadata: result.metadata
                        }
                    });
                }
                else {
                    res.status(400).json({
                        success: false,
                        error: result.error || 'Failed to resize image'
                    });
                }
            }
            catch (error) {
                logger_1.default.error('Error in resizeImage:', error);
                res.status(500).json({
                    success: false,
                    error: 'Internal server error during image resize'
                });
            }
        };
        // POST /api/cms/media/images/crop - 이미지 크롭
        this.cropImage = async (req, res) => {
            try {
                const { mediaId, x, y, width, height, quality } = req.body;
                if (!mediaId || x === undefined || y === undefined || !width || !height) {
                    res.status(400).json({
                        success: false,
                        error: 'Missing required parameters: mediaId, x, y, width, height'
                    });
                    return;
                }
                // Validate crop parameters
                const cropX = Math.max(0, parseInt(x));
                const cropY = Math.max(0, parseInt(y));
                const cropWidth = Math.max(1, parseInt(width));
                const cropHeight = Math.max(1, parseInt(height));
                if (cropWidth > 5000 || cropHeight > 5000) {
                    res.status(400).json({
                        success: false,
                        error: 'Crop dimensions too large: maximum 5000x5000 pixels'
                    });
                    return;
                }
                const result = await image_processing_service_1.imageProcessingService.cropImage(mediaId, cropX, cropY, cropWidth, cropHeight, {
                    quality: quality ? parseInt(quality) : undefined
                });
                if (result.success) {
                    res.json({
                        success: true,
                        message: 'Image cropped successfully',
                        data: {
                            originalPath: result.originalPath,
                            editedUrl: result.editedUrl,
                            metadata: result.metadata,
                            cropArea: { x: cropX, y: cropY, width: cropWidth, height: cropHeight }
                        }
                    });
                }
                else {
                    res.status(400).json({
                        success: false,
                        error: result.error || 'Failed to crop image'
                    });
                }
            }
            catch (error) {
                logger_1.default.error('Error in cropImage:', error);
                res.status(500).json({
                    success: false,
                    error: 'Internal server error during image crop'
                });
            }
        };
        // POST /api/cms/media/images/rotate - 이미지 회전
        this.rotateImage = async (req, res) => {
            try {
                const { mediaId, angle, backgroundColor, quality } = req.body;
                if (!mediaId || angle === undefined) {
                    res.status(400).json({
                        success: false,
                        error: 'Missing required parameters: mediaId, angle'
                    });
                    return;
                }
                const rotationAngle = parseInt(angle);
                // Validate rotation angle
                if (rotationAngle < -360 || rotationAngle > 360) {
                    res.status(400).json({
                        success: false,
                        error: 'Invalid rotation angle: must be between -360 and 360 degrees'
                    });
                    return;
                }
                const result = await image_processing_service_1.imageProcessingService.rotateImage(mediaId, rotationAngle, {
                    backgroundColor: backgroundColor || undefined,
                    quality: quality ? parseInt(quality) : undefined
                });
                if (result.success) {
                    res.json({
                        success: true,
                        message: 'Image rotated successfully',
                        data: {
                            originalPath: result.originalPath,
                            editedUrl: result.editedUrl,
                            metadata: result.metadata,
                            rotation: { angle: rotationAngle, backgroundColor: backgroundColor || 'transparent' }
                        }
                    });
                }
                else {
                    res.status(400).json({
                        success: false,
                        error: result.error || 'Failed to rotate image'
                    });
                }
            }
            catch (error) {
                logger_1.default.error('Error in rotateImage:', error);
                res.status(500).json({
                    success: false,
                    error: 'Internal server error during image rotation'
                });
            }
        };
        // POST /api/cms/media/images/watermark - 워터마크 추가
        this.addWatermark = async (req, res) => {
            try {
                const { mediaId, text, position = 'bottom-right', opacity = 0.7, fontSize, color = 'rgba(255,255,255,0.8)', quality } = req.body;
                if (!mediaId || !text) {
                    res.status(400).json({
                        success: false,
                        error: 'Missing required parameters: mediaId, text'
                    });
                    return;
                }
                // Validate position
                const validPositions = ['top-left', 'top-right', 'bottom-left', 'bottom-right', 'center'];
                if (!validPositions.includes(position)) {
                    res.status(400).json({
                        success: false,
                        error: `Invalid position: must be one of ${validPositions.join(', ')}`
                    });
                    return;
                }
                // Validate opacity
                const watermarkOpacity = Math.max(0.1, Math.min(1.0, parseFloat(opacity)));
                const result = await image_processing_service_1.imageProcessingService.addWatermark(mediaId, text, position, {
                    opacity: watermarkOpacity,
                    fontSize: fontSize ? parseInt(fontSize) : undefined,
                    color: color,
                    quality: quality ? parseInt(quality) : undefined
                });
                if (result.success) {
                    res.json({
                        success: true,
                        message: 'Watermark added successfully',
                        data: {
                            originalPath: result.originalPath,
                            editedUrl: result.editedUrl,
                            metadata: result.metadata,
                            watermark: {
                                text,
                                position,
                                opacity: watermarkOpacity,
                                color,
                                fontSize: fontSize || 'auto'
                            }
                        }
                    });
                }
                else {
                    res.status(400).json({
                        success: false,
                        error: result.error || 'Failed to add watermark'
                    });
                }
            }
            catch (error) {
                logger_1.default.error('Error in addWatermark:', error);
                res.status(500).json({
                    success: false,
                    error: 'Internal server error during watermark addition'
                });
            }
        };
        // POST /api/cms/media/images/optimize - 이미지 최적화
        this.optimizeImage = async (req, res) => {
            try {
                const { mediaId, format, quality = 85, removeMetadata = true, progressive = true } = req.body;
                if (!mediaId) {
                    res.status(400).json({
                        success: false,
                        error: 'Missing required parameter: mediaId'
                    });
                    return;
                }
                // Validate format
                if (format && !['jpeg', 'png', 'webp'].includes(format)) {
                    res.status(400).json({
                        success: false,
                        error: 'Invalid format: must be jpeg, png, or webp'
                    });
                    return;
                }
                // Validate quality
                const optimizationQuality = Math.max(1, Math.min(100, parseInt(quality)));
                const result = await image_processing_service_1.imageProcessingService.optimizeImage(mediaId, {
                    format: format || undefined,
                    quality: optimizationQuality,
                    removeMetadata: removeMetadata === 'true' || removeMetadata === true,
                    progressive: progressive === 'true' || progressive === true
                });
                if (result.success) {
                    res.json({
                        success: true,
                        message: 'Image optimized successfully',
                        data: {
                            originalPath: result.originalPath,
                            editedUrl: result.editedUrl,
                            metadata: result.metadata,
                            optimization: {
                                format: result.metadata.format,
                                quality: optimizationQuality,
                                removeMetadata,
                                progressive
                            }
                        }
                    });
                }
                else {
                    res.status(400).json({
                        success: false,
                        error: result.error || 'Failed to optimize image'
                    });
                }
            }
            catch (error) {
                logger_1.default.error('Error in optimizeImage:', error);
                res.status(500).json({
                    success: false,
                    error: 'Internal server error during image optimization'
                });
            }
        };
        // GET /api/cms/media/images/:id/analysis - 이미지 분석 (보너스)
        this.getImageAnalysis = async (req, res) => {
            try {
                const { id } = req.params;
                if (!id) {
                    res.status(400).json({
                        success: false,
                        error: 'Missing media ID'
                    });
                    return;
                }
                const result = await image_processing_service_1.imageProcessingService.getImageAnalysis(id);
                if (result.success) {
                    res.json({
                        success: true,
                        message: 'Image analysis completed',
                        data: {
                            metadata: result.metadata,
                            recommendations: result.recommendations,
                            analysisDate: new Date().toISOString()
                        }
                    });
                }
                else {
                    res.status(400).json({
                        success: false,
                        error: result.error || 'Failed to analyze image'
                    });
                }
            }
            catch (error) {
                logger_1.default.error('Error in getImageAnalysis:', error);
                res.status(500).json({
                    success: false,
                    error: 'Internal server error during image analysis'
                });
            }
        };
        // POST /api/cms/media/images/batch-optimize - 일괄 최적화 (보너스)
        this.batchOptimizeImages = async (req, res) => {
            try {
                const { mediaIds, preset = 'web', quality = 85 } = req.body;
                if (!mediaIds || !Array.isArray(mediaIds) || mediaIds.length === 0) {
                    res.status(400).json({
                        success: false,
                        error: 'Missing or invalid mediaIds array'
                    });
                    return;
                }
                if (mediaIds.length > 20) {
                    res.status(400).json({
                        success: false,
                        error: 'Maximum 20 images can be processed in a single batch'
                    });
                    return;
                }
                const results = [];
                let successCount = 0;
                let failureCount = 0;
                for (const mediaId of mediaIds) {
                    try {
                        const result = await image_processing_service_1.imageProcessingService.optimizeImage(mediaId, {
                            quality: parseInt(quality),
                            removeMetadata: true,
                            progressive: true
                        });
                        results.push({
                            mediaId,
                            success: result.success,
                            editedUrl: result.success ? result.editedUrl : null,
                            error: result.error || null
                        });
                        if (result.success) {
                            successCount++;
                        }
                        else {
                            failureCount++;
                        }
                    }
                    catch (error) {
                        results.push({
                            mediaId,
                            success: false,
                            editedUrl: null,
                            error: error.message || 'Unknown error'
                        });
                        failureCount++;
                    }
                }
                res.json({
                    success: successCount > 0,
                    message: `Batch optimization completed: ${successCount} succeeded, ${failureCount} failed`,
                    data: {
                        totalProcessed: mediaIds.length,
                        successCount,
                        failureCount,
                        results
                    }
                });
            }
            catch (error) {
                logger_1.default.error('Error in batchOptimizeImages:', error);
                res.status(500).json({
                    success: false,
                    error: 'Internal server error during batch optimization'
                });
            }
        };
        // POST /api/cms/media/images/generate-responsive - 반응형 이미지 생성 (보너스)
        this.generateResponsiveImages = async (req, res) => {
            try {
                const { mediaId, sizes } = req.body;
                if (!mediaId) {
                    res.status(400).json({
                        success: false,
                        error: 'Missing required parameter: mediaId'
                    });
                    return;
                }
                // Default responsive sizes if not provided
                const defaultSizes = [
                    { name: 'thumbnail', width: 150, height: 150, quality: 75 },
                    { name: 'small', width: 300, quality: 80 },
                    { name: 'medium', width: 768, quality: 85 },
                    { name: 'large', width: 1024, quality: 85 },
                    { name: 'xlarge', width: 1920, quality: 90 }
                ];
                const responsiveSizes = sizes || defaultSizes;
                // This is a simplified implementation - would need to get actual media file path
                res.json({
                    success: true,
                    message: 'Responsive image generation initiated',
                    data: {
                        mediaId,
                        sizes: responsiveSizes,
                        note: 'This is a demo implementation - full functionality requires media file path resolution'
                    }
                });
            }
            catch (error) {
                logger_1.default.error('Error in generateResponsiveImages:', error);
                res.status(500).json({
                    success: false,
                    error: 'Internal server error during responsive image generation'
                });
            }
        };
    }
}
exports.ImageEditingController = ImageEditingController;
//# sourceMappingURL=ImageEditingController.js.map
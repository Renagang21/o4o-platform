"use strict";
/**
 * Media Upload Controller - Handle logo, favicon, and background image uploads
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
var _a;
Object.defineProperty(exports, "__esModule", { value: true });
exports.MediaUploadController = exports.upload = void 0;
const errorHandler_middleware_1 = require("../../middleware/errorHandler.middleware");
const logger_1 = __importDefault(require("../../utils/logger"));
const multer_1 = __importDefault(require("multer"));
const path_1 = __importDefault(require("path"));
const promises_1 = __importDefault(require("fs/promises"));
const sharp_1 = __importDefault(require("sharp"));
const crypto_1 = __importDefault(require("crypto"));
// Configure multer for file uploads
const storage = multer_1.default.memoryStorage();
const fileFilter = (req, file, cb) => {
    // Allowed file types
    const allowedMimes = [
        'image/jpeg',
        'image/jpg',
        'image/png',
        'image/gif',
        'image/svg+xml',
        'image/x-icon',
        'image/webp'
    ];
    if (allowedMimes.includes(file.mimetype)) {
        cb(null, true);
    }
    else {
        cb(new Error('Invalid file type. Only images are allowed.'), false);
    }
};
exports.upload = (0, multer_1.default)({
    storage,
    fileFilter,
    limits: {
        fileSize: 5 * 1024 * 1024 // 5MB max
    }
});
class MediaUploadController {
}
exports.MediaUploadController = MediaUploadController;
_a = MediaUploadController;
/**
 * Upload media file (logo, favicon, background)
 */
MediaUploadController.uploadMedia = (0, errorHandler_middleware_1.asyncHandler)(async (req, res) => {
    var _b;
    const userId = (_b = req.user) === null || _b === void 0 ? void 0 : _b.id;
    const file = req.file;
    const { type = 'general' } = req.body;
    if (!file) {
        throw (0, errorHandler_middleware_1.createValidationError)('No file uploaded');
    }
    try {
        // Generate unique filename
        const hash = crypto_1.default.randomBytes(8).toString('hex');
        const timestamp = Date.now();
        const ext = path_1.default.extname(file.originalname);
        const filename = `${type}_${timestamp}_${hash}${ext}`;
        // Define upload directory
        const uploadDir = path_1.default.join(process.cwd(), 'uploads', type);
        await promises_1.default.mkdir(uploadDir, { recursive: true });
        // Process image based on type
        let processedBuffer = file.buffer;
        let metadata = {};
        if (type === 'logo') {
            // Resize logo to reasonable dimensions
            const processed = await (0, sharp_1.default)(file.buffer)
                .resize(400, 200, {
                fit: 'inside',
                withoutEnlargement: true
            })
                .toBuffer();
            processedBuffer = processed;
            const info = await (0, sharp_1.default)(processedBuffer).metadata();
            metadata = { width: info.width, height: info.height };
        }
        else if (type === 'favicon') {
            // Create multiple favicon sizes
            const sizes = [16, 32, 48];
            const favicons = [];
            for (const size of sizes) {
                const resized = await (0, sharp_1.default)(file.buffer)
                    .resize(size, size)
                    .toBuffer();
                const sizedFilename = `favicon_${size}x${size}_${timestamp}_${hash}.png`;
                const sizedPath = path_1.default.join(uploadDir, sizedFilename);
                await promises_1.default.writeFile(sizedPath, resized);
                favicons.push({
                    size: `${size}x${size}`,
                    url: `/uploads/${type}/${sizedFilename}`
                });
            }
            metadata = { favicons };
        }
        else if (type === 'background') {
            // Optimize background image
            const processed = await (0, sharp_1.default)(file.buffer)
                .resize(1920, 1080, {
                fit: 'inside',
                withoutEnlargement: true
            })
                .jpeg({ quality: 85 })
                .toBuffer();
            processedBuffer = processed;
            const info = await (0, sharp_1.default)(processedBuffer).metadata();
            metadata = { width: info.width, height: info.height };
        }
        // Save processed file
        const filepath = path_1.default.join(uploadDir, filename);
        await promises_1.default.writeFile(filepath, processedBuffer);
        // Generate URL
        const url = `/uploads/${type}/${filename}`;
        // Save to database (mock)
        const mediaRecord = {
            id: `media_${timestamp}`,
            userId,
            filename,
            originalName: file.originalname,
            mimeType: file.mimetype,
            size: processedBuffer.length,
            type,
            url,
            metadata,
            createdAt: new Date()
        };
        logger_1.default.info('Media uploaded successfully', {
            userId,
            type,
            filename,
            size: processedBuffer.length
        });
        res.json({
            success: true,
            message: 'File uploaded successfully',
            data: {
                id: mediaRecord.id,
                url: mediaRecord.url,
                filename: mediaRecord.filename,
                type: mediaRecord.type,
                metadata: mediaRecord.metadata
            }
        });
    }
    catch (error) {
        logger_1.default.error('Media upload error', { error, userId, type });
        throw (0, errorHandler_middleware_1.createValidationError)('Failed to upload file');
    }
});
/**
 * Delete media file
 */
MediaUploadController.deleteMedia = (0, errorHandler_middleware_1.asyncHandler)(async (req, res) => {
    var _b;
    const userId = (_b = req.user) === null || _b === void 0 ? void 0 : _b.id;
    const { mediaId } = req.params;
    // TODO: Verify ownership and delete file
    logger_1.default.info('Media deleted', { userId, mediaId });
    res.json({
        success: true,
        message: 'Media deleted successfully'
    });
});
/**
 * Get user's media library
 */
MediaUploadController.getMediaLibrary = (0, errorHandler_middleware_1.asyncHandler)(async (req, res) => {
    var _b;
    const userId = (_b = req.user) === null || _b === void 0 ? void 0 : _b.id;
    const { type, page = 1, limit = 20 } = req.query;
    // TODO: Fetch from database
    const media = [
        {
            id: 'media_1',
            url: '/uploads/logo/example.png',
            filename: 'example.png',
            type: 'logo',
            createdAt: new Date()
        }
    ];
    logger_1.default.info('Media library fetched', { userId, type });
    res.json({
        success: true,
        data: media,
        pagination: {
            page: Number(page),
            limit: Number(limit),
            total: media.length
        }
    });
});
exports.default = MediaUploadController;
//# sourceMappingURL=mediaUploadController.js.map
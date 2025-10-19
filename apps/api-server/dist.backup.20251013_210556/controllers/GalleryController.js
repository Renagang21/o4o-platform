"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.GalleryController = void 0;
const connection_1 = require("../database/connection");
const MediaFile_1 = require("../entities/MediaFile");
const multer_1 = __importDefault(require("multer"));
const path_1 = __importDefault(require("path"));
const promises_1 = __importDefault(require("fs/promises"));
const sharp_1 = __importDefault(require("sharp"));
const crypto_1 = __importDefault(require("crypto"));
// Configure multer for gallery image uploads
const storage = multer_1.default.diskStorage({
    destination: async (req, file, cb) => {
        const uploadDir = path_1.default.join(process.cwd(), 'public', 'uploads', 'gallery', new Date().getFullYear().toString(), (new Date().getMonth() + 1).toString().padStart(2, '0'));
        try {
            await promises_1.default.mkdir(uploadDir, { recursive: true });
            cb(null, uploadDir);
        }
        catch (error) {
            cb(error, uploadDir);
        }
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + crypto_1.default.randomBytes(6).toString('hex');
        const ext = path_1.default.extname(file.originalname);
        const name = path_1.default.basename(file.originalname, ext);
        const safeName = name.replace(/[^a-z0-9]/gi, '-').toLowerCase();
        cb(null, `${safeName}-${uniqueSuffix}${ext}`);
    }
});
const upload = (0, multer_1.default)({
    storage,
    limits: {
        fileSize: 10 * 1024 * 1024, // 10MB limit for images
    },
    fileFilter: (req, file, cb) => {
        // Only allow image files for gallery
        const allowedMimes = [
            'image/jpeg',
            'image/jpg',
            'image/png',
            'image/gif',
            'image/webp',
            'image/svg+xml'
        ];
        if (allowedMimes.includes(file.mimetype)) {
            cb(null, true);
        }
        else {
            cb(new Error(`Only image files are allowed. Received: ${file.mimetype}`));
        }
    }
});
class GalleryController {
    constructor() {
        /**
         * Upload images for gallery
         */
        this.uploadGalleryImages = [
            upload.array('files', 10), // Allow up to 10 images at once
            async (req, res) => {
                var _a;
                try {
                    const files = req.files;
                    if (!files || files.length === 0) {
                        return res.status(400).json({
                            success: false,
                            error: 'No files uploaded'
                        });
                    }
                    const { folder } = req.body;
                    const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
                    const uploadedImages = [];
                    for (const file of files) {
                        // Get image dimensions
                        let dimensions = { width: 0, height: 0 };
                        try {
                            const metadata = await (0, sharp_1.default)(file.path).metadata();
                            dimensions = { width: metadata.width || 0, height: metadata.height || 0 };
                        }
                        catch (error) {
                            // Error log removed
                        }
                        // Generate thumbnails and variants
                        const variants = await this.generateImageVariants(file.path, file.filename);
                        // Generate URL path
                        const uploadPath = file.path.replace(process.cwd() + '/public', '').replace(/\\/g, '/');
                        const fileUrl = uploadPath;
                        const thumbnailUrl = variants.thumbnail || fileUrl;
                        // Create media file entity
                        const mediaFile = new MediaFile_1.MediaFile();
                        mediaFile.filename = file.filename;
                        mediaFile.originalName = file.originalname;
                        mediaFile.url = fileUrl;
                        mediaFile.mimeType = file.mimetype;
                        mediaFile.size = file.size;
                        mediaFile.width = dimensions.width;
                        mediaFile.height = dimensions.height;
                        mediaFile.uploadedBy = userId;
                        mediaFile.metadata = {
                            thumbnailUrl,
                            variants
                        };
                        if (folder) {
                            mediaFile.folderId = folder;
                        }
                        const savedFile = await this.mediaRepository.save(mediaFile);
                        uploadedImages.push({
                            id: savedFile.id,
                            url: savedFile.url,
                            thumbnailUrl,
                            filename: savedFile.filename,
                            size: savedFile.size,
                            width: dimensions.width,
                            height: dimensions.height,
                            mimeType: savedFile.mimeType,
                            alt: savedFile.altText || '',
                            caption: savedFile.caption || '',
                            uploadedAt: savedFile.uploadedAt
                        });
                    }
                    res.json({
                        success: true,
                        data: uploadedImages
                    });
                }
                catch (error) {
                    // Error log removed
                    res.status(500).json({
                        success: false,
                        error: 'Failed to upload gallery images',
                        message: error.message
                    });
                }
            }
        ];
    }
    get mediaRepository() {
        return connection_1.AppDataSource.getRepository(MediaFile_1.MediaFile);
    }
    /**
     * Generate image thumbnails and variants
     */
    async generateImageVariants(imagePath, filename) {
        const variants = {};
        const baseDir = path_1.default.join(process.cwd(), 'public', 'uploads', 'gallery');
        const sizes = [
            { name: 'thumbnail', width: 150, height: 150 },
            { name: 'small', width: 300, height: 300 },
            { name: 'medium', width: 768, height: 768 },
            { name: 'large', width: 1024, height: 1024 }
        ];
        for (const size of sizes) {
            try {
                const variantDir = path_1.default.join(baseDir, size.name);
                await promises_1.default.mkdir(variantDir, { recursive: true });
                const variantFilename = `${size.name}-${filename}`;
                const variantPath = path_1.default.join(variantDir, variantFilename);
                await (0, sharp_1.default)(imagePath)
                    .resize(size.width, size.height, {
                    fit: 'inside',
                    withoutEnlargement: true
                })
                    .jpeg({ quality: 85 })
                    .toFile(variantPath);
                variants[size.name] = `/uploads/gallery/${size.name}/${variantFilename}`;
            }
            catch (error) {
                // Error log removed
            }
        }
        return variants;
    }
    /**
     * Get gallery images with pagination
     */
    async getGalleryImages(req, res) {
        try {
            const { page = 1, limit = 20, search = '', folder = '', sortBy = 'uploadedAt', order = 'DESC' } = req.query;
            const queryBuilder = this.mediaRepository.createQueryBuilder('media');
            // Filter only images by MIME type
            queryBuilder.where('media.mimeType LIKE :imageType', { imageType: 'image/%' });
            // Apply search filter
            if (search) {
                queryBuilder.andWhere('(media.filename LIKE :search OR media.altText LIKE :search OR media.caption LIKE :search)', { search: `%${search}%` });
            }
            // Apply folder filter
            if (folder) {
                queryBuilder.andWhere('media.folderId = :folder', { folder });
            }
            // Apply sorting
            const validSortFields = ['uploadedAt', 'filename', 'size'];
            const sortField = validSortFields.includes(sortBy) ? sortBy : 'uploadedAt';
            const sortOrder = order.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';
            queryBuilder.orderBy(`media.${sortField}`, sortOrder);
            // Apply pagination
            const pageNum = parseInt(page) || 1;
            const limitNum = parseInt(limit) || 20;
            const skip = (pageNum - 1) * limitNum;
            queryBuilder.skip(skip).take(limitNum);
            // Execute query
            const [items, total] = await queryBuilder.getManyAndCount();
            // Format response
            const formattedItems = items.map(item => {
                const metadata = item.metadata || {};
                return {
                    id: item.id,
                    url: item.url,
                    thumbnailUrl: metadata.thumbnailUrl || item.url,
                    filename: item.filename,
                    width: metadata.width || 0,
                    height: metadata.height || 0,
                    size: item.size,
                    alt: item.altText || '',
                    caption: item.caption || ''
                };
            });
            res.json({
                success: true,
                data: {
                    items: formattedItems,
                    total,
                    page: pageNum,
                    pages: Math.ceil(total / limitNum)
                }
            });
        }
        catch (error) {
            // Error log removed
            res.status(500).json({
                success: false,
                error: 'Failed to fetch gallery images',
                message: error.message
            });
        }
    }
    /**
     * Update image metadata (alt text, caption)
     */
    async updateGalleryImage(req, res) {
        try {
            const { id } = req.params;
            const { alt, caption, description } = req.body;
            // Validate UUID format
            const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
            if (!uuidRegex.test(id)) {
                return res.status(400).json({
                    success: false,
                    error: 'Invalid media ID format. Expected UUID.',
                    code: 'INVALID_UUID'
                });
            }
            const mediaFile = await this.mediaRepository.findOne({ where: { id } });
            if (!mediaFile) {
                return res.status(404).json({
                    success: false,
                    error: 'Image not found'
                });
            }
            // Update fields if provided
            if (alt !== undefined)
                mediaFile.altText = alt;
            if (caption !== undefined)
                mediaFile.caption = caption;
            if (description !== undefined)
                mediaFile.description = description;
            const updatedFile = await this.mediaRepository.save(mediaFile);
            res.json({
                success: true,
                data: {
                    id: updatedFile.id,
                    alt: updatedFile.altText,
                    caption: updatedFile.caption,
                    description: updatedFile.description,
                    updatedAt: updatedFile.updatedAt
                }
            });
        }
        catch (error) {
            // Error log removed
            res.status(500).json({
                success: false,
                error: 'Failed to update image',
                message: error.message
            });
        }
    }
    /**
     * Delete gallery image
     */
    async deleteGalleryImage(req, res) {
        var _a, _b;
        try {
            const { id } = req.params;
            const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
            // Validate UUID format
            const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
            if (!uuidRegex.test(id)) {
                return res.status(400).json({
                    success: false,
                    error: 'Invalid media ID format. Expected UUID.',
                    code: 'INVALID_UUID'
                });
            }
            const mediaFile = await this.mediaRepository.findOne({ where: { id } });
            if (!mediaFile) {
                return res.status(404).json({
                    success: false,
                    error: 'Image not found'
                });
            }
            // Check permissions (only uploader or admin can delete)
            if (mediaFile.uploadedBy !== userId && ((_b = req.user) === null || _b === void 0 ? void 0 : _b.role) !== 'admin') {
                return res.status(403).json({
                    success: false,
                    error: 'Permission denied'
                });
            }
            // Delete physical files
            try {
                const filePath = path_1.default.join(process.cwd(), 'public', mediaFile.url);
                await promises_1.default.unlink(filePath).catch(() => { });
                // Delete variants if they exist
                const metadata = mediaFile.metadata;
                if (metadata === null || metadata === void 0 ? void 0 : metadata.variants) {
                    for (const variant of Object.values(metadata.variants)) {
                        if (variant) {
                            const variantPath = path_1.default.join(process.cwd(), 'public', variant);
                            await promises_1.default.unlink(variantPath).catch(() => { });
                        }
                    }
                }
            }
            catch (error) {
                // Error log removed
            }
            // Delete from database
            await this.mediaRepository.remove(mediaFile);
            res.json({
                success: true,
                message: 'Image deleted successfully'
            });
        }
        catch (error) {
            // Error log removed
            res.status(500).json({
                success: false,
                error: 'Failed to delete image',
                message: error.message
            });
        }
    }
}
exports.GalleryController = GalleryController;
//# sourceMappingURL=GalleryController.js.map
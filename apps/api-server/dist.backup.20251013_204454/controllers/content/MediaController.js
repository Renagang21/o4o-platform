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
exports.MediaController = void 0;
const connection_1 = require("../../database/connection");
const Media_1 = require("../../entities/Media");
const User_1 = require("../../entities/User");
const logger_1 = __importDefault(require("../../utils/logger"));
const typeorm_1 = require("typeorm");
const path = __importStar(require("path"));
const fs = __importStar(require("fs"));
const sharp_1 = __importDefault(require("sharp"));
class MediaController {
    constructor() {
        // POST /api/media/upload - 파일 업로드
        this.uploadMedia = async (req, res) => {
            var _a;
            try {
                // Temporarily allow upload without authentication for admin dashboard
                const userId = ((_a = req.user) === null || _a === void 0 ? void 0 : _a.id) || null;
                const files = req.files;
                if (!files || files.length === 0) {
                    res.status(400).json({
                        success: false,
                        error: 'No files uploaded'
                    });
                    return;
                }
                const uploadedMedia = [];
                for (const file of files) {
                    try {
                        // Validate file type
                        const allowedTypes = ['image/', 'application/pdf', 'application/json', 'text/', 'video/', 'audio/', 'application/octet-stream'];
                        const isAllowedType = allowedTypes.some(type => file.mimetype.startsWith(type));
                        if (!isAllowedType) {
                            logger_1.default.warn(`Rejected file upload: ${file.originalname} (${file.mimetype})`);
                            continue;
                        }
                        // Additional validation for application/octet-stream
                        if (file.mimetype === 'application/octet-stream') {
                            const allowedExtensions = ['.json', '.txt', '.md', '.csv', '.log', '.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg', '.mp4', '.webm', '.mov', '.avi', '.mp3', '.wav', '.ogg', '.pdf'];
                            const ext = path.extname(file.originalname).toLowerCase();
                            if (!allowedExtensions.includes(ext)) {
                                logger_1.default.warn(`Rejected octet-stream file with disallowed extension: ${file.originalname}`);
                                continue;
                            }
                        }
                        // Determine file category and upload path
                        const fileCategory = this.getFileCategory(file.mimetype);
                        const uploadDir = path.join(process.cwd(), 'public', 'uploads', fileCategory);
                        // Ensure upload directory exists
                        if (!fs.existsSync(uploadDir)) {
                            fs.mkdirSync(uploadDir, { recursive: true });
                        }
                        // Generate unique filename
                        const fileExtension = path.extname(file.originalname);
                        const fileName = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}${fileExtension}`;
                        const filePath = path.join(uploadDir, fileName);
                        // Save file
                        fs.writeFileSync(filePath, file.buffer);
                        // Get file stats
                        const stats = fs.statSync(filePath);
                        let width, height;
                        // Generate thumbnails for images
                        let variants = {};
                        if (file.mimetype.startsWith('image/')) {
                            try {
                                const metadata = await (0, sharp_1.default)(filePath).metadata();
                                width = metadata.width;
                                height = metadata.height;
                                // Generate image variants
                                variants = await this.generateImageVariants(filePath, fileName, fileCategory);
                            }
                            catch (sharpError) {
                                logger_1.default.error('Error processing image:', sharpError);
                            }
                        }
                        // Create media record
                        const media = this.mediaRepository.create({
                            filename: fileName,
                            originalFilename: file.originalname,
                            url: `/uploads/${fileCategory}/${fileName}`,
                            thumbnailUrl: variants.thumbnail || null,
                            mimeType: file.mimetype,
                            size: stats.size,
                            width,
                            height,
                            folderPath: `/${fileCategory}`,
                            userId,
                            variants: Object.keys(variants).length > 0 ? variants : null
                        });
                        const savedMedia = await this.mediaRepository.save(media);
                        uploadedMedia.push(this.formatMediaResponse(savedMedia));
                    }
                    catch (fileError) {
                        logger_1.default.error(`Error processing file ${file.originalname}:`, fileError);
                        continue;
                    }
                }
                if (uploadedMedia.length === 0) {
                    res.status(400).json({
                        success: false,
                        error: 'No valid files were uploaded'
                    });
                    return;
                }
                res.status(201).json({
                    success: true,
                    data: {
                        media: uploadedMedia,
                        uploadedCount: uploadedMedia.length,
                        totalFiles: files.length
                    }
                });
            }
            catch (error) {
                logger_1.default.error('Error uploading media:', error);
                res.status(500).json({
                    success: false,
                    error: 'Failed to upload media'
                });
            }
        };
        // GET /api/media - 미디어 목록
        this.getMedia = async (req, res) => {
            try {
                const { page = 1, limit = 20, search, mimeType, folder, userId, orderBy = 'createdAt', order = 'DESC' } = req.query;
                // Build where conditions
                const where = {};
                // User filter
                if (userId) {
                    where.userId = userId;
                }
                // Folder filter
                if (folder) {
                    where.folderPath = folder;
                }
                // MIME type filter
                // Note: document type filter is handled separately using query builder
                // because it requires OR conditions (text/* OR application/pdf)
                let useQueryBuilder = false;
                if (mimeType) {
                    if (mimeType === 'image') {
                        where.mimeType = (0, typeorm_1.Like)('image/%');
                    }
                    else if (mimeType === 'video') {
                        where.mimeType = (0, typeorm_1.Like)('video/%');
                    }
                    else if (mimeType === 'audio') {
                        where.mimeType = (0, typeorm_1.Like)('audio/%');
                    }
                    else if (mimeType === 'document') {
                        useQueryBuilder = true;
                    }
                    else {
                        where.mimeType = mimeType;
                    }
                }
                // Search filter - handled separately since it involves multiple fields
                if (search) {
                    // For search, we'll get all records first then filter
                    // This is not ideal for large datasets but will work for now
                }
                // Ordering
                const allowedOrderBy = ['createdAt', 'updatedAt', 'filename', 'originalFilename', 'size'];
                const orderByField = allowedOrderBy.includes(orderBy) ? orderBy : 'createdAt';
                const orderDirection = order === 'ASC' ? 'ASC' : 'DESC';
                // Get total count and media list
                let total;
                let media;
                const skip = (Number(page) - 1) * Number(limit);
                if (useQueryBuilder) {
                    // Use query builder for document type filtering (requires OR conditions)
                    const queryBuilder = this.mediaRepository.createQueryBuilder('media')
                        .leftJoinAndSelect('media.user', 'user'); // Join user for author info
                    // Apply document type filter
                    queryBuilder.where('media.mimeType = :pdf', { pdf: 'application/pdf' })
                        .orWhere('media.mimeType LIKE :text', { text: 'text/%' })
                        .orWhere('media.mimeType LIKE :doc', { doc: '%document%' })
                        .orWhere('media.mimeType LIKE :word', { word: '%word%' })
                        .orWhere('media.mimeType LIKE :sheet', { sheet: '%sheet%' })
                        .orWhere('media.mimeType LIKE :presentation', { presentation: '%presentation%' });
                    // Apply other filters
                    if (userId) {
                        queryBuilder.andWhere('media.userId = :userId', { userId });
                    }
                    if (folder) {
                        queryBuilder.andWhere('media.folderPath = :folder', { folder });
                    }
                    // Get total count
                    total = await queryBuilder.getCount();
                    // Get paginated results
                    media = await queryBuilder
                        .orderBy(`media.${orderByField}`, orderDirection)
                        .skip(skip)
                        .take(Number(limit))
                        .getMany();
                }
                else {
                    // Use standard find for other types
                    total = await this.mediaRepository.count({ where });
                    media = await this.mediaRepository.find({
                        where,
                        relations: ['user'], // Re-enabled to show author info
                        order: { [orderByField]: orderDirection },
                        skip,
                        take: Number(limit)
                    });
                }
                // Filter by search if provided
                let filteredMedia = media;
                if (search) {
                    const searchLower = String(search).toLowerCase();
                    filteredMedia = media.filter(item => {
                        var _a, _b, _c;
                        return ((_a = item.filename) === null || _a === void 0 ? void 0 : _a.toLowerCase().includes(searchLower)) ||
                            ((_b = item.originalFilename) === null || _b === void 0 ? void 0 : _b.toLowerCase().includes(searchLower)) ||
                            ((_c = item.altText) === null || _c === void 0 ? void 0 : _c.toLowerCase().includes(searchLower));
                    });
                }
                // Calculate storage stats
                const storageStats = await this.getStorageStats();
                res.json({
                    success: true,
                    data: {
                        media: filteredMedia.map(item => this.formatMediaResponse(item)),
                        pagination: {
                            page: Number(page),
                            limit: Number(limit),
                            total,
                            totalPages: Math.ceil(total / Number(limit))
                        },
                        stats: storageStats
                    }
                });
            }
            catch (error) {
                logger_1.default.error('Error getting media:', error);
                res.status(500).json({
                    success: false,
                    error: 'Failed to retrieve media'
                });
            }
        };
        // GET /api/media/:id - 미디어 상세
        this.getMediaById = async (req, res) => {
            try {
                const { id } = req.params;
                const media = await this.mediaRepository.findOne({
                    where: { id }
                    // relations: ['user'] // Temporarily disabled due to DB schema issue
                });
                if (!media) {
                    res.status(404).json({
                        success: false,
                        error: 'Media not found'
                    });
                    return;
                }
                // Get usage information (where this media is used)
                const usage = await this.getMediaUsage(id);
                res.json({
                    success: true,
                    data: {
                        media: this.formatMediaResponse(media),
                        usage
                    }
                });
            }
            catch (error) {
                logger_1.default.error('Error getting media:', error);
                res.status(500).json({
                    success: false,
                    error: 'Failed to retrieve media'
                });
            }
        };
        // PUT /api/media/:id - 미디어 정보 수정
        this.updateMedia = async (req, res) => {
            var _a;
            try {
                const { id } = req.params;
                const { altText, caption, description, folderPath } = req.body;
                const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
                if (!userId) {
                    res.status(401).json({
                        success: false,
                        error: 'Authentication required'
                    });
                    return;
                }
                const media = await this.mediaRepository.findOne({ where: { id } });
                if (!media) {
                    res.status(404).json({
                        success: false,
                        error: 'Media not found'
                    });
                    return;
                }
                // Update media properties
                if (altText !== undefined)
                    media.altText = altText;
                if (caption !== undefined)
                    media.caption = caption;
                if (description !== undefined)
                    media.description = description;
                if (folderPath !== undefined)
                    media.folderPath = folderPath;
                media.updatedAt = new Date();
                const savedMedia = await this.mediaRepository.save(media);
                // Load complete media with relations
                const completeMedia = await this.mediaRepository.findOne({
                    where: { id: savedMedia.id }
                    // relations: ['user'] // Temporarily disabled due to DB schema issue
                });
                res.json({
                    success: true,
                    data: {
                        media: this.formatMediaResponse(completeMedia)
                    }
                });
            }
            catch (error) {
                logger_1.default.error('Error updating media:', error);
                res.status(500).json({
                    success: false,
                    error: 'Failed to update media'
                });
            }
        };
        // DELETE /api/media/:id - 미디어 삭제
        this.deleteMedia = async (req, res) => {
            var _a, _b;
            try {
                const { id } = req.params;
                const { deleteFiles = true } = req.query;
                const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
                if (!userId) {
                    res.status(401).json({
                        success: false,
                        error: 'Authentication required'
                    });
                    return;
                }
                const media = await this.mediaRepository.findOne({ where: { id } });
                if (!media) {
                    res.status(404).json({
                        success: false,
                        error: 'Media not found'
                    });
                    return;
                }
                // Check if media is in use
                const usage = await this.getMediaUsage(id);
                if (usage.posts.length > 0 || usage.pages.length > 0) {
                    res.status(409).json({
                        success: false,
                        error: 'Media is currently in use and cannot be deleted',
                        data: { usage }
                    });
                    return;
                }
                // Delete physical files if requested
                if (deleteFiles === 'true') {
                    try {
                        const filePath = path.join(process.cwd(), 'public', 'uploads', ((_b = media.folderPath) === null || _b === void 0 ? void 0 : _b.substring(1)) || '', media.filename);
                        if (fs.existsSync(filePath)) {
                            fs.unlinkSync(filePath);
                        }
                        // Delete variants
                        if (media.variants) {
                            for (const [size, url] of Object.entries(media.variants)) {
                                const variantPath = path.join(process.cwd(), 'public', 'uploads', url.replace('/uploads/', ''));
                                if (fs.existsSync(variantPath)) {
                                    fs.unlinkSync(variantPath);
                                }
                            }
                        }
                    }
                    catch (fileError) {
                        logger_1.default.error('Error deleting physical files:', fileError);
                        // Continue with database deletion even if file deletion fails
                    }
                }
                // Delete from database
                await this.mediaRepository.remove(media);
                res.json({
                    success: true,
                    message: 'Media deleted successfully'
                });
            }
            catch (error) {
                logger_1.default.error('Error deleting media:', error);
                res.status(500).json({
                    success: false,
                    error: 'Failed to delete media'
                });
            }
        };
    }
    get mediaRepository() {
        return connection_1.AppDataSource.getRepository(Media_1.Media);
    }
    get userRepository() {
        return connection_1.AppDataSource.getRepository(User_1.User);
    }
    // Private helper methods
    getFileCategory(mimeType) {
        if (mimeType.startsWith('image/'))
            return 'images';
        if (mimeType.startsWith('video/'))
            return 'videos';
        if (mimeType.startsWith('audio/'))
            return 'audio';
        if (mimeType === 'application/pdf' ||
            mimeType === 'application/json' ||
            mimeType === 'application/octet-stream' ||
            mimeType.startsWith('text/'))
            return 'documents';
        return 'others';
    }
    async generateImageVariants(originalPath, fileName, category) {
        const variants = {};
        const baseName = path.parse(fileName).name;
        const extension = path.parse(fileName).ext;
        const sizes = {
            thumbnail: { width: 150, height: 150 },
            small: { width: 300, height: 300 },
            medium: { width: 768, height: 768 },
            large: { width: 1024, height: 1024 }
        };
        try {
            for (const [sizeName, dimensions] of Object.entries(sizes)) {
                const variantFileName = `${baseName}-${sizeName}${extension}`;
                const variantPath = path.join(process.cwd(), 'public', 'uploads', category, variantFileName);
                await (0, sharp_1.default)(originalPath)
                    .resize(dimensions.width, dimensions.height, {
                    fit: 'inside',
                    withoutEnlargement: true
                })
                    .toFile(variantPath);
                variants[sizeName] = `/uploads/${category}/${variantFileName}`;
            }
        }
        catch (error) {
            logger_1.default.error('Error generating image variants:', error);
        }
        return variants;
    }
    async getStorageStats() {
        try {
            // Use aggregation queries instead of loading all records
            const totalFiles = await this.mediaRepository.count();
            // Get total size using query builder for better performance
            const sizeResult = await this.mediaRepository
                .createQueryBuilder('media')
                .select('SUM(media.size)', 'totalSize')
                .getRawOne();
            const totalSize = parseInt((sizeResult === null || sizeResult === void 0 ? void 0 : sizeResult.totalSize) || '0', 10);
            // Get breakdown counts efficiently
            const [images, videos, audio] = await Promise.all([
                this.mediaRepository.count({ where: { mimeType: (0, typeorm_1.Like)('image/%') } }),
                this.mediaRepository.count({ where: { mimeType: (0, typeorm_1.Like)('video/%') } }),
                this.mediaRepository.count({ where: { mimeType: (0, typeorm_1.Like)('audio/%') } })
            ]);
            // Documents count using raw query for OR condition
            const documentsResult = await this.mediaRepository
                .createQueryBuilder('media')
                .where('media.mimeType = :pdf', { pdf: 'application/pdf' })
                .orWhere('media.mimeType LIKE :text', { text: 'text/%' })
                .getCount();
            return {
                totalFiles,
                totalSize,
                totalSizeMB: Math.round(totalSize / 1024 / 1024 * 100) / 100,
                breakdown: {
                    images,
                    videos,
                    audio,
                    documents: documentsResult
                }
            };
        }
        catch (error) {
            logger_1.default.error('Error getting storage stats:', error);
            return {
                totalFiles: 0,
                totalSize: 0,
                totalSizeMB: 0,
                breakdown: { images: 0, videos: 0, audio: 0, documents: 0 }
            };
        }
    }
    async getMediaUsage(mediaId) {
        // This is a simplified version - in a real implementation,
        // you'd need to scan post/page content for media references
        try {
            // For now, return empty usage to avoid queryBuilder issues
            // This can be implemented later when the basic functionality works
            return {
                posts: [],
                pages: [],
                totalUsages: 0
            };
        }
        catch (error) {
            logger_1.default.error('Error getting media usage:', error);
            return { posts: [], pages: [], totalUsages: 0 };
        }
    }
    formatMediaResponse(media) {
        var _a, _b, _c, _d;
        // API server serves static files via express.static at /uploads
        // Use API_BASE_URL since files are served from API server, not webserver
        const baseUrl = process.env.API_BASE_URL || 'https://api.neture.co.kr';
        // Convert relative URLs to absolute URLs
        const makeAbsolute = (url) => {
            if (!url)
                return url;
            if (url.startsWith('http'))
                return url;
            return `${baseUrl}${url}`;
        };
        // Process variants to have absolute URLs
        const processedVariants = media.variants ?
            Object.entries(media.variants).reduce((acc, [key, value]) => {
                acc[key] = makeAbsolute(value);
                return acc;
            }, {}) : null;
        return {
            id: media.id,
            filename: media.filename,
            originalFilename: media.originalFilename,
            url: makeAbsolute(media.url),
            thumbnailUrl: makeAbsolute(media.thumbnailUrl),
            mimeType: media.mimeType,
            size: media.size,
            sizeFormatted: this.formatFileSize(media.size),
            width: media.width,
            height: media.height,
            altText: media.altText,
            caption: media.caption,
            description: media.description,
            folderPath: media.folderPath,
            variants: processedVariants,
            uploadedBy: media.user ? {
                id: media.user.id,
                name: media.user.name,
                email: media.user.email
            } : null,
            createdAt: media.createdAt,
            updatedAt: media.updatedAt,
            isImage: ((_a = media.mimeType) === null || _a === void 0 ? void 0 : _a.startsWith('image/')) || false,
            isVideo: ((_b = media.mimeType) === null || _b === void 0 ? void 0 : _b.startsWith('video/')) || false,
            isAudio: ((_c = media.mimeType) === null || _c === void 0 ? void 0 : _c.startsWith('audio/')) || false,
            isDocument: media.mimeType === 'application/pdf' || ((_d = media.mimeType) === null || _d === void 0 ? void 0 : _d.startsWith('text/')) || false
        };
    }
    formatFileSize(bytes) {
        if (!bytes)
            return '0 B';
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(1024));
        return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
    }
}
exports.MediaController = MediaController;
//# sourceMappingURL=MediaController.js.map
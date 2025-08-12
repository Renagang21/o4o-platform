"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MediaController = void 0;
const connection_1 = require("../database/connection");
const MediaFile_1 = require("../entities/MediaFile");
const MediaFolder_1 = require("../entities/MediaFolder");
const multer_1 = __importDefault(require("multer"));
const path_1 = __importDefault(require("path"));
const promises_1 = __importDefault(require("fs/promises"));
// import sharp from 'sharp'; // Optional - for image processing
const crypto_1 = __importDefault(require("crypto"));
// Configure multer for file uploads
const storage = multer_1.default.diskStorage({
    destination: async (req, file, cb) => {
        const uploadDir = path_1.default.join(process.cwd(), 'uploads', new Date().getFullYear().toString(), (new Date().getMonth() + 1).toString().padStart(2, '0'));
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
        fileSize: 50 * 1024 * 1024, // 50MB limit
    },
    fileFilter: (req, file, cb) => {
        // Allowed file types
        const allowedMimes = [
            'image/jpeg',
            'image/png',
            'image/gif',
            'image/webp',
            'image/svg+xml',
            'video/mp4',
            'video/webm',
            'audio/mpeg',
            'audio/wav',
            'application/pdf',
            'application/msword',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'application/vnd.ms-excel',
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'text/plain',
            'text/csv'
        ];
        if (allowedMimes.includes(file.mimetype)) {
            cb(null, true);
        }
        else {
            cb(new Error(`File type ${file.mimetype} is not allowed`));
        }
    }
});
class MediaController {
    constructor() {
        /**
         * Upload single file
         */
        this.uploadSingle = [
            upload.single('file'),
            async (req, res) => {
                var _a;
                try {
                    if (!req.file) {
                        return res.status(400).json({
                            success: false,
                            message: 'No file uploaded'
                        });
                    }
                    const { folderId, alt, caption, description } = req.body;
                    const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
                    // Generate URL path
                    const uploadPath = req.file.path.replace(process.cwd(), '').replace(/\\/g, '/');
                    const fileUrl = `/uploads${uploadPath.split('/uploads')[1]}`;
                    // Get file metadata
                    let metadata = {
                        size: req.file.size,
                        originalName: req.file.originalname
                    };
                    // If it's an image, store image type info (sharp processing disabled for now)
                    if (req.file.mimetype.startsWith('image/')) {
                        metadata.isImage = true;
                        metadata.imageType = req.file.mimetype.split('/')[1];
                        // Note: Image processing with sharp can be enabled later
                        // by uncommenting the import and adding thumbnail generation
                    }
                    // Create media file record
                    const mediaFile = this.mediaRepository.create({
                        filename: req.file.filename,
                        originalName: req.file.originalname,
                        path: uploadPath,
                        url: fileUrl,
                        mimeType: req.file.mimetype,
                        size: req.file.size,
                        folderId: folderId || null,
                        uploadedBy: userId,
                        altText: alt,
                        caption,
                        description,
                        metadata
                    });
                    const savedFile = await this.mediaRepository.save(mediaFile);
                    res.json({
                        success: true,
                        message: 'File uploaded successfully',
                        data: savedFile
                    });
                }
                catch (error) {
                    console.error('Error uploading file:', error);
                    // Clean up uploaded file on error
                    if (req.file) {
                        try {
                            await promises_1.default.unlink(req.file.path);
                        }
                        catch (unlinkError) {
                            console.error('Error deleting file:', unlinkError);
                        }
                    }
                    res.status(500).json({
                        success: false,
                        message: 'Failed to upload file',
                        error: error.message
                    });
                }
            }
        ];
        /**
         * Upload multiple files
         */
        this.uploadMultiple = [
            upload.array('files', 10),
            async (req, res) => {
                var _a;
                try {
                    const files = req.files;
                    if (!files || files.length === 0) {
                        return res.status(400).json({
                            success: false,
                            message: 'No files uploaded'
                        });
                    }
                    const { folderId } = req.body;
                    const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
                    const uploadedFiles = [];
                    for (const file of files) {
                        const uploadPath = file.path.replace(process.cwd(), '').replace(/\\/g, '/');
                        const fileUrl = `/uploads${uploadPath.split('/uploads')[1]}`;
                        let metadata = {
                            size: file.size,
                            originalName: file.originalname
                        };
                        // Store image metadata (sharp processing disabled for now)
                        if (file.mimetype.startsWith('image/')) {
                            metadata.isImage = true;
                            metadata.imageType = file.mimetype.split('/')[1];
                        }
                        const mediaFile = this.mediaRepository.create({
                            filename: file.filename,
                            originalName: file.originalname,
                            path: uploadPath,
                            url: fileUrl,
                            mimeType: file.mimetype,
                            size: file.size,
                            folderId: folderId || null,
                            uploadedBy: userId,
                            metadata
                        });
                        const savedFile = await this.mediaRepository.save(mediaFile);
                        uploadedFiles.push(savedFile);
                    }
                    res.json({
                        success: true,
                        message: `${uploadedFiles.length} files uploaded successfully`,
                        data: uploadedFiles
                    });
                }
                catch (error) {
                    console.error('Error uploading files:', error);
                    // Clean up uploaded files on error
                    if (req.files) {
                        const files = req.files;
                        for (const file of files) {
                            try {
                                await promises_1.default.unlink(file.path);
                            }
                            catch (unlinkError) {
                                console.error('Error deleting file:', unlinkError);
                            }
                        }
                    }
                    res.status(500).json({
                        success: false,
                        message: 'Failed to upload files',
                        error: error.message
                    });
                }
            }
        ];
        /**
         * Get all media files
         */
        this.getMedia = async (req, res) => {
            try {
                const { page = 1, limit = 24, type, folderId, search, sortBy = 'createdAt', sortOrder = 'DESC' } = req.query;
                const pageNum = parseInt(page);
                const limitNum = parseInt(limit);
                const skip = (pageNum - 1) * limitNum;
                const queryBuilder = this.mediaRepository.createQueryBuilder('media');
                // Apply filters
                if (type) {
                    queryBuilder.andWhere('media.mimeType LIKE :type', { type: `${type}%` });
                }
                if (folderId) {
                    queryBuilder.andWhere('media.folderId = :folderId', { folderId });
                }
                if (search) {
                    queryBuilder.andWhere('(media.name ILIKE :search OR media.originalName ILIKE :search OR media.alt ILIKE :search)', { search: `%${search}%` });
                }
                // Apply sorting
                queryBuilder.orderBy(`media.${sortBy}`, sortOrder);
                // Get total count
                const total = await queryBuilder.getCount();
                // Get paginated results
                const media = await queryBuilder
                    .skip(skip)
                    .take(limitNum)
                    .getMany();
                res.json({
                    success: true,
                    data: media,
                    pagination: {
                        page: pageNum,
                        limit: limitNum,
                        total,
                        totalPages: Math.ceil(total / limitNum)
                    }
                });
            }
            catch (error) {
                console.error('Error fetching media:', error);
                res.status(500).json({
                    success: false,
                    message: 'Failed to fetch media',
                    error: error.message
                });
            }
        };
        /**
         * Get media by ID
         */
        this.getMediaById = async (req, res) => {
            try {
                const { id } = req.params;
                const media = await this.mediaRepository.findOne({
                    where: { id },
                    relations: ['folder', 'uploadedBy']
                });
                if (!media) {
                    return res.status(404).json({
                        success: false,
                        message: 'Media file not found'
                    });
                }
                res.json({
                    success: true,
                    data: media
                });
            }
            catch (error) {
                console.error('Error fetching media:', error);
                res.status(500).json({
                    success: false,
                    message: 'Failed to fetch media',
                    error: error.message
                });
            }
        };
        /**
         * Update media
         */
        this.updateMedia = async (req, res) => {
            try {
                const { id } = req.params;
                const { alt, caption, description, folderId } = req.body;
                const media = await this.mediaRepository.findOne({ where: { id } });
                if (!media) {
                    return res.status(404).json({
                        success: false,
                        message: 'Media file not found'
                    });
                }
                // Update fields
                if (alt !== undefined)
                    media.altText = alt;
                if (caption !== undefined)
                    media.caption = caption;
                if (description !== undefined)
                    media.description = description;
                if (folderId !== undefined)
                    media.folderId = folderId;
                const updatedMedia = await this.mediaRepository.save(media);
                res.json({
                    success: true,
                    message: 'Media updated successfully',
                    data: updatedMedia
                });
            }
            catch (error) {
                console.error('Error updating media:', error);
                res.status(500).json({
                    success: false,
                    message: 'Failed to update media',
                    error: error.message
                });
            }
        };
        /**
         * Delete media
         */
        this.deleteMedia = async (req, res) => {
            var _a, _b;
            try {
                const { id } = req.params;
                const media = await this.mediaRepository.findOne({ where: { id } });
                if (!media) {
                    return res.status(404).json({
                        success: false,
                        message: 'Media file not found'
                    });
                }
                // Delete physical file
                try {
                    const filePath = path_1.default.join(process.cwd(), media.path);
                    await promises_1.default.unlink(filePath);
                    // Delete thumbnail if exists
                    if ((_a = media.metadata) === null || _a === void 0 ? void 0 : _a.thumbnail) {
                        const thumbnailPath = path_1.default.join(process.cwd(), media.metadata.thumbnail);
                        await promises_1.default.unlink(thumbnailPath);
                    }
                    // Delete medium size if exists
                    if ((_b = media.metadata) === null || _b === void 0 ? void 0 : _b.medium) {
                        const mediumPath = path_1.default.join(process.cwd(), media.metadata.medium);
                        await promises_1.default.unlink(mediumPath);
                    }
                }
                catch (error) {
                    console.error('Error deleting physical file:', error);
                }
                // Delete database record
                await this.mediaRepository.delete(id);
                res.json({
                    success: true,
                    message: 'Media deleted successfully'
                });
            }
            catch (error) {
                console.error('Error deleting media:', error);
                res.status(500).json({
                    success: false,
                    message: 'Failed to delete media',
                    error: error.message
                });
            }
        };
        /**
         * Create folder
         */
        this.createFolder = async (req, res) => {
            var _a;
            try {
                const { name, parentId } = req.body;
                const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
                if (!name) {
                    return res.status(400).json({
                        success: false,
                        message: 'Folder name is required'
                    });
                }
                // Check if folder with same name exists in parent
                const existingFolder = await this.folderRepository.findOne({
                    where: {
                        name,
                        parentId: parentId || null
                    }
                });
                if (existingFolder) {
                    return res.status(400).json({
                        success: false,
                        message: 'Folder with this name already exists'
                    });
                }
                // Create folder slug
                let folderSlug = name.toLowerCase().replace(/[^a-z0-9]/gi, '-');
                if (parentId) {
                    const parent = await this.folderRepository.findOne({ where: { id: parentId } });
                    if (parent) {
                        folderSlug = parent.slug + '/' + folderSlug;
                    }
                }
                const folder = this.folderRepository.create({
                    name,
                    slug: folderSlug,
                    parentId: parentId || null
                });
                const savedFolder = await this.folderRepository.save(folder);
                res.json({
                    success: true,
                    message: 'Folder created successfully',
                    data: savedFolder
                });
            }
            catch (error) {
                console.error('Error creating folder:', error);
                res.status(500).json({
                    success: false,
                    message: 'Failed to create folder',
                    error: error.message
                });
            }
        };
        /**
         * Get folders
         */
        this.getFolders = async (req, res) => {
            try {
                const { parentId } = req.query;
                const queryBuilder = this.folderRepository.createQueryBuilder('folder');
                if (parentId) {
                    queryBuilder.where('folder.parentId = :parentId', { parentId });
                }
                else {
                    queryBuilder.where('folder.parentId IS NULL');
                }
                const folders = await queryBuilder
                    .orderBy('folder.name', 'ASC')
                    .getMany();
                res.json({
                    success: true,
                    data: folders,
                    total: folders.length
                });
            }
            catch (error) {
                console.error('Error fetching folders:', error);
                res.status(500).json({
                    success: false,
                    message: 'Failed to fetch folders',
                    error: error.message
                });
            }
        };
        /**
         * Delete folder
         */
        this.deleteFolder = async (req, res) => {
            try {
                const { id } = req.params;
                // Check if folder has media files
                const mediaCount = await this.mediaRepository.count({ where: { folderId: id } });
                if (mediaCount > 0) {
                    return res.status(400).json({
                        success: false,
                        message: 'Cannot delete folder with media files'
                    });
                }
                // Check if folder has subfolders
                const subfolderCount = await this.folderRepository.count({ where: { parentId: id } });
                if (subfolderCount > 0) {
                    return res.status(400).json({
                        success: false,
                        message: 'Cannot delete folder with subfolders'
                    });
                }
                await this.folderRepository.delete(id);
                res.json({
                    success: true,
                    message: 'Folder deleted successfully'
                });
            }
            catch (error) {
                console.error('Error deleting folder:', error);
                res.status(500).json({
                    success: false,
                    message: 'Failed to delete folder',
                    error: error.message
                });
            }
        };
        this.mediaRepository = connection_1.AppDataSource.getRepository(MediaFile_1.MediaFile);
        this.folderRepository = connection_1.AppDataSource.getRepository(MediaFolder_1.MediaFolder);
    }
}
exports.MediaController = MediaController;
//# sourceMappingURL=MediaController.js.map
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SignageController = void 0;
const connection_1 = require("../database/connection");
const SignageContent_1 = require("../entities/SignageContent");
const Store_1 = require("../entities/Store");
const StorePlaylist_1 = require("../entities/StorePlaylist");
const PlaylistItem_1 = require("../entities/PlaylistItem");
const SignageSchedule_1 = require("../entities/SignageSchedule");
const ScreenTemplate_1 = require("../entities/ScreenTemplate");
const ContentUsageLog_1 = require("../entities/ContentUsageLog");
const User_1 = require("../entities/User");
class SignageController {
    constructor() {
        this.contentRepository = connection_1.AppDataSource.getRepository(SignageContent_1.SignageContent);
        this.storeRepository = connection_1.AppDataSource.getRepository(Store_1.Store);
        this.playlistRepository = connection_1.AppDataSource.getRepository(StorePlaylist_1.StorePlaylist);
        this.playlistItemRepository = connection_1.AppDataSource.getRepository(PlaylistItem_1.PlaylistItem);
        this.scheduleRepository = connection_1.AppDataSource.getRepository(SignageSchedule_1.SignageSchedule);
        this.templateRepository = connection_1.AppDataSource.getRepository(ScreenTemplate_1.ScreenTemplate);
        this.logRepository = connection_1.AppDataSource.getRepository(ContentUsageLog_1.ContentUsageLog);
        this.userRepository = connection_1.AppDataSource.getRepository(User_1.User);
        // Removed placeholder methods for production - these methods returned hardcoded mock data
    }
    // Content Management
    async getContents(req, res) {
        try {
            const { page = 1, limit = 20, status, type, search, createdBy, isPublic } = req.query;
            const user = req.user;
            const skip = (Number(page) - 1) * Number(limit);
            const queryBuilder = this.contentRepository
                .createQueryBuilder('content')
                .leftJoinAndSelect('content.creator', 'creator')
                .leftJoinAndSelect('content.approver', 'approver');
            // Role-based filtering
            if (user.role !== 'admin') {
                if (user.role === 'customer') {
                    queryBuilder.andWhere('content.status = :status AND content.isPublic = true', { status: 'approved' });
                }
                else {
                    queryBuilder.andWhere('(content.createdBy = :userId OR (content.status = :status AND content.isPublic = true))', { userId: user.id, status: 'approved' });
                }
            }
            // Apply filters
            if (status) {
                queryBuilder.andWhere('content.status = :status', { status });
            }
            if (type) {
                queryBuilder.andWhere('content.type = :type', { type });
            }
            if (search) {
                queryBuilder.andWhere('(content.title ILIKE :search OR content.description ILIKE :search)', { search: `%${search}%` });
            }
            if (createdBy && user.role === 'admin') {
                queryBuilder.andWhere('content.createdBy = :createdBy', { createdBy });
            }
            if (isPublic !== undefined) {
                queryBuilder.andWhere('content.isPublic = :isPublic', { isPublic: isPublic === 'true' });
            }
            const [contents, total] = await queryBuilder
                .orderBy('content.createdAt', 'DESC')
                .skip(skip)
                .take(Number(limit))
                .getManyAndCount();
            res.json({
                success: true,
                data: {
                    contents,
                    pagination: {
                        page: Number(page),
                        limit: Number(limit),
                        total,
                        totalPages: Math.ceil(total / Number(limit))
                    }
                }
            });
        }
        catch (error) {
            // Error log removed
            res.status(500).json({
                success: false,
                error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch contents' }
            });
        }
    }
    async getContentById(req, res) {
        try {
            const { id } = req.params;
            const user = req.user;
            const content = await this.contentRepository.findOne({
                where: { id },
                relations: ['creator', 'approver']
            });
            if (!content) {
                return res.status(404).json({
                    success: false,
                    error: { code: 'NOT_FOUND', message: 'Content not found' }
                });
            }
            // Check access permissions
            if (user.role !== 'admin' && content.createdBy !== user.id) {
                if (user.role === 'customer' && (!content.isPublic || content.status !== 'approved')) {
                    return res.status(403).json({
                        success: false,
                        error: { code: 'FORBIDDEN', message: 'Access denied' }
                    });
                }
            }
            res.json({ success: true, data: content });
        }
        catch (error) {
            // Error log removed
            res.status(500).json({
                success: false,
                error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch content' }
            });
        }
    }
    async createContent(req, res) {
        try {
            const { title, description, type, url, tags, isPublic } = req.body;
            const user = req.user;
            // Validate user role
            if (!['business', 'affiliate', 'manager', 'admin'].includes(user.role)) {
                return res.status(403).json({
                    success: false,
                    error: { code: 'FORBIDDEN', message: 'Insufficient permissions' }
                });
            }
            // Extract video ID from URL
            let videoId = null;
            if (type === 'youtube') {
                const match = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\n?#]+)/);
                videoId = match ? match[1] : null;
            }
            else if (type === 'vimeo') {
                const match = url.match(/vimeo\.com\/(\d+)/);
                videoId = match ? match[1] : null;
            }
            if (!videoId) {
                return res.status(400).json({
                    success: false,
                    error: { code: 'VALIDATION_ERROR', message: 'Invalid video URL format' }
                });
            }
            const content = this.contentRepository.create({
                title,
                description,
                type,
                url,
                videoId,
                tags,
                isPublic: isPublic || false,
                createdBy: user.id,
                status: user.role === 'admin' || user.role === 'manager' ? SignageContent_1.ContentStatus.APPROVED : SignageContent_1.ContentStatus.PENDING
            });
            if (content.status === SignageContent_1.ContentStatus.APPROVED) {
                content.approvedBy = user.id;
                content.approvedAt = new Date();
            }
            const savedContent = await this.contentRepository.save(content);
            res.status(201).json({
                success: true,
                message: content.status === 'approved'
                    ? 'Content created and approved successfully'
                    : 'Content created successfully. Approval pending.',
                data: savedContent
            });
        }
        catch (error) {
            // Error log removed
            res.status(500).json({
                success: false,
                error: { code: 'INTERNAL_ERROR', message: 'Failed to create content' }
            });
        }
    }
    async updateContent(req, res) {
        try {
            const { id } = req.params;
            const user = req.user;
            const content = await this.contentRepository.findOne({ where: { id } });
            if (!content) {
                return res.status(404).json({
                    success: false,
                    error: { code: 'NOT_FOUND', message: 'Content not found' }
                });
            }
            // Check permissions
            if (user.role !== 'admin' && content.createdBy !== user.id) {
                return res.status(403).json({
                    success: false,
                    error: { code: 'FORBIDDEN', message: 'Access denied' }
                });
            }
            const updateData = { ...req.body };
            delete updateData.id;
            delete updateData.createdBy;
            delete updateData.videoId;
            await this.contentRepository.update(id, updateData);
            const updatedContent = await this.contentRepository.findOne({
                where: { id },
                relations: ['creator', 'approver']
            });
            res.json({ success: true, data: updatedContent });
        }
        catch (error) {
            // Error log removed
            res.status(500).json({
                success: false,
                error: { code: 'INTERNAL_ERROR', message: 'Failed to update content' }
            });
        }
    }
    async deleteContent(req, res) {
        try {
            const { id } = req.params;
            const user = req.user;
            const content = await this.contentRepository.findOne({ where: { id } });
            if (!content) {
                return res.status(404).json({
                    success: false,
                    error: { code: 'NOT_FOUND', message: 'Content not found' }
                });
            }
            if (user.role !== 'admin' && content.createdBy !== user.id) {
                return res.status(403).json({
                    success: false,
                    error: { code: 'FORBIDDEN', message: 'Access denied' }
                });
            }
            await this.contentRepository.remove(content);
            res.json({ success: true, message: 'Content deleted successfully' });
        }
        catch (error) {
            // Error log removed
            res.status(500).json({
                success: false,
                error: { code: 'INTERNAL_ERROR', message: 'Failed to delete content' }
            });
        }
    }
    async approveRejectContent(req, res) {
        try {
            const { id } = req.params;
            const { action, reason } = req.body;
            const user = req.user;
            if (user.role !== 'admin') {
                return res.status(403).json({
                    success: false,
                    error: { code: 'FORBIDDEN', message: 'Admin access required' }
                });
            }
            const content = await this.contentRepository.findOne({ where: { id } });
            if (!content) {
                return res.status(404).json({
                    success: false,
                    error: { code: 'NOT_FOUND', message: 'Content not found' }
                });
            }
            if (action === 'approve') {
                content.status = SignageContent_1.ContentStatus.APPROVED;
                content.approvedBy = user.id;
                content.approvedAt = new Date();
            }
            else if (action === 'reject') {
                content.status = SignageContent_1.ContentStatus.REJECTED;
                content.rejectedReason = reason;
            }
            const updatedContent = await this.contentRepository.save(content);
            res.json({ success: true, data: updatedContent });
        }
        catch (error) {
            // Error log removed
            res.status(500).json({
                success: false,
                error: { code: 'INTERNAL_ERROR', message: 'Failed to process approval' }
            });
        }
    }
    // Store Management
    async getStores(req, res) {
        try {
            const user = req.user;
            let stores;
            if (user.role === 'admin') {
                stores = await this.storeRepository.find({
                    relations: ['manager']
                });
            }
            else if (user.role === 'manager') {
                stores = await this.storeRepository.find({
                    where: { managerId: user.id },
                    relations: ['manager']
                });
            }
            else {
                return res.status(403).json({
                    success: false,
                    error: { code: 'FORBIDDEN', message: 'Access denied' }
                });
            }
            res.json({ success: true, data: { stores } });
        }
        catch (error) {
            // Error log removed
            res.status(500).json({
                success: false,
                error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch stores' }
            });
        }
    }
    async createStore(req, res) {
        try {
            const user = req.user;
            if (user.role !== 'admin') {
                return res.status(403).json({
                    success: false,
                    error: { code: 'FORBIDDEN', message: 'Admin access required' }
                });
            }
            const store = this.storeRepository.create(req.body);
            const savedStore = await this.storeRepository.save(store);
            res.status(201).json({ success: true, data: savedStore });
        }
        catch (error) {
            // Error log removed
            res.status(500).json({
                success: false,
                error: { code: 'INTERNAL_ERROR', message: 'Failed to create store' }
            });
        }
    }
    async updateStore(req, res) {
        try {
            const { id } = req.params;
            const user = req.user;
            const store = await this.storeRepository.findOne({ where: { id } });
            if (!store) {
                return res.status(404).json({
                    success: false,
                    error: { code: 'NOT_FOUND', message: 'Store not found' }
                });
            }
            if (user.role !== 'admin' && store.managerId !== user.id) {
                return res.status(403).json({
                    success: false,
                    error: { code: 'FORBIDDEN', message: 'Access denied' }
                });
            }
            const updateData = { ...req.body };
            delete updateData.id;
            delete updateData.managerId; // Prevent changing manager
            await this.storeRepository.update(id, updateData);
            const updatedStore = await this.storeRepository.findOne({
                where: { id },
                relations: ['manager']
            });
            res.json({ success: true, data: updatedStore });
        }
        catch (error) {
            // Error log removed
            res.status(500).json({
                success: false,
                error: { code: 'INTERNAL_ERROR', message: 'Failed to update store' }
            });
        }
    }
    async deleteStore(req, res) {
        try {
            const { id } = req.params;
            const user = req.user;
            if (user.role !== 'admin') {
                return res.status(403).json({
                    success: false,
                    error: { code: 'FORBIDDEN', message: 'Admin access required' }
                });
            }
            const store = await this.storeRepository.findOne({ where: { id } });
            if (!store) {
                return res.status(404).json({
                    success: false,
                    error: { code: 'NOT_FOUND', message: 'Store not found' }
                });
            }
            await this.storeRepository.remove(store);
            res.json({ success: true, message: 'Store deleted successfully' });
        }
        catch (error) {
            // Error log removed
            res.status(500).json({
                success: false,
                error: { code: 'INTERNAL_ERROR', message: 'Failed to delete store' }
            });
        }
    }
}
exports.SignageController = SignageController;
//# sourceMappingURL=signageController.js.map
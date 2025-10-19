"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.blockDataService = exports.BlockDataService = void 0;
const connection_1 = require("../../../database/connection");
const Post_1 = require("../../../entities/Post");
const CustomPost_1 = require("../../../entities/CustomPost");
const MetaDataService_1 = require("../../../services/MetaDataService");
const logger_1 = __importDefault(require("../../../utils/logger"));
const editor_constants_1 = require("../../../config/editor.constants");
/**
 * Block Data Service - Optimized data service for block editor
 * Provides unified API for blocks to access CPT and ACF data
 */
class BlockDataService {
    constructor() {
        this.postRepo = connection_1.AppDataSource.getRepository(Post_1.Post);
        this.customPostRepo = connection_1.AppDataSource.getRepository(CustomPost_1.CustomPost);
        // Cache configuration
        this.cache = new Map();
        this.cacheTTL = editor_constants_1.CACHE_CONFIG.TTL;
    }
    /**
     * Get all block data for a post (optimized single query)
     */
    async getBlockData(postId, postType = 'post') {
        try {
            const cacheKey = `block-data:${postId}:${postType}`;
            // Check cache
            const cached = this.getCached(cacheKey);
            if (cached) {
                return {
                    success: true,
                    data: cached,
                    source: 'cache'
                };
            }
            let post;
            let featuredImage = null;
            let customFields = {};
            if (postType === 'custom') {
                // Custom post type
                post = await this.customPostRepo.findOne({
                    where: { id: postId },
                    relations: ['author']
                });
                if (post) {
                    customFields = post.meta || {};
                    featuredImage = customFields.featuredImage || null;
                }
            }
            else {
                // Regular post or page
                post = await this.postRepo.findOne({
                    where: { id: postId, type: postType },
                    relations: ['author']
                });
                if (post) {
                    featuredImage = post.featured_media || null;
                    customFields = post.meta || {};
                }
            }
            if (!post) {
                return {
                    success: false,
                    error: 'Post not found'
                };
            }
            // Get ACF field values
            const acfFields = {}; // TODO: Implement getAllMeta method in MetaDataService
            const blockData = {
                id: post.id,
                title: post.title,
                content: post.content,
                excerpt: post.excerpt,
                featuredImage,
                customFields: {
                    ...(customFields || {}),
                    ...acfFields
                },
                author: post.author,
                status: post.status,
                template: post.template,
                meta: post.meta,
                dynamicSources: this.extractDynamicSources(customFields, acfFields)
            };
            // Cache the result
            this.setCache(cacheKey, blockData);
            return {
                success: true,
                data: blockData,
                source: 'database'
            };
        }
        catch (error) {
            logger_1.default.error('Error fetching block data:', error);
            throw new Error('Failed to fetch block data');
        }
    }
    /**
     * Get featured image for a post
     */
    async getFeaturedImage(postId, postType = 'post') {
        try {
            const cacheKey = `featured-image:${postId}:${postType}`;
            // Check cache
            const cached = this.getCached(cacheKey);
            if (cached) {
                return {
                    success: true,
                    data: cached,
                    source: 'cache'
                };
            }
            let featuredImage = null;
            if (postType === 'custom') {
                const post = await this.customPostRepo.findOne({
                    where: { id: postId },
                    select: ['id', 'meta']
                });
                if ((post === null || post === void 0 ? void 0 : post.meta) && 'featuredImage' in post.meta) {
                    featuredImage = post.meta.featuredImage;
                }
            }
            else {
                const post = await this.postRepo.findOne({
                    where: { id: postId, type: postType },
                    select: ['id', 'featured_media']
                });
                if (post === null || post === void 0 ? void 0 : post.featured_media) {
                    featuredImage = post.featured_media;
                }
            }
            // Cache the result
            if (featuredImage) {
                this.setCache(cacheKey, featuredImage);
            }
            return {
                success: true,
                data: featuredImage,
                source: featuredImage ? 'database' : 'not-found'
            };
        }
        catch (error) {
            logger_1.default.error('Error fetching featured image:', error);
            throw new Error('Failed to fetch featured image');
        }
    }
    /**
     * Get specific ACF field value
     */
    async getACFField(postId, fieldName, entityType = 'post') {
        try {
            const cacheKey = `acf-field:${postId}:${fieldName}`;
            // Check cache
            const cached = this.getCached(cacheKey);
            if (cached !== null) {
                return {
                    success: true,
                    data: cached,
                    source: 'cache'
                };
            }
            const value = await MetaDataService_1.metaDataService.getMeta(entityType, postId, fieldName);
            // Cache the result
            if (value !== undefined) {
                this.setCache(cacheKey, value);
            }
            return {
                success: true,
                data: value,
                source: value !== undefined ? 'database' : 'not-found'
            };
        }
        catch (error) {
            logger_1.default.error('Error fetching ACF field:', error);
            throw new Error('Failed to fetch ACF field');
        }
    }
    /**
     * Get dynamic content for blocks
     */
    async getDynamicContent(request) {
        try {
            const { postId, postType = 'post', fields = [], includeACF = true, includeMeta = true } = request;
            if (!postId) {
                return {
                    success: false,
                    error: 'Post ID is required'
                };
            }
            const result = {
                postId,
                postType
            };
            // Get specific fields if requested
            if (fields.length > 0) {
                for (const field of fields) {
                    if (field === 'featuredImage') {
                        const imageResult = await this.getFeaturedImage(postId, postType);
                        result.featuredImage = imageResult.data;
                    }
                    else if (includeACF) {
                        const fieldResult = await this.getACFField(postId, field, postType);
                        result[field] = fieldResult.data;
                    }
                }
            }
            else {
                // Get all data
                const blockDataResult = await this.getBlockData(postId, postType);
                if (blockDataResult.success) {
                    result.data = blockDataResult.data;
                }
            }
            return {
                success: true,
                data: result
            };
        }
        catch (error) {
            logger_1.default.error('Error fetching dynamic content:', error);
            throw new Error('Failed to fetch dynamic content');
        }
    }
    /**
     * Clear cache for a specific post
     */
    clearCache(postId) {
        if (postId) {
            // Clear all cache entries for this post
            for (const key of this.cache.keys()) {
                if (key.includes(postId)) {
                    this.cache.delete(key);
                }
            }
        }
        else {
            // Clear all cache
            this.cache.clear();
        }
        return {
            success: true,
            message: postId ? `Cache cleared for post ${postId}` : 'All cache cleared'
        };
    }
    /**
     * Private helper: Extract dynamic sources from fields
     */
    extractDynamicSources(customFields, acfFields) {
        const sources = {};
        // Extract image sources
        const imageFields = editor_constants_1.BLOCK_DYNAMIC_FIELDS.IMAGE_FIELDS;
        for (const field of imageFields) {
            if (customFields[field]) {
                sources[field] = customFields[field];
            }
            if (acfFields[field]) {
                sources[field] = acfFields[field];
            }
        }
        // Extract text sources
        const textFields = editor_constants_1.BLOCK_DYNAMIC_FIELDS.TEXT_FIELDS;
        for (const field of textFields) {
            if (customFields[field]) {
                sources[field] = customFields[field];
            }
            if (acfFields[field]) {
                sources[field] = acfFields[field];
            }
        }
        return sources;
    }
    /**
     * Private helper: Get cached data
     */
    getCached(key) {
        const cached = this.cache.get(key);
        if (cached) {
            const age = Date.now() - cached.timestamp;
            if (age < this.cacheTTL) {
                return cached.data;
            }
            // Remove expired cache
            this.cache.delete(key);
        }
        return null;
    }
    /**
     * Private helper: Set cache
     */
    setCache(key, data) {
        this.cache.set(key, {
            data,
            timestamp: Date.now()
        });
    }
}
exports.BlockDataService = BlockDataService;
// Export singleton instance
exports.blockDataService = new BlockDataService();
//# sourceMappingURL=block-data.service.js.map
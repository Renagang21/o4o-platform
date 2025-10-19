"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const block_data_service_1 = require("../services/block-data.service");
const logger_1 = __importDefault(require("../../../utils/logger"));
const editor_constants_1 = require("../../../config/editor.constants");
/**
 * Block API Routes - Optimized endpoints for block editor
 * Provides fast, cached access to CPT and ACF data for blocks
 */
const router = (0, express_1.Router)();
/**
 * Get all block data for a post
 * GET /api/blocks/data/:postId
 */
router.get('/data/:postId', async (req, res) => {
    try {
        const { postId } = req.params;
        const { postType = 'post' } = req.query;
        const result = await block_data_service_1.blockDataService.getBlockData(postId, postType);
        if (!result.success) {
            return res.status(404).json(result);
        }
        // Add cache headers
        res.set({
            'Cache-Control': `public, max-age=${editor_constants_1.CACHE_CONFIG.MAX_AGE}`,
            'X-Cache-Status': result.source || 'unknown'
        });
        res.json(result);
    }
    catch (error) {
        logger_1.default.error('Block API error - getBlockData:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch block data',
            message: error.message
        });
    }
});
/**
 * Get featured image for a post
 * GET /api/blocks/featured-image/:postId
 */
router.get('/featured-image/:postId', async (req, res) => {
    try {
        const { postId } = req.params;
        const { postType = 'post' } = req.query;
        const result = await block_data_service_1.blockDataService.getFeaturedImage(postId, postType);
        if (!result.success) {
            return res.status(404).json(result);
        }
        // Add cache headers
        res.set({
            'Cache-Control': `public, max-age=${editor_constants_1.CACHE_CONFIG.MAX_AGE}`,
            'X-Cache-Status': result.source || 'unknown'
        });
        res.json(result);
    }
    catch (error) {
        logger_1.default.error('Block API error - getFeaturedImage:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch featured image',
            message: error.message
        });
    }
});
/**
 * Get specific ACF field value
 * GET /api/blocks/acf-fields/:postId/:fieldName
 */
router.get('/acf-fields/:postId/:fieldName', async (req, res) => {
    try {
        const { postId, fieldName } = req.params;
        const { entityType = 'post' } = req.query;
        const result = await block_data_service_1.blockDataService.getACFField(postId, fieldName, entityType);
        if (!result.success) {
            return res.status(404).json(result);
        }
        // Add cache headers
        res.set({
            'Cache-Control': `public, max-age=${editor_constants_1.CACHE_CONFIG.MAX_AGE}`,
            'X-Cache-Status': result.source || 'unknown'
        });
        res.json(result);
    }
    catch (error) {
        logger_1.default.error('Block API error - getACFField:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch ACF field',
            message: error.message
        });
    }
});
/**
 * Get dynamic content for blocks
 * POST /api/blocks/dynamic-content
 */
router.post('/dynamic-content', async (req, res) => {
    try {
        const result = await block_data_service_1.blockDataService.getDynamicContent(req.body);
        if (!result.success) {
            return res.status(400).json(result);
        }
        // Add cache headers for GET-like POST requests
        if (req.body.postId) {
            res.set({
                'Cache-Control': `public, max-age=${editor_constants_1.CACHE_CONFIG.MAX_AGE}`,
                'X-Cache-Status': 'dynamic'
            });
        }
        res.json(result);
    }
    catch (error) {
        logger_1.default.error('Block API error - getDynamicContent:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch dynamic content',
            message: error.message
        });
    }
});
/**
 * Clear cache for a post or all posts
 * POST /api/blocks/cache/clear
 */
router.post('/cache/clear', async (req, res) => {
    try {
        const { postId } = req.body;
        const result = block_data_service_1.blockDataService.clearCache(postId);
        res.json(result);
    }
    catch (error) {
        logger_1.default.error('Block API error - clearCache:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to clear cache',
            message: error.message
        });
    }
});
/**
 * Health check endpoint
 * GET /api/blocks/health
 */
router.get('/health', (req, res) => {
    res.json({
        success: true,
        status: 'healthy',
        timestamp: new Date().toISOString(),
        endpoints: [
            'GET /api/blocks/data/:postId',
            'GET /api/blocks/featured-image/:postId',
            'GET /api/blocks/acf-fields/:postId/:fieldName',
            'POST /api/blocks/dynamic-content',
            'POST /api/blocks/cache/clear'
        ]
    });
});
exports.default = router;
//# sourceMappingURL=block-api.routes.js.map
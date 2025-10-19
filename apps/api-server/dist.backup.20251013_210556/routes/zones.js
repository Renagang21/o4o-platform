"use strict";
/**
 * Zone-based Content Management API Routes
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const express_validator_1 = require("express-validator");
const connection_1 = __importDefault(require("../database/connection"));
const Post_1 = require("../entities/Post");
const User_1 = require("../entities/User");
const auth_middleware_1 = require("../middleware/auth.middleware");
const logger_1 = __importDefault(require("../utils/logger"));
const validateDto_1 = require("../middleware/validateDto");
const zone_adapter_1 = require("../utils/zone-adapter");
const promises_1 = __importDefault(require("fs/promises"));
const path_1 = __importDefault(require("path"));
const router = (0, express_1.Router)();
// Apply authentication to all routes
router.use(auth_middleware_1.authenticate);
// Helper to get repositories
const getRepositories = () => {
    if (!connection_1.default.isInitialized) {
        throw new Error('Database not initialized');
    }
    return {
        postRepository: connection_1.default.getRepository(Post_1.Post),
        userRepository: connection_1.default.getRepository(User_1.User)
    };
};
/**
 * GET /api/zones/:pageId
 * Get zone content for a specific page/post
 */
router.get('/:pageId', (0, express_validator_1.param)('pageId').isUUID().withMessage('Invalid page ID'), validateDto_1.validateDto, async (req, res) => {
    var _a, _b, _c, _d, _e, _f, _g, _h;
    try {
        const { postRepository } = getRepositories();
        const { pageId } = req.params;
        const post = await postRepository.findOne({
            where: { id: pageId },
            relations: ['author']
        });
        if (!post) {
            return res.status(404).json({ error: 'Page not found' });
        }
        // Check if post uses zone-based content
        if (((_a = post.meta) === null || _a === void 0 ? void 0 : _a.useZones) && ((_b = post.meta) === null || _b === void 0 ? void 0 : _b.zones)) {
            return res.json({
                zones: (_c = post.meta) === null || _c === void 0 ? void 0 : _c.zones,
                customization: ((_d = post.meta) === null || _d === void 0 ? void 0 : _d.themeCustomizations) || null,
                layout: ((_e = post.meta) === null || _e === void 0 ? void 0 : _e.layoutType) || 'single-column'
            });
        }
        // Convert legacy content to zone format if needed
        if (post.content && post.content.blocks) {
            const zoneContent = zone_adapter_1.ZoneContentAdapter.toZoneFormat(post.content, ((_f = post.meta) === null || _f === void 0 ? void 0 : _f.layoutType) || 'single-column');
            return res.json({
                zones: zoneContent,
                customization: ((_g = post.meta) === null || _g === void 0 ? void 0 : _g.themeCustomizations) || null,
                layout: ((_h = post.meta) === null || _h === void 0 ? void 0 : _h.layoutType) || 'single-column',
                converted: true // Indicate this was converted
            });
        }
        // Return empty zone structure
        const emptyZones = zone_adapter_1.ZoneContentAdapter.toZoneFormat({ blocks: [] }, 'single-column');
        res.json({
            zones: emptyZones,
            customization: null,
            layout: 'single-column'
        });
    }
    catch (error) {
        logger_1.default.error('Error fetching zone content:', error);
        res.status(500).json({ error: 'Failed to fetch zone content' });
    }
});
/**
 * PUT /api/zones/:pageId
 * Save zone content for a specific page/post
 */
router.put('/:pageId', (0, express_validator_1.param)('pageId').isUUID().withMessage('Invalid page ID'), (0, express_validator_1.body)('zones').isObject().withMessage('Zones data is required'), (0, express_validator_1.body)('layout').isString().withMessage('Layout type is required'), validateDto_1.validateDto, async (req, res) => {
    try {
        const { postRepository } = getRepositories();
        const { pageId } = req.params;
        const { zones, layout, customization } = req.body;
        const post = await postRepository.findOne({
            where: { id: pageId }
        });
        if (!post) {
            return res.status(404).json({ error: 'Page not found' });
        }
        // Update post with zone data  
        const updatedMeta = {
            ...post.meta,
            zones: zones,
            layoutType: layout,
            themeCustomizations: customization || null,
            useZones: true
        };
        await postRepository.update(pageId, {
            meta: () => `'${JSON.stringify(updatedMeta)}'::jsonb`
        });
        res.json({ success: true });
    }
    catch (error) {
        logger_1.default.error('Error saving zone content:', error);
        res.status(500).json({ error: 'Failed to save zone content' });
    }
});
/**
 * PUT /api/zones/:pageId/:zoneId
 * Update specific zone within a page
 */
router.put('/:pageId/:zoneId', (0, express_validator_1.param)('pageId').isUUID().withMessage('Invalid page ID'), (0, express_validator_1.param)('zoneId').isString().withMessage('Invalid zone ID'), validateDto_1.validateDto, async (req, res) => {
    var _a;
    try {
        const { postRepository } = getRepositories();
        const { pageId, zoneId } = req.params;
        const zoneData = req.body;
        const post = await postRepository.findOne({
            where: { id: pageId }
        });
        if (!post) {
            return res.status(404).json({ error: 'Page not found' });
        }
        // Update specific zone
        const currentZones = ((_a = post.meta) === null || _a === void 0 ? void 0 : _a.zones) || {};
        currentZones[zoneId] = {
            ...currentZones[zoneId],
            ...zoneData,
            id: zoneId
        };
        const updatedMeta = {
            ...post.meta,
            zones: currentZones
        };
        await postRepository.update(pageId, {
            meta: updatedMeta,
            updated_at: new Date()
        });
        res.json({ success: true });
    }
    catch (error) {
        logger_1.default.error('Error updating zone:', error);
        res.status(500).json({ error: 'Failed to update zone' });
    }
});
/**
 * POST /api/zones/:pageId/reorder
 * Reorder zones within a page
 */
router.post('/:pageId/reorder', (0, express_validator_1.param)('pageId').isUUID().withMessage('Invalid page ID'), (0, express_validator_1.body)('zoneOrder').isArray().withMessage('Zone order array is required'), validateDto_1.validateDto, async (req, res) => {
    var _a;
    try {
        const { postRepository } = getRepositories();
        const { pageId } = req.params;
        const { zoneOrder } = req.body;
        const post = await postRepository.findOne({
            where: { id: pageId }
        });
        if (!post) {
            return res.status(404).json({ error: 'Page not found' });
        }
        // Reorder zones based on provided order
        const currentZones = ((_a = post.meta) === null || _a === void 0 ? void 0 : _a.zones) || {};
        const reorderedZones = {};
        zoneOrder.forEach((zoneId, index) => {
            if (currentZones[zoneId]) {
                reorderedZones[zoneId] = {
                    ...currentZones[zoneId],
                    order: index
                };
            }
        });
        const updatedMeta = {
            ...post.meta,
            zones: reorderedZones
        };
        await postRepository.update(pageId, {
            meta: () => `'${JSON.stringify(updatedMeta)}'::jsonb`
        });
        res.json({ success: true });
    }
    catch (error) {
        console.error('Error reordering zones:', error);
        res.status(500).json({ error: 'Failed to reorder zones' });
    }
});
/**
 * POST /api/zones/validate
 * Validate zone content against constraints
 */
router.post('/validate', (0, express_validator_1.body)('zones').isObject().withMessage('Zones data is required'), validateDto_1.validateDto, async (req, res) => {
    try {
        const { zones } = req.body;
        // Load zone configuration
        const configPath = path_1.default.join(process.cwd(), 'apps/admin-dashboard/public/themes/default/zones.json');
        const configContent = await promises_1.default.readFile(configPath, 'utf8');
        const zoneConfig = JSON.parse(configContent);
        const validationResult = zone_adapter_1.ZoneContentAdapter.validateZoneContent(zones, zoneConfig);
        res.json(validationResult);
    }
    catch (error) {
        console.error('Error validating zone content:', error);
        res.status(500).json({ error: 'Failed to validate zone content' });
    }
});
/**
 * POST /api/zones/convert
 * Convert legacy content to zone format
 */
router.post('/convert', (0, express_validator_1.body)('content').isObject().withMessage('Content data is required'), (0, express_validator_1.body)('layoutType').isString().withMessage('Layout type is required'), validateDto_1.validateDto, async (req, res) => {
    try {
        const { content, layoutType } = req.body;
        const zoneContent = zone_adapter_1.ZoneContentAdapter.toZoneFormat(content, layoutType);
        res.json(zoneContent);
    }
    catch (error) {
        console.error('Error converting content:', error);
        res.status(500).json({ error: 'Failed to convert content' });
    }
});
/**
 * GET /api/zones/:pageId/export
 * Export zone content
 */
router.get('/:pageId/export', (0, express_validator_1.param)('pageId').isUUID().withMessage('Invalid page ID'), (0, express_validator_1.query)('format').optional().isIn(['json', 'html']).withMessage('Invalid export format'), validateDto_1.validateDto, async (req, res) => {
    var _a, _b, _c;
    try {
        const { postRepository } = getRepositories();
        const { pageId } = req.params;
        const format = req.query.format || 'json';
        const post = await postRepository.findOne({
            where: { id: pageId }
        });
        if (!post) {
            return res.status(404).json({ error: 'Page not found' });
        }
        if (format === 'json') {
            res.setHeader('Content-Type', 'application/json');
            res.setHeader('Content-Disposition', `attachment; filename="zones-${pageId}.json"`);
            res.json({
                zones: (_a = post.meta) === null || _a === void 0 ? void 0 : _a.zones,
                layout: (_b = post.meta) === null || _b === void 0 ? void 0 : _b.layoutType,
                customizations: (_c = post.meta) === null || _c === void 0 ? void 0 : _c.themeCustomizations,
                exportedAt: new Date().toISOString()
            });
        }
        else if (format === 'html') {
            // TODO: Implement HTML export
            res.status(501).json({ error: 'HTML export not implemented yet' });
        }
    }
    catch (error) {
        console.error('Error exporting zone content:', error);
        res.status(500).json({ error: 'Failed to export zone content' });
    }
});
/**
 * GET /api/zones/:pageId/analytics
 * Get zone analytics/usage stats
 */
router.get('/:pageId/analytics', (0, express_validator_1.param)('pageId').isUUID().withMessage('Invalid page ID'), validateDto_1.validateDto, async (req, res) => {
    var _a, _b;
    try {
        const { postRepository } = getRepositories();
        const { pageId } = req.params;
        const post = await postRepository.findOne({
            where: { id: pageId }
        });
        if (!post) {
            return res.status(404).json({ error: 'Page not found' });
        }
        const zones = ((_a = post.meta) === null || _a === void 0 ? void 0 : _a.zones) || {};
        let totalBlocks = 0;
        const blocksByZone = {};
        const blocksByType = {};
        // Calculate analytics
        Object.entries(zones).forEach(([zoneId, zone]) => {
            var _a, _b;
            const blockCount = ((_a = zone.blocks) === null || _a === void 0 ? void 0 : _a.length) || 0;
            blocksByZone[zoneId] = blockCount;
            totalBlocks += blockCount;
            (_b = zone.blocks) === null || _b === void 0 ? void 0 : _b.forEach((block) => {
                const blockType = block.type;
                blocksByType[blockType] = (blocksByType[blockType] || 0) + 1;
            });
        });
        res.json({
            totalBlocks,
            blocksByZone,
            blocksByType,
            lastModified: ((_b = post.updated_at) === null || _b === void 0 ? void 0 : _b.toISOString()) || new Date().toISOString()
        });
    }
    catch (error) {
        console.error('Error fetching zone analytics:', error);
        res.status(500).json({ error: 'Failed to fetch zone analytics' });
    }
});
exports.default = router;
//# sourceMappingURL=zones.js.map
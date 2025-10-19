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
const express_1 = require("express");
const connection_1 = require("../database/connection");
const Template_1 = require("../entities/Template");
const Page_1 = require("../entities/Page");
const CustomPost_1 = require("../entities/CustomPost");
const logger_1 = __importDefault(require("../utils/logger"));
const router = (0, express_1.Router)();
// Get permalink settings (public endpoint)
router.get('/permalink-settings', async (req, res) => {
    try {
        res.json({
            success: true,
            data: {
                structure: '/%postname%/',
                categoryBase: 'category',
                tagBase: 'tag',
                removeStopWords: false,
                maxUrlLength: 75,
                autoFlushRules: true,
                enableSeoWarnings: true
            }
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            error: 'Failed to get permalink settings'
        });
    }
});
// Get homepage template
router.get('/templates/homepage', async (req, res) => {
    try {
        if (!connection_1.AppDataSource.isInitialized) {
            return res.status(503).json({
                success: false,
                error: 'Database not initialized',
                code: 'DB_NOT_INITIALIZED'
            });
        }
        const templateRepository = connection_1.AppDataSource.getRepository(Template_1.Template);
        const homepageTemplate = await templateRepository.findOne({
            where: {
                type: 'page',
                name: 'homepage',
                active: true
            }
        });
        if (!homepageTemplate) {
            return res.status(404).json({
                success: false,
                error: 'Homepage template not found',
                code: 'TEMPLATE_NOT_FOUND'
            });
        }
        res.json({
            success: true,
            data: {
                id: homepageTemplate.id,
                name: homepageTemplate.name,
                blocks: homepageTemplate.content || [],
                metadata: {
                    version: homepageTemplate.version,
                    layoutType: homepageTemplate.layoutType,
                    updatedAt: homepageTemplate.updatedAt
                }
            }
        });
    }
    catch (error) {
        // Error log removed
        res.status(500).json({
            success: false,
            error: 'Failed to fetch homepage template'
        });
    }
});
// Get page by UUID or slug
router.get('/pages/:idOrSlug', async (req, res) => {
    var _a, _b, _c, _d, _e;
    try {
        const { idOrSlug } = req.params;
        const pageRepository = connection_1.AppDataSource.getRepository(Page_1.Page);
        // Check if parameter is UUID format
        const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(idOrSlug);
        // Find page by ID or slug
        const page = await pageRepository.findOne({
            where: isUUID
                ? { id: idOrSlug, status: 'publish' }
                : { slug: idOrSlug, status: 'publish' }
        });
        if (!page) {
            return res.status(404).json({
                success: false,
                error: 'Page not found or not published'
            });
        }
        // Get template if page has one
        let templateContent = null;
        if (page.template) {
            const templateRepository = connection_1.AppDataSource.getRepository(Template_1.Template);
            const template = await templateRepository.findOne({
                where: { slug: page.template }
            });
            if (template) {
                templateContent = template.content;
            }
        }
        res.json({
            success: true,
            data: {
                id: page.id,
                title: page.title,
                slug: page.slug,
                content: page.content,
                blocks: templateContent || page.content || null,
                metadata: {
                    excerpt: page.excerpt,
                    featuredImage: ((_a = page.customFields) === null || _a === void 0 ? void 0 : _a.featuredImage) || null,
                    seo: {
                        metaTitle: ((_b = page.seo) === null || _b === void 0 ? void 0 : _b.title) || page.title,
                        metaDescription: ((_c = page.seo) === null || _c === void 0 ? void 0 : _c.description) || page.excerpt,
                        metaKeywords: ((_e = (_d = page.seo) === null || _d === void 0 ? void 0 : _d.keywords) === null || _e === void 0 ? void 0 : _e.join(', ')) || ''
                    },
                    updatedAt: page.updatedAt
                }
            }
        });
    }
    catch (error) {
        // Error log removed
        res.status(500).json({
            success: false,
            error: 'Failed to fetch page'
        });
    }
});
// Get template by type
router.get('/templates/:type', async (req, res) => {
    try {
        const { type } = req.params;
        const templateRepository = connection_1.AppDataSource.getRepository(Template_1.Template);
        const template = await templateRepository.findOne({
            where: {
                type: type,
                active: true,
                featured: true
            }
        });
        if (!template) {
            return res.status(404).json({
                success: false,
                error: 'Template not found'
            });
        }
        res.json({
            success: true,
            data: {
                id: template.id,
                name: template.name,
                type: template.type,
                blocks: template.content,
                metadata: {
                    version: template.version,
                    layoutType: template.layoutType,
                    updatedAt: template.updatedAt
                }
            }
        });
    }
    catch (error) {
        // Error log removed
        res.status(500).json({
            success: false,
            error: 'Failed to fetch template'
        });
    }
});
// Get custom post by type and slug
router.get('/posts/:type/:slug', async (req, res) => {
    var _a, _b, _c, _d, _e, _f;
    try {
        const { type, slug } = req.params;
        const customPostRepository = connection_1.AppDataSource.getRepository(CustomPost_1.CustomPost);
        const post = await customPostRepository.findOne({
            where: {
                slug,
                status: CustomPost_1.PostStatus.PUBLISHED
            },
            relations: ['postType']
        });
        if (!post || post.postType.slug !== type) {
            return res.status(404).json({
                success: false,
                error: 'Post not found'
            });
        }
        res.json({
            success: true,
            data: {
                id: post.id,
                title: post.title,
                slug: post.slug,
                content: post.content || '',
                customFields: post.fields || {},
                metadata: {
                    excerpt: ((_a = post.meta) === null || _a === void 0 ? void 0 : _a.seoDescription) || '',
                    featuredImage: ((_b = post.meta) === null || _b === void 0 ? void 0 : _b.thumbnail) || null,
                    seo: {
                        metaTitle: ((_c = post.meta) === null || _c === void 0 ? void 0 : _c.seoTitle) || post.title,
                        metaDescription: ((_d = post.meta) === null || _d === void 0 ? void 0 : _d.seoDescription) || '',
                        metaKeywords: ((_f = (_e = post.meta) === null || _e === void 0 ? void 0 : _e.tags) === null || _f === void 0 ? void 0 : _f.join(', ')) || ''
                    },
                    updatedAt: post.updatedAt
                }
            }
        });
    }
    catch (error) {
        // Error log removed
        res.status(500).json({
            success: false,
            error: 'Failed to fetch post'
        });
    }
});
// ========== PRODUCT PUBLIC ENDPOINTS ==========
// Get featured products (public)
// Get CPT types (public) - for admin dashboard
router.get('/cpt/types', async (req, res) => {
    try {
        // Import CPT service
        const { cptService } = await Promise.resolve().then(() => __importStar(require('../modules/cpt-acf/services/cpt.service')));
        const result = await cptService.getAllCPTs(true);
        if (!result.success) {
            return res.status(400).json(result);
        }
        res.json(result);
    }
    catch (error) {
        logger_1.default.error('Public CPT types error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch CPT types',
            message: error.message
        });
    }
});
// Get template parts (public) - for admin dashboard
router.get('/template-parts', async (req, res) => {
    try {
        const { AppDataSource } = await Promise.resolve().then(() => __importStar(require('../database/connection')));
        const { TemplatePart } = await Promise.resolve().then(() => __importStar(require('../entities/TemplatePart')));
        const repository = AppDataSource.getRepository(TemplatePart);
        const queryBuilder = repository.createQueryBuilder('templatePart');
        // Filter by area if provided
        const { area } = req.query;
        if (area && area !== 'all') {
            queryBuilder.where('templatePart.area = :area', { area });
        }
        queryBuilder.orderBy('templatePart.createdAt', 'DESC');
        const [templateParts, count] = await queryBuilder.getManyAndCount();
        res.json({
            success: true,
            data: templateParts,
            count
        });
    }
    catch (error) {
        logger_1.default.error('Public template parts error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch template parts',
            message: error.message
        });
    }
});
exports.default = router;
//# sourceMappingURL=public.js.map
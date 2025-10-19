"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const pagesController_1 = require("../../controllers/pagesController");
const auth_middleware_1 = require("../../middleware/auth.middleware");
const connection_1 = require("../../database/connection");
const Post_1 = require("../../entities/Post");
const logger_1 = __importDefault(require("../../utils/logger"));
const router = (0, express_1.Router)();
const pagesController = new pagesController_1.PagesController();
// Helper function to build page hierarchy
const buildPageHierarchy = (pages) => {
    const pageMap = new Map();
    const roots = [];
    // First pass: create map
    pages.forEach(page => {
        pageMap.set(page.id, { ...page, children: [] });
    });
    // Second pass: build hierarchy
    pages.forEach(page => {
        var _a;
        const pageNode = pageMap.get(page.id);
        const parentId = (_a = page.meta) === null || _a === void 0 ? void 0 : _a.parentId;
        if (parentId) {
            const parent = pageMap.get(parentId);
            if (parent) {
                parent.children.push(pageNode);
            }
        }
        else {
            roots.push(pageNode);
        }
    });
    return roots;
};
// Public routes
router.get('/', async (req, res) => {
    try {
        const postRepository = connection_1.AppDataSource.getRepository(Post_1.Post);
        const { page = 1, per_page = 10, search, status, parent, author, orderby = 'created_at', order = 'ASC', menu_order } = req.query;
        const pageNum = parseInt(page);
        const limitNum = parseInt(per_page);
        const skip = (pageNum - 1) * limitNum;
        const queryBuilder = postRepository.createQueryBuilder('post')
            .leftJoinAndSelect('post.author', 'author')
            .where('post.type = :type', { type: 'page' });
        if (status) {
            queryBuilder.andWhere('post.status = :status', { status });
        }
        if (parent !== undefined) {
            if (parent === '0' || parent === null) {
                queryBuilder.andWhere('(post.meta->>\'parentId\') IS NULL');
            }
            else {
                queryBuilder.andWhere('post.meta->>\'parentId\' = :parentId', { parentId: parent });
            }
        }
        if (author) {
            queryBuilder.andWhere('post.author_id = :authorId', { authorId: author });
        }
        if (search) {
            queryBuilder.andWhere('(post.title ILIKE :search OR post.excerpt ILIKE :search)', { search: `%${search}%` });
        }
        if (menu_order !== undefined) {
            queryBuilder.andWhere('post.meta->>\'menuOrder\' = :menuOrder', { menuOrder: menu_order });
        }
        queryBuilder.orderBy(`post.${orderby}`, order)
            .skip(skip)
            .take(limitNum);
        const [pages, total] = await queryBuilder.getManyAndCount();
        res.json({
            data: pages,
            pagination: {
                page: pageNum,
                per_page: limitNum,
                total,
                total_pages: Math.ceil(total / limitNum)
            }
        });
    }
    catch (error) {
        logger_1.default.error('Error fetching pages:', {
            error: error instanceof Error ? error.message : 'Unknown error',
            stack: error instanceof Error ? error.stack : undefined,
            query: req.query
        });
        res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch pages' } });
    }
});
router.get('/hierarchy', async (req, res) => {
    try {
        const postRepository = connection_1.AppDataSource.getRepository(Post_1.Post);
        const pages = await postRepository.find({
            where: {
                type: 'page',
                status: 'publish'
            },
            relations: ['author'],
            order: { created_at: 'ASC' }
        });
        const hierarchy = buildPageHierarchy(pages);
        res.json(hierarchy);
    }
    catch (error) {
        logger_1.default.error('Error fetching page hierarchy:', {
            error: error instanceof Error ? error.message : 'Unknown error',
            stack: error instanceof Error ? error.stack : undefined
        });
        res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch page hierarchy' } });
    }
});
router.get('/:id', async (req, res) => {
    try {
        const postRepository = connection_1.AppDataSource.getRepository(Post_1.Post);
        const { id } = req.params;
        // 공개 엔드포인트이므로 publish 상태의 페이지만 허용
        const page = await postRepository.findOne({
            where: {
                id,
                type: 'page',
                status: 'publish'
            },
            relations: ['author']
        });
        if (!page) {
            return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Page not found or not published' } });
        }
        res.json(page);
    }
    catch (error) {
        logger_1.default.error('Error fetching page:', {
            pageId: req.params.id,
            error: error instanceof Error ? error.message : 'Unknown error',
            stack: error instanceof Error ? error.stack : undefined
        });
        res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch page' } });
    }
});
router.get('/:id/preview', async (req, res) => {
    try {
        const postRepository = connection_1.AppDataSource.getRepository(Post_1.Post);
        const { id } = req.params;
        const page = await postRepository.findOne({
            where: {
                id,
                type: 'page'
            },
            relations: ['author']
        });
        if (!page) {
            return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Page not found' } });
        }
        res.json({
            ...page,
            preview: true,
            previewUrl: `/preview/pages/${id}`
        });
    }
    catch (error) {
        logger_1.default.error('Error previewing page:', {
            pageId: req.params.id,
            error: error instanceof Error ? error.message : 'Unknown error',
            stack: error instanceof Error ? error.stack : undefined
        });
        res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to preview page' } });
    }
});
// Protected routes
router.use(auth_middleware_1.authenticate);
router.post('/', async (req, res) => {
    var _a, _b;
    try {
        const postRepository = connection_1.AppDataSource.getRepository(Post_1.Post);
        const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
        if (!userId) {
            return res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'User not authenticated' } });
        }
        const { title, content, excerpt, slug, status = 'draft', parentId, menuOrder = 0, template, seo, customFields, allowComments = true, password, scheduledAt, showInMenu = true, isHomepage = false } = req.body;
        // Check if slug is unique
        if (slug) {
            const existingPage = await postRepository.findOne({ where: { slug, type: 'page' } });
            if (existingPage) {
                return res.status(409).json({ error: { code: 'CONFLICT', message: 'Slug already exists' } });
            }
        }
        const page = postRepository.create({
            title,
            content,
            excerpt,
            slug: slug || title.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
            status,
            type: 'page',
            template,
            seo,
            meta: {
                parentId,
                menuOrder,
                customFields,
                allowComments,
                password,
                passwordProtected: !!password,
                showInMenu,
                isHomepage
            },
            published_at: status === 'publish' ? new Date() : undefined,
            author_id: userId
        });
        // If setting as homepage, unset other homepages
        if (isHomepage) {
            await postRepository.createQueryBuilder()
                .update(Post_1.Post)
                .set({ meta: () => "meta || '{\"isHomepage\": false}'" })
                .where("type = :type AND meta->>'isHomepage' = 'true'", { type: 'page' })
                .execute();
        }
        const savedPage = await postRepository.save(page);
        res.status(201).json(savedPage);
    }
    catch (error) {
        logger_1.default.error('Error creating page:', {
            userId: (_b = req.user) === null || _b === void 0 ? void 0 : _b.id,
            requestBody: req.body,
            error: error instanceof Error ? error.message : 'Unknown error',
            stack: error instanceof Error ? error.stack : undefined
        });
        res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to create page' } });
    }
});
router.put('/:id', async (req, res) => {
    var _a, _b;
    try {
        const postRepository = connection_1.AppDataSource.getRepository(Post_1.Post);
        const { id } = req.params;
        const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
        if (!userId) {
            return res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'User not authenticated' } });
        }
        const page = await postRepository.findOne({ where: { id, type: 'page' } });
        if (!page) {
            return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Page not found' } });
        }
        const { title, content, excerpt, slug, status, parentId, menuOrder, template, seo, customFields, allowComments, password, scheduledAt, showInMenu, isHomepage } = req.body;
        // Check slug uniqueness if changed
        if (slug && slug !== page.slug) {
            const existingPage = await postRepository.findOne({ where: { slug, type: 'page' } });
            if (existingPage) {
                return res.status(409).json({ error: { code: 'CONFLICT', message: 'Slug already exists' } });
            }
        }
        // Update fields
        if (title !== undefined)
            page.title = title;
        if (content !== undefined)
            page.content = content;
        if (excerpt !== undefined)
            page.excerpt = excerpt;
        if (slug !== undefined)
            page.slug = slug;
        if (status !== undefined) {
            page.status = status;
            if (status === 'publish' && !page.published_at) {
                page.published_at = new Date();
            }
        }
        if (template !== undefined)
            page.template = template;
        if (seo !== undefined)
            page.seo = seo;
        // Update meta fields
        const currentMeta = page.meta || {};
        if (parentId !== undefined)
            currentMeta.parentId = parentId;
        if (menuOrder !== undefined)
            currentMeta.menuOrder = menuOrder;
        if (customFields !== undefined)
            currentMeta.customFields = customFields;
        if (allowComments !== undefined)
            currentMeta.allowComments = allowComments;
        if (password !== undefined) {
            currentMeta.password = password;
            currentMeta.passwordProtected = !!password;
        }
        if (showInMenu !== undefined)
            currentMeta.showInMenu = showInMenu;
        // Handle homepage setting
        if (isHomepage !== undefined) {
            currentMeta.isHomepage = isHomepage;
            if (isHomepage) {
                await postRepository.createQueryBuilder()
                    .update(Post_1.Post)
                    .set({ meta: () => "meta || '{\"isHomepage\": false}'" })
                    .where("type = :type AND meta->>'isHomepage' = 'true' AND id != :id", { type: 'page', id })
                    .execute();
            }
        }
        page.meta = currentMeta;
        const updatedPage = await postRepository.save(page);
        res.json(updatedPage);
    }
    catch (error) {
        logger_1.default.error('Error updating page:', {
            pageId: req.params.id,
            userId: (_b = req.user) === null || _b === void 0 ? void 0 : _b.id,
            requestBody: req.body,
            error: error instanceof Error ? error.message : 'Unknown error',
            stack: error instanceof Error ? error.stack : undefined
        });
        res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to update page' } });
    }
});
router.delete('/:id', async (req, res) => {
    try {
        const postRepository = connection_1.AppDataSource.getRepository(Post_1.Post);
        const { id } = req.params;
        const page = await postRepository.findOne({ where: { id, type: 'page' } });
        if (!page) {
            return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Page not found' } });
        }
        // Soft delete by changing status to trash
        page.status = 'trash';
        await postRepository.save(page);
        res.json({ message: 'Page moved to trash' });
    }
    catch (error) {
        logger_1.default.error('Error deleting page:', {
            pageId: req.params.id,
            error: error instanceof Error ? error.message : 'Unknown error',
            stack: error instanceof Error ? error.stack : undefined
        });
        res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to delete page' } });
    }
});
router.post('/:id/autosave', async (req, res) => {
    var _a, _b;
    try {
        const postRepository = connection_1.AppDataSource.getRepository(Post_1.Post);
        const { id } = req.params;
        const { content, title, excerpt } = req.body;
        const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
        if (!userId) {
            return res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'User not authenticated' } });
        }
        const page = await postRepository.findOne({ where: { id, type: 'page' } });
        if (!page) {
            return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Page not found' } });
        }
        // Store current version as revision in meta
        const currentMeta = page.meta || {};
        const revisions = currentMeta.revisions || [];
        revisions.push({
            id: `rev_${Date.now()}`,
            timestamp: new Date().toISOString(),
            author: userId,
            changes: {
                title: page.title,
                content: page.content,
                excerpt: page.excerpt
            }
        });
        // Limit revisions to last 10
        if (revisions.length > 10) {
            revisions.shift();
        }
        // Update page with auto-saved content
        currentMeta.revisions = revisions;
        page.meta = currentMeta;
        if (content !== undefined)
            page.content = content;
        if (title !== undefined)
            page.title = title;
        if (excerpt !== undefined)
            page.excerpt = excerpt;
        await postRepository.save(page);
        res.json({ message: 'Auto-save successful', revisionId: revisions[revisions.length - 1].id });
    }
    catch (error) {
        logger_1.default.error('Error auto-saving page:', {
            pageId: req.params.id,
            userId: (_b = req.user) === null || _b === void 0 ? void 0 : _b.id,
            requestBody: req.body,
            error: error instanceof Error ? error.message : 'Unknown error',
            stack: error instanceof Error ? error.stack : undefined
        });
        res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to auto-save page' } });
    }
});
router.get('/:id/revisions', async (req, res) => {
    var _a;
    try {
        const postRepository = connection_1.AppDataSource.getRepository(Post_1.Post);
        const { id } = req.params;
        const page = await postRepository.findOne({
            where: { id, type: 'page' },
            select: ['id', 'meta']
        });
        if (!page) {
            return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Page not found' } });
        }
        res.json(((_a = page.meta) === null || _a === void 0 ? void 0 : _a.revisions) || []);
    }
    catch (error) {
        logger_1.default.error('Error fetching revisions:', {
            pageId: req.params.id,
            error: error instanceof Error ? error.message : 'Unknown error',
            stack: error instanceof Error ? error.stack : undefined
        });
        res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch revisions' } });
    }
});
router.post('/bulk', async (req, res) => {
    try {
        const postRepository = connection_1.AppDataSource.getRepository(Post_1.Post);
        const { action, ids } = req.body;
        if (!action || !ids || !Array.isArray(ids) || ids.length === 0) {
            return res.status(400).json({
                error: {
                    code: 'VALIDATION_ERROR',
                    message: 'Invalid bulk operation parameters'
                }
            });
        }
        const pages = await postRepository.findBy({ id: (0, typeorm_1.In)(ids), type: 'page' });
        if (pages.length === 0) {
            return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'No pages found' } });
        }
        switch (action) {
            case 'trash':
                await postRepository.update({ id: (0, typeorm_1.In)(ids), type: 'page' }, { status: 'trash' });
                break;
            case 'restore':
                await postRepository.update({ id: (0, typeorm_1.In)(ids), type: 'page' }, { status: 'draft' });
                break;
            case 'delete':
                await postRepository.delete({ id: (0, typeorm_1.In)(ids), type: 'page' });
                break;
            case 'publish':
                await postRepository.update({ id: (0, typeorm_1.In)(ids), type: 'page' }, { status: 'publish', published_at: new Date() });
                break;
            case 'draft':
                await postRepository.update({ id: (0, typeorm_1.In)(ids), type: 'page' }, { status: 'draft' });
                break;
            default:
                return res.status(400).json({
                    error: {
                        code: 'VALIDATION_ERROR',
                        message: 'Invalid action'
                    }
                });
        }
        res.json({
            message: `Bulk ${action} completed`,
            affected: pages.length
        });
    }
    catch (error) {
        logger_1.default.error('Error in bulk operation:', {
            requestBody: req.body,
            error: error instanceof Error ? error.message : 'Unknown error',
            stack: error instanceof Error ? error.stack : undefined
        });
        res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to perform bulk operation' } });
    }
});
// Import Not operator
const typeorm_1 = require("typeorm");
exports.default = router;
//# sourceMappingURL=pages.js.map
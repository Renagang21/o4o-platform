"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const data_source_1 = __importDefault(require("../database/data-source"));
const Post_1 = require("../entities/Post");
const User_1 = require("../entities/User");
const Category_1 = require("../entities/Category");
const auth_middleware_1 = require("../middleware/auth.middleware");
const typeorm_1 = require("typeorm");
const validateDto_1 = require("../middleware/validateDto");
const express_validator_1 = require("express-validator");
const router = (0, express_1.Router)();
// Helper function to safely get repositories
const getRepositories = () => {
    try {
        if (!data_source_1.default.isInitialized) {
            return null;
        }
        return {
            postRepository: data_source_1.default.getRepository(Post_1.Post),
            userRepository: data_source_1.default.getRepository(User_1.User),
            categoryRepository: data_source_1.default.getRepository(Category_1.Category)
        };
    }
    catch (error) {
        // Error log removed
        return null;
    }
};
// Mock data for when database is not available
// Mock data removed - database should be used instead
const mockPosts = [];
// Helper to extract content from Gutenberg format
const extractContent = (content) => {
    if (typeof content === 'string') {
        return content;
    }
    if (content && typeof content === 'object') {
        // Handle Gutenberg format: { raw: "...", rendered: "..." }
        return content.raw || content.rendered || '';
    }
    return '';
};
// Helper to extract title from Gutenberg format
const extractTitle = (title) => {
    if (typeof title === 'string') {
        return title;
    }
    if (title && typeof title === 'object') {
        // Handle Gutenberg format: { raw: "...", rendered: "..." }
        return title.raw || title.rendered || '';
    }
    return '';
};
// GET /api/posts - List posts
router.get('/', (0, express_validator_1.query)('page').optional().isInt({ min: 1 }), (0, express_validator_1.query)('per_page').optional().isInt({ min: 1, max: 100 }), (0, express_validator_1.query)('search').optional().isString(), (0, express_validator_1.query)('status').optional().isIn(['draft', 'publish', 'private', 'archived', 'scheduled']), validateDto_1.validateDto, async (req, res) => {
    try {
        const { page = 1, per_page = 10, search, author, exclude, include, order = 'desc', orderby = 'date', status = 'publish', categories, tags, sticky, format, type = 'post', post_type } = req.query;
        // Check if database is available
        const repos = getRepositories();
        if (!repos) {
            // Return mock data when database is not available
            const postType = post_type || type || 'post';
            let filteredPosts = mockPosts.filter(p => p.type === postType);
            if (status && status !== 'all') {
                filteredPosts = filteredPosts.filter(p => p.status === status);
            }
            if (search) {
                const searchLower = search.toString().toLowerCase();
                filteredPosts = filteredPosts.filter(p => p.title.toLowerCase().includes(searchLower) ||
                    p.content.toLowerCase().includes(searchLower));
            }
            const startIndex = (page - 1) * per_page;
            const endIndex = startIndex + per_page;
            const paginatedPosts = filteredPosts.slice(startIndex, endIndex);
            return res.json({
                data: paginatedPosts,
                total: filteredPosts.length,
                page: page,
                per_page: per_page,
                total_pages: Math.ceil(filteredPosts.length / per_page)
            });
        }
        const { postRepository } = repos;
        const queryBuilder = postRepository.createQueryBuilder('post')
            .leftJoinAndSelect('post.author', 'author')
            .leftJoinAndSelect('post.categories', 'categories')
            .leftJoinAndSelect('post.lastModifier', 'lastModifier');
        // Status filter
        if (status) {
            queryBuilder.andWhere('post.status = :status', { status });
        }
        // Ordering
        let orderByField = 'post.created_at';
        switch (orderby) {
            case 'date':
                orderByField = 'post.published_at';
                break;
            case 'modified':
                orderByField = 'post.updated_at';
                break;
            case 'title':
                orderByField = 'post.title';
                break;
            case 'id':
                orderByField = 'post.id';
                break;
        }
        queryBuilder.orderBy(orderByField, order.toUpperCase());
        // Pagination
        const skip = (page - 1) * per_page;
        queryBuilder.skip(skip).take(per_page);
        const [posts, total] = await queryBuilder.getManyAndCount();
        // Format response to be WordPress-compatible
        const formattedPosts = posts.map(post => {
            var _a, _b, _c;
            return ({
                id: post.id,
                date: post.published_at,
                date_gmt: post.published_at,
                guid: { rendered: `/posts/${post.id}` },
                modified: post.updated_at,
                modified_gmt: post.updated_at,
                slug: post.slug,
                status: post.status,
                type: 'post',
                link: `/posts/${post.slug}`,
                title: { rendered: post.title },
                content: {
                    rendered: post.content,
                    protected: false
                },
                excerpt: {
                    rendered: post.excerpt || '',
                    protected: false
                },
                author: (_a = post.author) === null || _a === void 0 ? void 0 : _a.id,
                categories: ((_b = post.categories) === null || _b === void 0 ? void 0 : _b.map(c => c.id)) || [],
                tags: post.tags || [],
                sticky: post.sticky || false,
                format: ((_c = post.meta) === null || _c === void 0 ? void 0 : _c.format) || 'standard',
                meta: post.meta || {}
            });
        });
        res.json(formattedPosts);
    }
    catch (error) {
        // Error log removed
        res.status(500).json({
            error: 'Failed to fetch posts',
            message: error.message
        });
    }
});
// GET /api/posts/:id - Get single post
router.get('/:id', (0, express_validator_1.param)('id').notEmpty(), validateDto_1.validateDto, async (req, res) => {
    var _a, _b, _c;
    try {
        const { id } = req.params;
        // Check if database is available
        const repos = getRepositories();
        if (!repos) {
            const mockPost = mockPosts.find(p => p.id === id);
            if (!mockPost) {
                return res.status(404).json({ error: 'Post not found' });
            }
            return res.json(mockPost);
        }
        const { postRepository } = repos;
        const post = await postRepository.findOne({
            where: { id },
            relations: ['author', 'categories', 'lastModifier']
        });
        if (!post) {
            return res.status(404).json({ error: 'Post not found' });
        }
        // Format response to be WordPress-compatible
        const formattedPost = {
            id: post.id,
            date: post.published_at,
            date_gmt: post.published_at,
            guid: { rendered: `/posts/${post.id}` },
            modified: post.updated_at,
            modified_gmt: post.updated_at,
            slug: post.slug,
            status: post.status,
            type: 'post',
            link: `/posts/${post.slug}`,
            title: { rendered: post.title },
            content: {
                rendered: post.content,
                protected: false
            },
            excerpt: {
                rendered: post.excerpt || '',
                protected: false
            },
            author: (_a = post.author) === null || _a === void 0 ? void 0 : _a.id,
            categories: ((_b = post.categories) === null || _b === void 0 ? void 0 : _b.map(c => c.id)) || [],
            tags: post.tags || [],
            sticky: post.sticky || false,
            format: ((_c = post.meta) === null || _c === void 0 ? void 0 : _c.format) || 'standard',
            meta: post.meta || {}
        };
        res.json(formattedPost);
    }
    catch (error) {
        // Error log removed
        res.status(500).json({
            error: 'Failed to fetch post',
            message: error.message
        });
    }
});
// POST /api/posts - Create post (Gutenberg compatible)
router.post('/', auth_middleware_1.authenticate, 
// Make title and content optional for auto-save support
(0, express_validator_1.body)('title').optional(), (0, express_validator_1.body)('content').optional(), (0, express_validator_1.body)('status').optional().isIn(['draft', 'publish', 'publish', 'private', 'archived', 'scheduled', 'auto-draft']), validateDto_1.validateDto, async (req, res) => {
    var _a, _b, _c;
    try {
        const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
        // Extract title and content from Gutenberg format
        const title = extractTitle(req.body.title) || 'Untitled';
        const content = extractContent(req.body.content) || '';
        // Map 'publish' to 'publish' for compatibility
        let status = req.body.status || 'draft';
        if (status === 'publish') {
            status = 'publish';
        }
        if (status === 'auto-draft') {
            status = 'draft';
        }
        const { categories: categoryIds, tags, excerpt, slug, format, sticky, meta, featured_media, comment_status, ping_status } = req.body;
        // Check if database is available
        const repos = getRepositories();
        if (!repos) {
            const newPost = {
                id: Date.now().toString(),
                date: new Date().toISOString(),
                date_gmt: new Date().toISOString(),
                guid: { rendered: `/posts/${Date.now()}` },
                modified: new Date().toISOString(),
                modified_gmt: new Date().toISOString(),
                slug: slug || title.toLowerCase().replace(/\s+/g, '-'),
                status,
                type: req.body.type || 'post',
                link: `/posts/${slug || Date.now()}`,
                title: {
                    raw: title,
                    rendered: title
                },
                content: {
                    raw: content,
                    rendered: content,
                    protected: false
                },
                excerpt: {
                    raw: excerpt || '',
                    rendered: excerpt || '',
                    protected: false
                },
                author: userId || '1',
                featured_media: featured_media || 0,
                comment_status: comment_status || 'open',
                ping_status: ping_status || 'open',
                sticky: sticky || false,
                template: '',
                format: format || 'standard',
                meta: meta || {},
                categories: categoryIds || [],
                tags: tags || []
            };
            mockPosts.push(newPost);
            return res.status(201).json(newPost);
        }
        const { postRepository, categoryRepository } = repos;
        let categories = [];
        if (categoryIds && categoryIds.length > 0) {
            categories = await categoryRepository.findBy({
                id: (0, typeorm_1.In)(categoryIds)
            });
        }
        const post = await postRepository.save({
            title,
            content: content || '',
            status,
            slug: slug || title.toLowerCase().replace(/\s+/g, '-'),
            excerpt: extractContent(excerpt),
            tags: tags || [],
            authorId: userId,
            categories,
            published_at: status === 'publish' ? new Date() : null
        });
        // Format response for Gutenberg
        const response = {
            id: post.id,
            date: post.published_at || post.created_at,
            date_gmt: post.published_at || post.created_at,
            guid: { rendered: `/posts/${post.id}` },
            modified: post.updated_at,
            modified_gmt: post.updated_at,
            slug: post.slug,
            status: post.status,
            type: 'post',
            link: `/posts/${post.slug}`,
            title: {
                raw: post.title,
                rendered: post.title
            },
            content: {
                raw: post.content,
                rendered: post.content,
                protected: false
            },
            excerpt: {
                raw: post.excerpt || '',
                rendered: post.excerpt || '',
                protected: false
            },
            author: userId,
            featured_media: 0,
            comment_status: 'open',
            ping_status: 'open',
            sticky: post.sticky || false,
            template: '',
            format: ((_b = post.meta) === null || _b === void 0 ? void 0 : _b.format) || 'standard',
            meta: post.meta || {},
            categories: ((_c = post.categories) === null || _c === void 0 ? void 0 : _c.map(c => c.id)) || [],
            tags: post.tags || []
        };
        res.status(201).json(response);
    }
    catch (error) {
        // Error log removed
        res.status(500).json({
            code: 'rest_cannot_create',
            message: 'Failed to create post',
            data: { status: 500 }
        });
    }
});
// PUT /api/posts/:id - Update post (Gutenberg compatible)
router.put('/:id', auth_middleware_1.authenticate, (0, express_validator_1.param)('id').notEmpty(), validateDto_1.validateDto, async (req, res) => {
    var _a, _b, _c, _d;
    try {
        const { id } = req.params;
        const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
        // Extract title and content from Gutenberg format
        const title = extractTitle(req.body.title);
        const content = extractContent(req.body.content);
        // Map 'publish' to 'publish' for compatibility
        let status = req.body.status;
        if (status === 'publish') {
            status = 'publish';
        }
        const { categories: categoryIds, tags, excerpt, slug, format, sticky, meta, featured_media, comment_status, ping_status } = req.body;
        // Check if database is available
        const repos = getRepositories();
        if (!repos) {
            const postIndex = mockPosts.findIndex(p => p.id === id);
            if (postIndex === -1) {
                return res.status(404).json({
                    code: 'rest_post_invalid_id',
                    message: 'Invalid post ID',
                    data: { status: 404 }
                });
            }
            const updatedPost = {
                ...mockPosts[postIndex],
                title: { raw: title || mockPosts[postIndex].title, rendered: title || mockPosts[postIndex].title },
                content: { raw: content || mockPosts[postIndex].content, rendered: content || mockPosts[postIndex].content, protected: false },
                status: status || mockPosts[postIndex].status,
                modified: new Date().toISOString(),
                modified_gmt: new Date().toISOString()
            };
            mockPosts[postIndex] = updatedPost;
            return res.json(updatedPost);
        }
        const { postRepository, categoryRepository } = repos;
        const existingPost = await postRepository.findOne({
            where: { id },
            relations: ['categories']
        });
        if (!existingPost) {
            return res.status(404).json({
                code: 'rest_post_invalid_id',
                message: 'Invalid post ID',
                data: { status: 404 }
            });
        }
        let categories = existingPost.categories;
        if (categoryIds && categoryIds.length > 0) {
            categories = await categoryRepository.findBy({
                id: (0, typeorm_1.In)(categoryIds)
            });
        }
        const updatedPost = await postRepository.save({
            ...existingPost,
            title: title || existingPost.title,
            content: content || existingPost.content,
            status: status || existingPost.status,
            slug: slug || existingPost.slug,
            excerpt: excerpt !== undefined ? extractContent(excerpt) : existingPost.excerpt,
            tags: tags || existingPost.tags,
            categories,
            lastModifierId: userId,
            published_at: status === 'publish' && !existingPost.published_at ? new Date() : existingPost.published_at
        });
        // Format response for Gutenberg
        const response = {
            id: updatedPost.id,
            date: updatedPost.published_at || updatedPost.created_at,
            date_gmt: updatedPost.published_at || updatedPost.created_at,
            guid: { rendered: `/posts/${updatedPost.id}` },
            modified: updatedPost.updated_at,
            modified_gmt: updatedPost.updated_at,
            slug: updatedPost.slug,
            status: updatedPost.status,
            type: 'post',
            link: `/posts/${updatedPost.slug}`,
            title: {
                raw: updatedPost.title,
                rendered: updatedPost.title
            },
            content: {
                raw: updatedPost.content,
                rendered: updatedPost.content,
                protected: false
            },
            excerpt: {
                raw: updatedPost.excerpt || '',
                rendered: updatedPost.excerpt || '',
                protected: false
            },
            author: userId,
            featured_media: featured_media || 0,
            comment_status: comment_status || 'open',
            ping_status: ping_status || 'open',
            sticky: ((_b = updatedPost.meta) === null || _b === void 0 ? void 0 : _b.sticky) || false,
            template: '',
            format: ((_c = updatedPost.meta) === null || _c === void 0 ? void 0 : _c.format) || 'standard',
            meta: updatedPost.meta || {},
            categories: ((_d = updatedPost.categories) === null || _d === void 0 ? void 0 : _d.map(c => c.id)) || [],
            tags: updatedPost.tags || []
        };
        res.json(response);
    }
    catch (error) {
        // Error log removed
        res.status(500).json({
            code: 'rest_cannot_update',
            message: 'Failed to update post',
            data: { status: 500 }
        });
    }
});
// DELETE /api/posts/:id - Delete post
router.delete('/:id', auth_middleware_1.authenticate, (0, express_validator_1.param)('id').notEmpty(), validateDto_1.validateDto, async (req, res) => {
    try {
        const { id } = req.params;
        // Check if database is available
        const repos = getRepositories();
        if (!repos) {
            const postIndex = mockPosts.findIndex(p => p.id === id);
            if (postIndex === -1) {
                return res.status(404).json({ error: 'Post not found' });
            }
            const deletedPost = mockPosts.splice(postIndex, 1)[0];
            return res.json({ message: 'Post deleted successfully', post: deletedPost });
        }
        const { postRepository } = repos;
        const result = await postRepository.delete(id);
        if (result.affected === 0) {
            return res.status(404).json({ error: 'Post not found' });
        }
        res.json({ message: 'Post deleted successfully' });
    }
    catch (error) {
        // Error log removed
        res.status(500).json({
            error: 'Failed to delete post',
            message: error.message
        });
    }
});
exports.default = router;
//# sourceMappingURL=posts-complete.js.map
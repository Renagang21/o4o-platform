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
const mockPosts = [
    {
        id: '1',
        title: 'Welcome to Neture Platform',
        slug: 'welcome-to-neture',
        content: '<p>Welcome to the Neture O4O platform.</p>',
        excerpt: 'Welcome to the Neture O4O platform.',
        status: 'publish',
        type: 'post',
        author: {
            id: '1',
            name: 'Admin',
            email: 'admin@neture.co.kr'
        },
        categories: [{ id: '1', name: '공지사항', slug: 'notice' }],
        tags: [],
        featuredImage: null,
        publishedAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
    }
];
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
// POST /api/posts - Create post (Gutenberg compatible)
router.post('/', auth_middleware_1.authenticate, 
// Make title and content optional for auto-save support
(0, express_validator_1.body)('title').optional(), (0, express_validator_1.body)('content').optional(), (0, express_validator_1.body)('status').optional().isIn(['draft', 'publish', 'publish', 'private', 'archived', 'scheduled', 'auto-draft']), validateDto_1.validateDto, async (req, res) => {
    var _a, _b, _c, _d;
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
            sticky: ((_b = post.meta) === null || _b === void 0 ? void 0 : _b.sticky) || false,
            template: '',
            format: ((_c = post.meta) === null || _c === void 0 ? void 0 : _c.format) || 'standard',
            meta: post.meta || {},
            categories: ((_d = post.categories) === null || _d === void 0 ? void 0 : _d.map(c => c.id)) || [],
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
// GET routes (reuse from existing posts.ts)
router.get('/', require('./posts').default);
router.get('/:id', require('./posts').default);
router.delete('/:id', require('./posts').default);
exports.default = router;
//# sourceMappingURL=posts-gutenberg.js.map
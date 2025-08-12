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
const auth_1 = require("../middleware/auth");
const typeorm_1 = require("typeorm");
const validateDto_1 = require("../middleware/validateDto");
const express_validator_1 = require("express-validator");
const router = (0, express_1.Router)();
const postRepository = data_source_1.default.getRepository(Post_1.Post);
const userRepository = data_source_1.default.getRepository(User_1.User);
const categoryRepository = data_source_1.default.getRepository(Category_1.Category);
// GET /api/posts - List posts (WordPress REST API compatible)
router.get('/', (0, express_validator_1.query)('page').optional().isInt({ min: 1 }), (0, express_validator_1.query)('per_page').optional().isInt({ min: 1, max: 100 }), (0, express_validator_1.query)('search').optional().isString(), (0, express_validator_1.query)('status').optional().isIn(['draft', 'published', 'private', 'archived', 'scheduled']), validateDto_1.validateDto, async (req, res) => {
    try {
        const { page = 1, per_page = 10, search, author, exclude, include, order = 'desc', orderby = 'date', status = 'published', categories, tags, sticky, format } = req.query;
        const queryBuilder = postRepository.createQueryBuilder('post')
            .leftJoinAndSelect('post.author', 'author')
            .leftJoinAndSelect('post.categories', 'categories')
            .leftJoinAndSelect('post.lastModifier', 'lastModifier');
        // Status filter
        if (status) {
            queryBuilder.andWhere('post.status = :status', { status });
        }
        // Search
        if (search) {
            queryBuilder.andWhere('(post.title ILIKE :search OR post.content::text ILIKE :search OR post.excerpt ILIKE :search)', { search: `%${search}%` });
        }
        // Author filter
        if (author) {
            const authorIds = author.split(',');
            queryBuilder.andWhere('post.authorId IN (:...authorIds)', { authorIds });
        }
        // Categories filter
        if (categories) {
            const categoryIds = categories.split(',');
            queryBuilder.andWhere('categories.id IN (:...categoryIds)', { categoryIds });
        }
        // Tags filter
        if (tags) {
            const tagList = tags.split(',');
            queryBuilder.andWhere('post.tags && :tags', { tags: tagList });
        }
        // Format filter
        if (format) {
            queryBuilder.andWhere('post.format = :format', { format });
        }
        // Sticky filter
        if (sticky !== undefined) {
            queryBuilder.andWhere('post.sticky = :sticky', { sticky });
        }
        // Include/Exclude specific posts
        if (include) {
            const includeIds = include.split(',');
            queryBuilder.andWhere('post.id IN (:...includeIds)', { includeIds });
        }
        if (exclude) {
            const excludeIds = exclude.split(',');
            queryBuilder.andWhere('post.id NOT IN (:...excludeIds)', { excludeIds });
        }
        // Ordering
        let orderByField = 'post.createdAt';
        switch (orderby) {
            case 'date':
                orderByField = 'post.publishedAt';
                break;
            case 'modified':
                orderByField = 'post.updatedAt';
                break;
            case 'title':
                orderByField = 'post.title';
                break;
            case 'author':
                orderByField = 'author.name';
                break;
            case 'id':
                orderByField = 'post.id';
                break;
        }
        queryBuilder.orderBy(orderByField, order.toUpperCase());
        // Pagination
        const offset = (page - 1) * per_page;
        queryBuilder.skip(offset).take(per_page);
        const [posts, total] = await queryBuilder.getManyAndCount();
        // WordPress-compatible response headers
        res.set({
            'X-WP-Total': total.toString(),
            'X-WP-TotalPages': Math.ceil(total / per_page).toString()
        });
        // Transform posts for WordPress compatibility
        const transformedPosts = posts.map(post => {
            var _a, _b;
            return ({
                id: post.id,
                date: post.publishedAt || post.createdAt,
                date_gmt: post.publishedAt || post.createdAt,
                guid: { rendered: `/posts/${post.slug}` },
                modified: post.updatedAt,
                modified_gmt: post.updatedAt,
                slug: post.slug,
                status: post.status,
                type: 'post',
                link: `/posts/${post.slug}`,
                title: { rendered: post.title },
                content: { rendered: post.content, protected: post.passwordProtected },
                excerpt: { rendered: post.excerpt || '' },
                author: (_a = post.author) === null || _a === void 0 ? void 0 : _a.id,
                featured_media: post.featuredImage || 0,
                comment_status: post.commentStatus,
                ping_status: 'closed',
                sticky: post.sticky,
                template: post.template || '',
                format: post.format,
                meta: post.postMeta || {},
                categories: ((_b = post.categories) === null || _b === void 0 ? void 0 : _b.map(cat => cat.id)) || [],
                tags: post.tags || [],
                // Additional custom fields
                featured: post.featured,
                reading_time: post.readingTime,
                views: post.views,
                seo: post.seo,
                custom_fields: post.customFields
            });
        });
        res.json(transformedPosts);
    }
    catch (error) {
        console.error('Error fetching posts:', error);
        res.status(500).json({ error: 'Failed to fetch posts' });
    }
});
// GET /api/posts/:id - Get single post
router.get('/:id', (0, express_validator_1.param)('id').isUUID(), validateDto_1.validateDto, async (req, res) => {
    var _a, _b;
    try {
        const { id } = req.params;
        const post = await postRepository.findOne({
            where: { id },
            relations: ['author', 'categories', 'lastModifier']
        });
        if (!post) {
            return res.status(404).json({ error: 'Post not found' });
        }
        // Check if password protected
        if (post.passwordProtected && !req.body.password) {
            return res.status(401).json({
                error: 'Password required',
                password_protected: true
            });
        }
        // WordPress-compatible response
        const transformedPost = {
            id: post.id,
            date: post.publishedAt || post.createdAt,
            date_gmt: post.publishedAt || post.createdAt,
            guid: { rendered: `/posts/${post.slug}` },
            modified: post.updatedAt,
            modified_gmt: post.updatedAt,
            slug: post.slug,
            status: post.status,
            type: 'post',
            link: `/posts/${post.slug}`,
            title: { rendered: post.title },
            content: { rendered: post.content, protected: post.passwordProtected },
            excerpt: { rendered: post.excerpt || '' },
            author: (_a = post.author) === null || _a === void 0 ? void 0 : _a.id,
            featured_media: post.featuredImage || 0,
            comment_status: post.commentStatus,
            ping_status: 'closed',
            sticky: post.sticky,
            template: post.template || '',
            format: post.format,
            meta: post.postMeta || {},
            categories: ((_b = post.categories) === null || _b === void 0 ? void 0 : _b.map(cat => cat.id)) || [],
            tags: post.tags || [],
            featured: post.featured,
            reading_time: post.readingTime,
            views: post.views,
            seo: post.seo,
            custom_fields: post.customFields
        };
        res.json(transformedPost);
    }
    catch (error) {
        console.error('Error fetching post:', error);
        res.status(500).json({ error: 'Failed to fetch post' });
    }
});
// POST /api/posts - Create new post (authenticated)
router.post('/', auth_1.authenticateToken, (0, express_validator_1.body)('title').notEmpty().trim(), (0, express_validator_1.body)('slug').optional().trim(), (0, express_validator_1.body)('content').optional(), (0, express_validator_1.body)('excerpt').optional().trim(), (0, express_validator_1.body)('status').optional().isIn(['draft', 'published', 'private', 'archived', 'scheduled']), (0, express_validator_1.body)('format').optional().isIn(['standard', 'aside', 'gallery', 'link', 'image', 'quote', 'status', 'video', 'audio', 'chat']), validateDto_1.validateDto, async (req, res) => {
    try {
        const { title, slug, content, excerpt, status = 'draft', format = 'standard', categories, tags, featured = false, sticky = false, featuredImage, template, seo, customFields, postMeta, scheduledAt } = req.body;
        // Generate slug if not provided  
        const finalSlug = slug || title
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/(^-|-$)/g, '');
        // Check if slug is unique
        const existingPost = await postRepository.findOne({ where: { slug: finalSlug } });
        if (existingPost) {
            return res.status(400).json({ error: 'Slug already exists' });
        }
        const post = new Post_1.Post();
        post.title = title;
        post.slug = finalSlug;
        post.content = content || { blocks: [] };
        post.excerpt = excerpt;
        post.status = status;
        post.format = format;
        post.featured = featured;
        post.sticky = sticky;
        post.featuredImage = featuredImage;
        post.template = template;
        post.seo = seo;
        post.customFields = customFields;
        post.postMeta = postMeta;
        post.authorId = req.user.id;
        post.tags = tags || [];
        if (scheduledAt) {
            post.scheduledAt = new Date(scheduledAt);
        }
        if (status === 'published') {
            post.publishedAt = new Date();
        }
        // Handle categories
        if (categories && categories.length > 0) {
            const categoryEntities = await categoryRepository.findBy({
                id: (0, typeorm_1.In)(categories)
            });
            post.categories = categoryEntities;
        }
        const savedPost = await postRepository.save(post);
        res.status(201).json({
            id: savedPost.id,
            title: savedPost.title,
            slug: savedPost.slug,
            status: savedPost.status,
            created_at: savedPost.createdAt
        });
    }
    catch (error) {
        console.error('Error creating post:', error);
        res.status(500).json({ error: 'Failed to create post' });
    }
});
// PUT /api/posts/:id - Update post
router.put('/:id', auth_1.authenticateToken, (0, express_validator_1.param)('id').isUUID(), (0, express_validator_1.body)('title').optional().trim(), (0, express_validator_1.body)('content').optional(), validateDto_1.validateDto, async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.id;
        const post = await postRepository.findOne({
            where: { id },
            relations: ['categories']
        });
        if (!post) {
            return res.status(404).json({ error: 'Post not found' });
        }
        // Update fields
        Object.assign(post, req.body);
        post.lastModifiedBy = userId;
        // Handle categories update
        if (req.body.categories) {
            const categoryEntities = await categoryRepository.findBy({
                id: (0, typeorm_1.In)(req.body.categories)
            });
            post.categories = categoryEntities;
        }
        const updatedPost = await postRepository.save(post);
        res.json({
            id: updatedPost.id,
            title: updatedPost.title,
            slug: updatedPost.slug,
            status: updatedPost.status,
            updated_at: updatedPost.updatedAt
        });
    }
    catch (error) {
        console.error('Error updating post:', error);
        res.status(500).json({ error: 'Failed to update post' });
    }
});
// DELETE /api/posts/:id - Delete post
router.delete('/:id', auth_1.authenticateToken, (0, express_validator_1.param)('id').isUUID(), validateDto_1.validateDto, async (req, res) => {
    try {
        const { id } = req.params;
        const post = await postRepository.findOne({ where: { id } });
        if (!post) {
            return res.status(404).json({ error: 'Post not found' });
        }
        await postRepository.remove(post);
        res.json({ message: 'Post deleted successfully' });
    }
    catch (error) {
        console.error('Error deleting post:', error);
        res.status(500).json({ error: 'Failed to delete post' });
    }
});
exports.default = router;
//# sourceMappingURL=posts.js.map
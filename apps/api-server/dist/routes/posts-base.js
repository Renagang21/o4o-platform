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
        console.error('Failed to get repositories:', error);
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
        status: 'published',
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
    },
    {
        id: '2',
        title: 'Getting Started Guide',
        slug: 'getting-started',
        content: '<p>Learn how to use the platform effectively.</p>',
        excerpt: 'Learn how to use the platform effectively.',
        status: 'published',
        type: 'post',
        author: {
            id: '1',
            name: 'Admin',
            email: 'admin@neture.co.kr'
        },
        categories: [{ id: '2', name: '가이드', slug: 'guide' }],
        tags: [],
        featuredImage: null,
        publishedAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
    }
];
// GET /api/posts - List posts (WordPress REST API compatible)
router.get('/', (0, express_validator_1.query)('page').optional().isInt({ min: 1 }), (0, express_validator_1.query)('per_page').optional().isInt({ min: 1, max: 100 }), (0, express_validator_1.query)('search').optional().isString(), (0, express_validator_1.query)('status').optional().isIn(['draft', 'published', 'private', 'archived', 'scheduled']), validateDto_1.validateDto, async (req, res) => {
    try {
        const { page = 1, per_page = 10, search, author, exclude, include, order = 'desc', orderby = 'date', status = 'published', categories, tags, sticky, format, type = 'post', post_type } = req.query;
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
                date: post.publishedAt,
                date_gmt: post.publishedAt,
                guid: { rendered: `/posts/${post.id}` },
                modified: post.updatedAt,
                modified_gmt: post.updatedAt,
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
                format: post.format || 'standard',
                meta: post.postMeta || {},
                _embedded: {
                    author: post.author ? [{
                            id: post.author.id,
                            name: post.author.name,
                            link: `/users/${post.author.id}`
                        }] : [],
                    'wp:term': [
                        ((_c = post.categories) === null || _c === void 0 ? void 0 : _c.map(c => ({
                            id: c.id,
                            name: c.name,
                            slug: c.slug,
                            taxonomy: 'category'
                        }))) || []
                    ]
                }
            });
        });
        // Set pagination headers
        res.setHeader('X-WP-Total', total.toString());
        res.setHeader('X-WP-TotalPages', Math.ceil(total / per_page).toString());
        res.json(formattedPosts);
    }
    catch (error) {
        console.error('Error fetching posts:', error);
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
            date: post.publishedAt,
            date_gmt: post.publishedAt,
            guid: { rendered: `/posts/${post.id}` },
            modified: post.updatedAt,
            modified_gmt: post.updatedAt,
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
            format: post.format || 'standard',
            meta: post.postMeta || {},
            _embedded: {
                author: post.author ? [{
                        id: post.author.id,
                        name: post.author.name,
                        link: `/users/${post.author.id}`
                    }] : [],
                'wp:term': [
                    ((_c = post.categories) === null || _c === void 0 ? void 0 : _c.map(c => ({
                        id: c.id,
                        name: c.name,
                        slug: c.slug,
                        taxonomy: 'category'
                    }))) || []
                ]
            }
        };
        res.json(formattedPost);
    }
    catch (error) {
        console.error('Error fetching post:', error);
        res.status(500).json({
            error: 'Failed to fetch post',
            message: error.message
        });
    }
});
// POST /api/posts - Create post
router.post('/', auth_1.authenticateToken, (0, express_validator_1.body)('title').notEmpty().withMessage('Title is required'), (0, express_validator_1.body)('content').notEmpty().withMessage('Content is required'), (0, express_validator_1.body)('status').optional().isIn(['draft', 'published', 'private', 'archived', 'scheduled']), validateDto_1.validateDto, async (req, res) => {
    var _a;
    try {
        const { title, content, status, categories: categoryIds, tags, excerpt, slug, format, sticky, meta } = req.body;
        const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
        // Check if database is available
        const repos = getRepositories();
        if (!repos) {
            const newPost = {
                id: Date.now().toString(),
                title,
                slug: slug || title.toLowerCase().replace(/\s+/g, '-'),
                content,
                excerpt: excerpt || '',
                status: status || 'draft',
                type: 'post',
                author: {
                    id: userId || '1',
                    name: 'User',
                    email: 'user@neture.co.kr'
                },
                categories: [],
                tags: tags || [],
                featuredImage: null,
                publishedAt: status === 'published' ? new Date().toISOString() : null,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
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
            content: { blocks: [] }, // TODO: Parse content into blocks format
            status: status || 'draft',
            slug: slug || title.toLowerCase().replace(/\s+/g, '-'),
            excerpt,
            tags: tags || [],
            format: format || 'standard',
            sticky: sticky || false,
            postMeta: meta || {},
            authorId: userId,
            categories,
            publishedAt: status === 'published' ? new Date() : null
        });
        res.status(201).json(post);
    }
    catch (error) {
        console.error('Error creating post:', error);
        res.status(500).json({
            error: 'Failed to create post',
            message: error.message
        });
    }
});
// PUT /api/posts/:id - Update post
router.put('/:id', auth_1.authenticateToken, (0, express_validator_1.param)('id').notEmpty(), validateDto_1.validateDto, async (req, res) => {
    var _a;
    try {
        const { id } = req.params;
        const { title, content, status, categories: categoryIds, tags, excerpt, slug, format, sticky, meta } = req.body;
        const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
        // Check if database is available
        const repos = getRepositories();
        if (!repos) {
            const postIndex = mockPosts.findIndex(p => p.id === id);
            if (postIndex === -1) {
                return res.status(404).json({ error: 'Post not found' });
            }
            mockPosts[postIndex] = {
                ...mockPosts[postIndex],
                title: title || mockPosts[postIndex].title,
                content: content || mockPosts[postIndex].content,
                status: status || mockPosts[postIndex].status,
                updatedAt: new Date().toISOString()
            };
            return res.json(mockPosts[postIndex]);
        }
        const { postRepository, categoryRepository } = repos;
        const existingPost = await postRepository.findOne({
            where: { id },
            relations: ['categories']
        });
        if (!existingPost) {
            return res.status(404).json({ error: 'Post not found' });
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
            content: content ? { blocks: [] } : existingPost.content, // TODO: Parse content into blocks format
            status: status || existingPost.status,
            slug: slug || existingPost.slug,
            excerpt: excerpt !== undefined ? excerpt : existingPost.excerpt,
            tags: tags || existingPost.tags,
            format: format || existingPost.format,
            sticky: sticky !== undefined ? sticky : existingPost.sticky,
            postMeta: meta || existingPost.postMeta,
            categories,
            lastModifierId: userId,
            publishedAt: status === 'published' && !existingPost.publishedAt ? new Date() : existingPost.publishedAt
        });
        res.json(updatedPost);
    }
    catch (error) {
        console.error('Error updating post:', error);
        res.status(500).json({
            error: 'Failed to update post',
            message: error.message
        });
    }
});
// DELETE /api/posts/:id - Delete post
router.delete('/:id', auth_1.authenticateToken, (0, express_validator_1.param)('id').notEmpty(), validateDto_1.validateDto, async (req, res) => {
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
        console.error('Error deleting post:', error);
        res.status(500).json({
            error: 'Failed to delete post',
            message: error.message
        });
    }
});
exports.default = router;
//# sourceMappingURL=posts-base.js.map
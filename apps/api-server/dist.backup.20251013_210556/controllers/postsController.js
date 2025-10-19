"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getPostCounts = exports.bulkOperatePosts = exports.previewPost = exports.getPostRevisions = exports.autoSavePost = exports.deletePost = exports.updatePost = exports.createPost = exports.getPost = exports.getAllPosts = void 0;
const connection_1 = require("../database/connection");
const Post_1 = require("../entities/Post");
const Category_1 = require("../entities/Category");
const Tag_1 = require("../entities/Tag");
const User_1 = require("../entities/User");
const PostAutosave_1 = require("../entities/PostAutosave");
const typeorm_1 = require("typeorm");
const crypto_1 = __importDefault(require("crypto"));
const postRepository = connection_1.AppDataSource.getRepository(Post_1.Post);
const categoryRepository = connection_1.AppDataSource.getRepository(Category_1.Category);
const tagRepository = connection_1.AppDataSource.getRepository(Tag_1.Tag);
const userRepository = connection_1.AppDataSource.getRepository(User_1.User);
const autosaveRepository = connection_1.AppDataSource.getRepository(PostAutosave_1.PostAutosave);
// Store recent request hashes to prevent duplicate processing
const recentRequests = new Map();
// Clean up old request hashes every 5 minutes
setInterval(() => {
    const now = Date.now();
    for (const [key, value] of recentRequests.entries()) {
        if (now - value.timestamp > 5 * 60 * 1000) { // 5 minutes
            recentRequests.delete(key);
        }
    }
}, 5 * 60 * 1000);
// Generate request hash for deduplication
const generateRequestHash = (userId, body) => {
    // Remove _requestId and other temporary fields
    const cleanBody = { ...body };
    delete cleanBody._requestId;
    delete cleanBody.requestId;
    const data = JSON.stringify({ userId, ...cleanBody });
    return crypto_1.default.createHash('sha256').update(data).digest('hex');
};
// Get all posts with filtering and pagination
const getAllPosts = async (req, res) => {
    try {
        const { page = 1, per_page = 10, search, status, excludeStatus, category, tag, author, orderby = 'created_at', order = 'DESC', type = 'post' } = req.query;
        const pageNum = parseInt(page);
        const limitNum = parseInt(per_page);
        const skip = (pageNum - 1) * limitNum;
        // Build where conditions
        const where = { type: type };
        // Handle status filtering - excludeStatus takes precedence over status
        if (excludeStatus) {
            where.status = (0, typeorm_1.Not)(excludeStatus);
        }
        else if (status) {
            where.status = status;
        }
        if (author)
            where.author_id = author;
        if (search) {
            where.title = (0, typeorm_1.Like)(`%${search}%`);
        }
        // Build query options
        const options = {
            where,
            relations: ['author', 'categories', 'tags'],
            skip,
            take: limitNum,
            order: { [orderby === 'created_at' ? 'created_at' : orderby]: order }
        };
        const [posts, total] = await postRepository.findAndCount(options);
        // Apply category and tag filters if needed
        let filteredPosts = posts;
        if (category) {
            filteredPosts = posts.filter(post => { var _a; return (_a = post.categories) === null || _a === void 0 ? void 0 : _a.some(cat => cat.id === category || cat.slug === category); });
        }
        if (tag) {
            filteredPosts = posts.filter(post => { var _a; return (_a = post.tags) === null || _a === void 0 ? void 0 : _a.some(t => t.id === tag || t.slug === tag); });
        }
        res.json({
            data: filteredPosts,
            meta: {
                page: pageNum,
                perPage: limitNum,
                total,
                totalPages: Math.ceil(total / limitNum)
            }
        });
    }
    catch (error) {
        console.error('Error fetching posts:', error);
        res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch posts' } });
    }
};
exports.getAllPosts = getAllPosts;
// Get single post
const getPost = async (req, res) => {
    var _a;
    try {
        const { id } = req.params;
        // Check if database is connected
        if (!connection_1.AppDataSource.isInitialized) {
            console.error('Database not initialized');
            return res.status(503).json({
                error: { code: 'DB_NOT_READY', message: 'Database connection not available' }
            });
        }
        const post = await postRepository.findOne({
            where: { id },
            relations: ['author', 'categories', 'tags']
        });
        if (!post) {
            return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Post not found' } });
        }
        // Increment view count safely (using meta field)
        const currentViews = ((_a = post.meta) === null || _a === void 0 ? void 0 : _a.views) || 0;
        const updatedMeta = {
            ...post.meta,
            views: Number(currentViews) + 1
        };
        await postRepository.update(id, {
            meta: updatedMeta
        });
        res.json({ data: post });
    }
    catch (error) {
        console.error('Error fetching post:', error);
        res.status(500).json({
            error: {
                code: 'INTERNAL_ERROR',
                message: 'Failed to fetch post',
                details: error.message
            }
        });
    }
};
exports.getPost = getPost;
// Create new post
const createPost = async (req, res) => {
    var _a;
    try {
        const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
        if (!userId) {
            return res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'User not authenticated' } });
        }
        // Check for duplicate request
        const requestHash = generateRequestHash(userId, req.body);
        const existingRequest = recentRequests.get(requestHash);
        if (existingRequest) {
            // If request was made within last 1 second, return the cached result
            if (Date.now() - existingRequest.timestamp < 1000) {
                // Duplicate request detected, returning cached result
                if (existingRequest.result) {
                    return res.status(201).json(existingRequest.result);
                }
                // Request is still being processed - wait a bit and continue
                // This prevents 409 errors for legitimate quick retries
            }
        }
        // Mark request as being processed
        recentRequests.set(requestHash, { timestamp: Date.now() });
        const { title, content, excerpt, slug, status = 'draft', type = 'post', categories = [], tags = [], featured_media, template, comment_status = 'open', ping_status = 'open', sticky = false, meta } = req.body;
        // Validate that at least title or content is provided
        if (!title && !content) {
            return res.status(400).json({
                error: {
                    code: 'VALIDATION_ERROR',
                    message: '제목이나 내용 중 하나는 입력해야 합니다'
                }
            });
        }
        // Validate title is not just whitespace
        if (title && typeof title === 'string' && !title.trim()) {
            return res.status(400).json({
                error: {
                    code: 'VALIDATION_ERROR',
                    message: '제목에 공백만 입력할 수 없습니다'
                }
            });
        }
        // Check if slug is unique
        if (slug) {
            const existingPost = await postRepository.findOne({ where: { slug } });
            if (existingPost) {
                return res.status(409).json({ error: { code: 'CONFLICT', message: 'Slug already exists' } });
            }
        }
        // Validate and generate slug
        let finalSlug = slug;
        // Check if provided slug is valid (only lowercase letters, numbers, and hyphens)
        if (finalSlug && !/^[a-z0-9-]+$/.test(finalSlug)) {
            return res.status(400).json({
                error: {
                    code: 'INVALID_SLUG',
                    message: 'Slug can only contain lowercase letters, numbers, and hyphens (a-z, 0-9, -)',
                    field: 'slug'
                }
            });
        }
        // If no slug provided, check if we can generate one
        if (!finalSlug) {
            if (title) {
                // Try to generate from title
                finalSlug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
                // If result is empty (e.g., Korean title), require manual input
                if (!finalSlug || finalSlug === '') {
                    return res.status(400).json({
                        error: {
                            code: 'SLUG_REQUIRED',
                            message: 'Please provide a URL slug. The title contains characters that cannot be converted to a valid URL.',
                            field: 'slug'
                        }
                    });
                }
            }
            else {
                // No title and no slug - use timestamp
                finalSlug = `post-${Date.now()}`;
            }
        }
        // Create new post
        const post = postRepository.create({
            title,
            content,
            excerpt,
            slug: finalSlug,
            status,
            type,
            author_id: userId,
            template,
            featured_media,
            comment_status,
            ping_status,
            sticky,
            meta,
            published_at: status === 'publish' || status === 'publish' ? new Date() : undefined
        });
        // Handle categories
        if (categories.length > 0) {
            const categoryEntities = await categoryRepository.findBy({
                id: (0, typeorm_1.In)(categories)
            });
            post.categories = categoryEntities;
        }
        // Handle tags
        if (tags.length > 0) {
            const tagEntities = await tagRepository.findBy({
                id: (0, typeorm_1.In)(tags)
            });
            post.tags = tagEntities;
        }
        const savedPost = await postRepository.save(post);
        // Cache the result
        const result = { data: savedPost };
        const cachedRequest = recentRequests.get(requestHash);
        if (cachedRequest) {
            cachedRequest.result = result;
        }
        res.status(201).json(result);
    }
    catch (error) {
        console.error('Error creating post:', error);
        res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to create post' } });
    }
};
exports.createPost = createPost;
// Update post
const updatePost = async (req, res) => {
    var _a;
    try {
        const { id } = req.params;
        const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
        if (!userId) {
            return res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'User not authenticated' } });
        }
        const post = await postRepository.findOne({
            where: { id },
            relations: ['categories', 'tags']
        });
        if (!post) {
            return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Post not found' } });
        }
        const { title, content, excerpt, slug, status, type, categories, tags, template, featured_media, comment_status, ping_status, sticky, meta } = req.body;
        // Validate that if updating title, it's not just whitespace
        if (title !== undefined && title && typeof title === 'string' && !title.trim()) {
            return res.status(400).json({
                error: {
                    code: 'VALIDATION_ERROR',
                    message: '제목에 공백만 입력할 수 없습니다'
                }
            });
        }
        // Validate slug if provided
        if (slug) {
            // Check if slug is valid (only lowercase letters, numbers, and hyphens)
            if (!/^[a-z0-9-]+$/.test(slug)) {
                return res.status(400).json({
                    error: {
                        code: 'INVALID_SLUG',
                        message: 'Slug can only contain lowercase letters, numbers, and hyphens (a-z, 0-9, -)',
                        field: 'slug'
                    }
                });
            }
            // Check slug uniqueness only if it's different from current
            if (slug && slug !== post.slug) {
                const existingPost = await postRepository.findOne({
                    where: {
                        slug
                    }
                });
                // Check if the found post exists and is different from current post
                if (existingPost && existingPost.id !== id) {
                    return res.status(409).json({
                        error: {
                            code: 'SLUG_CONFLICT',
                            message: `The slug "${slug}" is already in use by another post. Please choose a different slug.`,
                            field: 'slug',
                            suggestedSlug: `${slug}-${Date.now().toString().slice(-4)}`
                        }
                    });
                }
            }
        }
        // Update post fields
        if (title !== undefined)
            post.title = title;
        if (content !== undefined)
            post.content = content;
        if (excerpt !== undefined)
            post.excerpt = excerpt;
        if (slug !== undefined)
            post.slug = slug;
        if (status !== undefined) {
            post.status = status;
            if ((status === 'publish' || status === 'publish') && !post.published_at) {
                post.published_at = new Date();
            }
        }
        if (type !== undefined)
            post.type = type;
        if (template !== undefined)
            post.template = template;
        if (featured_media !== undefined)
            post.featured_media = featured_media;
        if (comment_status !== undefined)
            post.comment_status = comment_status;
        if (ping_status !== undefined)
            post.ping_status = ping_status;
        if (sticky !== undefined)
            post.sticky = sticky;
        if (meta !== undefined)
            post.meta = meta;
        // Update categories
        if (categories !== undefined) {
            const categoryEntities = categories.length > 0
                ? await categoryRepository.findBy({ id: (0, typeorm_1.In)(categories) })
                : [];
            post.categories = categoryEntities;
        }
        // Update tags
        if (tags !== undefined) {
            const tagEntities = tags.length > 0
                ? await tagRepository.findBy({ id: (0, typeorm_1.In)(tags) })
                : [];
            post.tags = tagEntities;
        }
        const updatedPost = await postRepository.save(post);
        res.json({ data: updatedPost });
    }
    catch (error) {
        console.error('Error updating post:', error);
        res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to update post' } });
    }
};
exports.updatePost = updatePost;
// Delete post
const deletePost = async (req, res) => {
    try {
        const { id } = req.params;
        const force = req.query.force === 'true';
        const post = await postRepository.findOne({ where: { id } });
        if (!post) {
            return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Post not found' } });
        }
        if (force) {
            // Hard delete - permanently remove from database
            await postRepository.remove(post);
            res.json({ data: { message: 'Post permanently deleted' } });
        }
        else {
            // Soft delete by changing status to trash
            post.status = 'trash';
            await postRepository.save(post);
            res.json({ data: { message: 'Post moved to trash' } });
        }
    }
    catch (error) {
        console.error('Error deleting post:', error);
        res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to delete post' } });
    }
};
exports.deletePost = deletePost;
// Auto-save post
const autoSavePost = async (req, res) => {
    var _a;
    try {
        const { id } = req.params;
        const { content, title, excerpt } = req.body;
        const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
        if (!userId) {
            return res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'User not authenticated' } });
        }
        const post = await postRepository.findOne({ where: { id } });
        if (!post) {
            return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Post not found' } });
        }
        // Create autosave entry
        const autosave = autosaveRepository.create({
            post_id: id,
            title,
            content,
            excerpt
        });
        const savedAutosave = await autosaveRepository.save(autosave);
        // Clean up old autosaves (keep only last 10)
        const allAutosaves = await autosaveRepository.find({
            where: { post_id: id },
            order: { saved_at: 'DESC' }
        });
        if (allAutosaves.length > 10) {
            const toDelete = allAutosaves.slice(10);
            await autosaveRepository.remove(toDelete);
        }
        res.json({
            data: {
                id: savedAutosave.id,
                post_id: id,
                saved_at: savedAutosave.saved_at,
                message: 'Auto-save successful'
            }
        });
    }
    catch (error) {
        console.error('Error auto-saving post:', error);
        res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to auto-save post' } });
    }
};
exports.autoSavePost = autoSavePost;
// Get post revisions
const getPostRevisions = async (req, res) => {
    var _a;
    try {
        const { id } = req.params;
        const post = await postRepository.findOne({
            where: { id },
            select: ['id', 'meta']
        });
        if (!post) {
            return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Post not found' } });
        }
        res.json(((_a = post.meta) === null || _a === void 0 ? void 0 : _a.revisions) || []);
    }
    catch (error) {
        console.error('Error fetching revisions:', error);
        res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch revisions' } });
    }
};
exports.getPostRevisions = getPostRevisions;
// Preview post
const previewPost = async (req, res) => {
    try {
        const { id } = req.params;
        const post = await postRepository.findOne({
            where: { id },
            relations: ['author', 'categories', 'tags']
        });
        if (!post) {
            return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Post not found' } });
        }
        // Return post with preview flag
        res.json({
            data: {
                ...post,
                preview: true,
                previewUrl: `/preview/posts/${id}`
            }
        });
    }
    catch (error) {
        console.error('Error previewing post:', error);
        res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to preview post' } });
    }
};
exports.previewPost = previewPost;
// Bulk operations with partial failure handling
const bulkOperatePosts = async (req, res) => {
    try {
        const { action, ids } = req.body;
        if (!action || !ids || !Array.isArray(ids) || ids.length === 0) {
            return res.status(400).json({
                error: {
                    code: 'VALIDATION_ERROR',
                    message: 'Invalid bulk operation parameters'
                }
            });
        }
        // Validate action
        const validActions = ['trash', 'restore', 'delete', 'publish', 'draft'];
        if (!validActions.includes(action)) {
            return res.status(400).json({
                error: {
                    code: 'VALIDATION_ERROR',
                    message: 'Invalid action'
                }
            });
        }
        const succeeded = [];
        const failed = [];
        // Process each ID individually to handle partial failures
        for (const id of ids) {
            try {
                const post = await postRepository.findOne({ where: { id } });
                if (!post) {
                    failed.push({
                        id,
                        code: 'NOT_FOUND',
                        message: 'Post not found'
                    });
                    continue;
                }
                // Apply action based on current state
                switch (action) {
                    case 'trash':
                        if (post.status === 'trash') {
                            failed.push({
                                id,
                                code: 'ALREADY_TRASHED',
                                message: 'Post is already in trash'
                            });
                        }
                        else {
                            post.status = 'trash';
                            await postRepository.save(post);
                            succeeded.push(id);
                        }
                        break;
                    case 'restore':
                        if (post.status !== 'trash') {
                            failed.push({
                                id,
                                code: 'NOT_IN_TRASH',
                                message: 'Post is not in trash'
                            });
                        }
                        else {
                            post.status = 'draft';
                            await postRepository.save(post);
                            succeeded.push(id);
                        }
                        break;
                    case 'delete':
                        await postRepository.remove(post);
                        succeeded.push(id);
                        break;
                    case 'publish':
                        if (post.status === 'publish') {
                            failed.push({
                                id,
                                code: 'ALREADY_PUBLISHED',
                                message: 'Post is already published'
                            });
                        }
                        else {
                            post.status = 'publish';
                            post.published_at = post.published_at || new Date();
                            await postRepository.save(post);
                            succeeded.push(id);
                        }
                        break;
                    case 'draft':
                        if (post.status === 'draft') {
                            failed.push({
                                id,
                                code: 'ALREADY_DRAFT',
                                message: 'Post is already a draft'
                            });
                        }
                        else {
                            post.status = 'draft';
                            await postRepository.save(post);
                            succeeded.push(id);
                        }
                        break;
                }
            }
            catch (error) {
                failed.push({
                    id,
                    code: 'OPERATION_FAILED',
                    message: error.message || 'Failed to process post'
                });
            }
        }
        // Return 200 with partial results
        res.json({
            data: {
                action,
                succeeded,
                failed,
                total: ids.length,
                successCount: succeeded.length,
                failureCount: failed.length
            }
        });
    }
    catch (error) {
        console.error('Error in bulk operation:', error);
        res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to perform bulk operation' } });
    }
};
exports.bulkOperatePosts = bulkOperatePosts;
// Get post counts by status
const getPostCounts = async (req, res) => {
    var _a;
    try {
        // Get the authenticated user if available
        const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
        // Get all posts
        const allPosts = await postRepository.find({
            where: { type: 'post' },
            select: ['id', 'status', 'author_id']
        });
        // Calculate counts
        const counts = {
            all: allPosts.filter(p => p.status !== 'trash').length,
            mine: userId ? allPosts.filter(p => p.author_id === userId && p.status !== 'trash').length : 0,
            published: allPosts.filter(p => p.status === 'publish').length,
            draft: allPosts.filter(p => p.status === 'draft').length,
            private: allPosts.filter(p => p.status === 'private').length,
            trash: allPosts.filter(p => p.status === 'trash').length
        };
        res.json(counts);
    }
    catch (error) {
        console.error('Error fetching post counts:', error);
        res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch post counts' } });
    }
};
exports.getPostCounts = getPostCounts;
//# sourceMappingURL=postsController.js.map
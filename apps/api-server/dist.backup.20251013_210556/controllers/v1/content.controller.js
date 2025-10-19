"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ContentController = void 0;
const connection_1 = require("../../database/connection");
const Post_1 = require("../../entities/Post");
const Page_1 = require("../../entities/Page");
const Category_1 = require("../../entities/Category");
const User_1 = require("../../entities/User");
const MediaFile_1 = require("../../entities/MediaFile");
const Tag_1 = require("../../entities/Tag");
class ContentController {
    constructor() {
        this.postRepository = connection_1.AppDataSource.getRepository(Post_1.Post);
        this.pageRepository = connection_1.AppDataSource.getRepository(Page_1.Page);
        this.categoryRepository = connection_1.AppDataSource.getRepository(Category_1.Category);
        this.userRepository = connection_1.AppDataSource.getRepository(User_1.User);
        this.mediaRepository = connection_1.AppDataSource.getRepository(MediaFile_1.MediaFile);
        this.tagRepository = connection_1.AppDataSource.getRepository(Tag_1.Tag);
        // Posts Management
        this.getPosts = async (req, res) => {
            try {
                const { page = 1, pageSize = 20, type = 'post', status, search } = req.query;
                // Check database connection
                if (!connection_1.AppDataSource.isInitialized) {
                    return res.status(503).json({
                        status: "error",
                        message: "Database connection not initialized"
                    });
                }
                // Real implementation would query database
                const queryBuilder = this.postRepository.createQueryBuilder('post')
                    .leftJoinAndSelect('post.author', 'author')
                    .leftJoinAndSelect('post.categories', 'categories')
                    .leftJoinAndSelect('post.tags', 'tags');
                if (status) {
                    queryBuilder.andWhere('post.status = :status', { status });
                }
                if (search) {
                    queryBuilder.andWhere('(post.title ILIKE :search OR post.content ILIKE :search)', {
                        search: `%${search}%`
                    });
                }
                const skip = (Number(page) - 1) * Number(pageSize);
                queryBuilder.skip(skip).take(Number(pageSize));
                const [posts, total] = await queryBuilder.getManyAndCount();
                return res.json({
                    status: 'success',
                    data: posts,
                    pagination: {
                        page: Number(page),
                        pageSize: Number(pageSize),
                        totalItems: total,
                        totalPages: Math.ceil(total / Number(pageSize))
                    }
                });
            }
            catch (error) {
                return res.status(500).json({
                    status: 'error',
                    message: 'Failed to fetch posts'
                });
            }
        };
        this.getPost = async (req, res) => {
            try {
                const { id } = req.params;
                if (!connection_1.AppDataSource.isInitialized) {
                    return res.status(503).json({
                        status: "error",
                        message: "Database connection not initialized"
                    });
                }
                const post = await this.postRepository.findOne({
                    where: { id },
                    relations: ['author', 'categories', 'tags']
                });
                if (!post) {
                    return res.status(404).json({
                        status: 'error',
                        message: 'Post not found'
                    });
                }
                return res.json({
                    status: 'success',
                    data: post
                });
            }
            catch (error) {
                return res.status(500).json({
                    status: 'error',
                    message: 'Failed to fetch post'
                });
            }
        };
        this.createPost = async (req, res) => {
            var _a;
            try {
                const { title, content, status = 'draft', slug } = req.body;
                // Validate required fields
                if (!title || title.trim() === '') {
                    return res.status(400).json({
                        message: 'Title is required',
                        error: 'TITLE_REQUIRED',
                        details: 'Post title cannot be empty'
                    });
                }
                // Use user.id directly instead of userId for UUID compatibility
                const user = req.user;
                const userId = (user === null || user === void 0 ? void 0 : user.id) || (user === null || user === void 0 ? void 0 : user.userId);
                if (!connection_1.AppDataSource.isInitialized) {
                    return res.status(503).json({
                        status: "error",
                        message: "Database connection not initialized"
                    });
                }
                // Ensure userId is available
                if (!userId) {
                    return res.status(401).json({
                        message: 'User authentication required'
                    });
                }
                // Debug: Log the userId to check its format
                if (global.logger) {
                    global.logger.info('Creating post with userId:', {
                        userId,
                        userIdType: typeof userId,
                        userObj: user,
                        userId_direct: user === null || user === void 0 ? void 0 : user.userId,
                        id_direct: user === null || user === void 0 ? void 0 : user.id
                    });
                }
                // Prepare content structure
                let postContent;
                if (Array.isArray(content)) {
                    // If content is already an array of blocks
                    postContent = { blocks: content };
                }
                else if (content && typeof content === 'object' && 'blocks' in content) {
                    // If content already has blocks structure
                    postContent = content;
                }
                else {
                    // Default to empty blocks
                    postContent = { blocks: [] };
                }
                // Validate slug
                // Slug is required for all posts
                if (!slug || slug.trim() === '') {
                    return res.status(400).json({
                        message: 'Slug is required. Please enter a URL-friendly slug for this post.',
                        error: 'SLUG_REQUIRED',
                        details: 'Every post must have a valid slug for URL generation'
                    });
                }
                // Validate slug format
                const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
                if (!slugPattern.test(slug)) {
                    return res.status(400).json({
                        message: 'Invalid slug format',
                        error: 'INVALID_SLUG_FORMAT',
                        details: 'Slug can only contain lowercase letters, numbers, and hyphens (a-z, 0-9, -)'
                    });
                }
                const post = this.postRepository.create({
                    title: title || 'Untitled',
                    content: postContent,
                    status,
                    authorId: userId,
                    slug: slug.trim(), // Use user-provided slug
                    type: 'post'
                });
                const savedPost = await this.postRepository.save(post);
                return res.json({
                    success: true,
                    data: savedPost
                });
            }
            catch (error) {
                // Log the actual error for debugging
                const errorMessage = error.message || 'Failed to create post';
                const errorStack = error.stack;
                // Use logger if available, otherwise use console for debugging
                if (global.logger) {
                    global.logger.error('Post creation failed:', {
                        error: errorMessage,
                        stack: errorStack,
                        body: req.body,
                        userId: (_a = req.user) === null || _a === void 0 ? void 0 : _a.userId
                    });
                }
                else {
                    // console.error('Failed to create post:', error);
                }
                return res.status(500).json({
                    message: 'Failed to create post',
                    error: errorMessage
                });
            }
        };
        this.createDraft = async (req, res) => {
            var _a;
            try {
                const { title, content } = req.body;
                // Use user.id directly instead of userId for UUID compatibility
                const user = req.user;
                const userId = (user === null || user === void 0 ? void 0 : user.id) || (user === null || user === void 0 ? void 0 : user.userId);
                if (!connection_1.AppDataSource.isInitialized) {
                    return res.status(503).json({
                        status: "error",
                        message: "Database connection not initialized"
                    });
                }
                // Prepare content structure
                let postContent;
                if (Array.isArray(content)) {
                    // If content is already an array of blocks
                    postContent = { blocks: content };
                }
                else if (content && typeof content === 'object' && 'blocks' in content) {
                    // If content already has blocks structure
                    postContent = content;
                }
                else {
                    // Default to empty blocks
                    postContent = { blocks: [] };
                }
                // Generate unique slug with timestamp to avoid duplicates
                const baseSlug = (title || 'untitled-draft').toLowerCase().replace(/[^a-z0-9]+/g, '-');
                const uniqueSuffix = Date.now().toString(36); // Convert timestamp to base36 for shorter string
                const uniqueSlug = `${baseSlug}-${uniqueSuffix}`;
                const post = this.postRepository.create({
                    title: title || 'Untitled Draft',
                    content: postContent,
                    status: 'draft',
                    authorId: userId,
                    slug: uniqueSlug,
                    type: 'post'
                });
                const savedPost = await this.postRepository.save(post);
                return res.json({
                    success: true,
                    data: savedPost
                });
            }
            catch (error) {
                // Log the actual error for debugging
                const errorMessage = error.message || 'Failed to create draft';
                const errorStack = error.stack;
                // Use logger if available, otherwise use console for debugging
                if (global.logger) {
                    global.logger.error('Draft save failed:', {
                        error: errorMessage,
                        stack: errorStack,
                        body: req.body,
                        userId: (_a = req.user) === null || _a === void 0 ? void 0 : _a.userId
                    });
                }
                return res.status(500).json({
                    message: 'Failed to create draft',
                    error: process.env.NODE_ENV === 'development' ? errorMessage : undefined
                });
            }
        };
        this.publishPost = async (req, res) => {
            try {
                const { id } = req.params;
                if (!connection_1.AppDataSource.isInitialized) {
                    return res.status(503).json({
                        status: "error",
                        message: "Database connection not initialized"
                    });
                }
                const post = await this.postRepository.findOne({ where: { id } });
                if (!post) {
                    return res.status(404).json({
                        message: 'Post not found'
                    });
                }
                post.status = 'publish';
                post.published_at = new Date();
                const updatedPost = await this.postRepository.save(post);
                return res.json({
                    success: true,
                    data: updatedPost
                });
            }
            catch (error) {
                return res.status(500).json({
                    message: 'Failed to publish post'
                });
            }
        };
        this.updatePost = async (req, res) => {
            var _a;
            try {
                const { id } = req.params;
                const updateData = req.body;
                // Validate title if it's being updated
                if ('title' in updateData && (!updateData.title || updateData.title.trim() === '')) {
                    return res.status(400).json({
                        message: 'Title cannot be empty',
                        error: 'INVALID_TITLE',
                        details: 'Post title is required and cannot be blank'
                    });
                }
                // Validate slug if it's being updated
                if ('slug' in updateData) {
                    if (!updateData.slug || updateData.slug.trim() === '') {
                        return res.status(400).json({
                            message: 'Slug cannot be empty',
                            error: 'INVALID_SLUG',
                            details: 'Every post must have a valid slug for URL generation'
                        });
                    }
                    // Check if slug contains only valid characters
                    const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
                    if (!slugPattern.test(updateData.slug)) {
                        return res.status(400).json({
                            message: 'Invalid slug format',
                            error: 'INVALID_SLUG_FORMAT',
                            details: 'Slug can only contain lowercase letters, numbers, and hyphens'
                        });
                    }
                }
                if (!connection_1.AppDataSource.isInitialized) {
                    return res.status(503).json({
                        status: "error",
                        message: "Database connection not initialized"
                    });
                }
                // Find the existing post first
                const post = await this.postRepository.findOne({
                    where: { id },
                    relations: ['author', 'categories', 'tags']
                });
                if (!post) {
                    return res.status(404).json({
                        message: 'Post not found',
                        error: 'POST_NOT_FOUND'
                    });
                }
                // Update all fields including JSON fields like content
                Object.assign(post, updateData);
                // Use save() instead of update() to properly handle all fields
                const updatedPost = await this.postRepository.save(post);
                return res.json({
                    success: true,
                    data: updatedPost
                });
            }
            catch (error) {
                // Log the actual error
                // console.error('Update post error:', error);
                // Check for unique constraint violation
                if (error.code === '23505' && ((_a = error.detail) === null || _a === void 0 ? void 0 : _a.includes('slug'))) {
                    return res.status(400).json({
                        message: 'This slug is already in use',
                        error: 'DUPLICATE_SLUG'
                    });
                }
                return res.status(500).json({
                    message: 'Failed to update post',
                    error: process.env.NODE_ENV === 'development' ? error.message : undefined
                });
            }
        };
        this.deletePost = async (req, res) => {
            try {
                const { id } = req.params;
                if (!connection_1.AppDataSource.isInitialized) {
                    return res.status(503).json({
                        status: "error",
                        message: "Database connection not initialized"
                    });
                }
                await this.postRepository.delete(id);
                return res.json({
                    success: true,
                    message: 'Post deleted successfully'
                });
            }
            catch (error) {
                return res.status(500).json({
                    message: 'Failed to delete post'
                });
            }
        };
        this.clonePost = async (req, res) => {
            try {
                const { id } = req.params;
                if (!connection_1.AppDataSource.isInitialized) {
                    return res.status(503).json({
                        status: "error",
                        message: "Database connection not initialized"
                    });
                }
                const original = await this.postRepository.findOne({ where: { id } });
                if (!original) {
                    return res.status(404).json({
                        status: 'error',
                        message: 'Post not found'
                    });
                }
                const cloned = this.postRepository.create({
                    ...original,
                    id: undefined,
                    title: `${original.title} (Copy)`,
                    slug: `${original.slug}-copy`,
                    created_at: new Date(),
                    updated_at: new Date()
                });
                const savedPost = await this.postRepository.save(cloned);
                return res.json({
                    status: 'success',
                    data: savedPost
                });
            }
            catch (error) {
                return res.status(500).json({
                    status: 'error',
                    message: 'Failed to clone post'
                });
            }
        };
        this.bulkUpdatePosts = async (req, res) => {
            try {
                const { ids, data } = req.body;
                if (!connection_1.AppDataSource.isInitialized) {
                    return res.status(503).json({
                        status: "error",
                        message: "Database connection not initialized"
                    });
                }
                await this.postRepository.update(ids, data);
                return res.json({
                    status: 'success',
                    message: 'Posts updated successfully'
                });
            }
            catch (error) {
                return res.status(500).json({
                    status: 'error',
                    message: 'Failed to update posts'
                });
            }
        };
        this.bulkDeletePosts = async (req, res) => {
            try {
                const { ids } = req.body;
                if (!connection_1.AppDataSource.isInitialized) {
                    return res.status(503).json({
                        status: "error",
                        message: "Database connection not initialized"
                    });
                }
                await this.postRepository.delete(ids);
                return res.json({
                    status: 'success',
                    message: 'Posts deleted successfully'
                });
            }
            catch (error) {
                return res.status(500).json({
                    status: 'error',
                    message: 'Failed to delete posts'
                });
            }
        };
        // Categories Management
        this.getCategories = async (req, res) => {
            try {
                if (!connection_1.AppDataSource.isInitialized) {
                    return res.status(503).json({
                        status: "error",
                        message: "Database connection not initialized"
                    });
                }
                const categories = await this.categoryRepository.find({
                    order: {
                        sortOrder: 'ASC',
                        name: 'ASC'
                    }
                });
                return res.json({
                    status: 'success',
                    data: categories
                });
            }
            catch (error) {
                // console.error('Error fetching categories:', error);
                return res.status(500).json({
                    status: 'error',
                    message: 'Failed to fetch categories',
                    error: process.env.NODE_ENV === 'development' ? error.message : undefined
                });
            }
        };
        this.getCategory = async (req, res) => {
            try {
                const { id } = req.params;
                if (!connection_1.AppDataSource.isInitialized) {
                    return res.status(503).json({
                        status: "error",
                        message: "Database connection not initialized"
                    });
                }
                const category = await this.categoryRepository.findOne({ where: { id } });
                if (!category) {
                    return res.status(404).json({
                        status: 'error',
                        message: 'Category not found'
                    });
                }
                return res.json({
                    status: 'success',
                    data: category
                });
            }
            catch (error) {
                return res.status(500).json({
                    status: 'error',
                    message: 'Failed to fetch category'
                });
            }
        };
        this.createCategory = async (req, res) => {
            try {
                const categoryData = req.body;
                if (!connection_1.AppDataSource.isInitialized) {
                    return res.status(503).json({
                        status: "error",
                        message: "Database connection not initialized"
                    });
                }
                const category = this.categoryRepository.create(categoryData);
                const savedCategory = await this.categoryRepository.save(category);
                return res.json({
                    status: 'success',
                    data: savedCategory
                });
            }
            catch (error) {
                return res.status(500).json({
                    status: 'error',
                    message: 'Failed to create category'
                });
            }
        };
        this.updateCategory = async (req, res) => {
            try {
                const { id } = req.params;
                const updateData = req.body;
                if (!connection_1.AppDataSource.isInitialized) {
                    return res.status(503).json({
                        status: "error",
                        message: "Database connection not initialized"
                    });
                }
                await this.categoryRepository.update(id, updateData);
                const updatedCategory = await this.categoryRepository.findOne({ where: { id } });
                return res.json({
                    status: 'success',
                    data: updatedCategory
                });
            }
            catch (error) {
                return res.status(500).json({
                    status: 'error',
                    message: 'Failed to update category'
                });
            }
        };
        this.deleteCategory = async (req, res) => {
            try {
                const { id } = req.params;
                if (!connection_1.AppDataSource.isInitialized) {
                    return res.status(503).json({
                        status: "error",
                        message: "Database connection not initialized"
                    });
                }
                await this.categoryRepository.delete(id);
                return res.json({
                    status: 'success',
                    message: 'Category deleted successfully'
                });
            }
            catch (error) {
                return res.status(500).json({
                    status: 'error',
                    message: 'Failed to delete category'
                });
            }
        };
        // Tags Management
        this.getTags = async (req, res) => {
            try {
                const { search } = req.query;
                if (!connection_1.AppDataSource.isInitialized) {
                    return res.status(503).json({
                        status: "error",
                        message: "Database connection not initialized"
                    });
                }
                const tagRepository = this.tagRepository;
                let query = tagRepository.createQueryBuilder('tag')
                    .orderBy('tag.name', 'ASC');
                if (search) {
                    query = query.andWhere('(tag.name LIKE :search OR tag.description LIKE :search)', { search: `%${search}%` });
                }
                const tags = await query.getMany();
                // Format response with postCount instead of usageCount for frontend compatibility
                const formattedTags = tags.map((tag) => ({
                    id: tag.id,
                    name: tag.name,
                    slug: tag.slug,
                    description: tag.description,
                    postCount: tag.count || 0,
                    createdAt: tag.created_at,
                    updatedAt: tag.updated_at
                }));
                return res.json({
                    status: 'success',
                    data: formattedTags,
                    tags: formattedTags // Also include in 'tags' key for compatibility
                });
            }
            catch (error) {
                return res.status(500).json({
                    status: 'error',
                    message: 'Failed to fetch tags'
                });
            }
        };
        this.getTag = async (req, res) => {
            try {
                const { id } = req.params;
                if (!connection_1.AppDataSource.isInitialized) {
                    return res.status(503).json({
                        status: "error",
                        message: "Database connection not initialized"
                    });
                }
                const tagRepository = this.tagRepository;
                const tag = await tagRepository.findOne({ where: { id } });
                if (!tag) {
                    return res.status(404).json({
                        status: 'error',
                        message: 'Tag not found'
                    });
                }
                return res.json({
                    status: 'success',
                    data: {
                        id: tag.id,
                        name: tag.name,
                        slug: tag.slug,
                        description: tag.description,
                        postCount: tag.count || 0,
                        createdAt: tag.created_at,
                        updatedAt: tag.updated_at
                    }
                });
            }
            catch (error) {
                return res.status(500).json({
                    status: 'error',
                    message: 'Failed to fetch tag'
                });
            }
        };
        this.createTag = async (req, res) => {
            try {
                const { name, description, slug } = req.body;
                if (!name) {
                    return res.status(400).json({
                        status: 'error',
                        message: 'Tag name is required'
                    });
                }
                if (!connection_1.AppDataSource.isInitialized) {
                    return res.status(503).json({
                        status: "error",
                        message: "Database connection not initialized"
                    });
                }
                const tagRepository = this.tagRepository;
                // Check if tag with same slug already exists
                const finalSlug = slug || name.toLowerCase().replace(/[^a-z0-9가-힣]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
                const existingTag = await tagRepository.findOne({ where: { slug: finalSlug } });
                if (existingTag) {
                    return res.status(409).json({
                        status: 'error',
                        message: 'Tag with this slug already exists'
                    });
                }
                const newTag = tagRepository.create({
                    name,
                    slug: finalSlug,
                    description,
                    count: 0
                });
                const savedTag = await tagRepository.save(newTag);
                return res.json({
                    status: 'success',
                    data: {
                        id: savedTag.id,
                        name: savedTag.name,
                        slug: savedTag.slug,
                        description: savedTag.description,
                        postCount: 0,
                        createdAt: savedTag.created_at,
                        updatedAt: savedTag.updated_at
                    }
                });
            }
            catch (error) {
                return res.status(500).json({
                    status: 'error',
                    message: 'Failed to create tag'
                });
            }
        };
        this.updateTag = async (req, res) => {
            try {
                const { id } = req.params;
                const { name, description, slug } = req.body;
                if (!connection_1.AppDataSource.isInitialized) {
                    return res.status(503).json({
                        status: "error",
                        message: "Database connection not initialized"
                    });
                }
                const tagRepository = this.tagRepository;
                const tag = await tagRepository.findOne({ where: { id } });
                if (!tag) {
                    return res.status(404).json({
                        status: 'error',
                        message: 'Tag not found'
                    });
                }
                // Update tag fields
                if (name)
                    tag.name = name;
                if (description !== undefined)
                    tag.description = description;
                if (slug)
                    tag.slug = slug;
                const updatedTag = await tagRepository.save(tag);
                return res.json({
                    status: 'success',
                    data: {
                        id: updatedTag.id,
                        name: updatedTag.name,
                        slug: updatedTag.slug,
                        description: updatedTag.description,
                        postCount: updatedTag.count || 0,
                        createdAt: updatedTag.created_at,
                        updatedAt: updatedTag.updated_at
                    }
                });
            }
            catch (error) {
                return res.status(500).json({
                    status: 'error',
                    message: 'Failed to update tag'
                });
            }
        };
        this.deleteTag = async (req, res) => {
            try {
                const { id } = req.params;
                if (!connection_1.AppDataSource.isInitialized) {
                    return res.status(503).json({
                        status: "error",
                        message: "Database connection not initialized"
                    });
                }
                const tagRepository = this.tagRepository;
                const tag = await tagRepository.findOne({ where: { id } });
                if (!tag) {
                    return res.status(404).json({
                        status: 'error',
                        message: 'Tag not found'
                    });
                }
                await tagRepository.remove(tag);
                return res.json({
                    status: 'success',
                    message: 'Tag deleted successfully'
                });
            }
            catch (error) {
                return res.status(500).json({
                    status: 'error',
                    message: 'Failed to delete tag'
                });
            }
        };
        // Pages Management
        this.getPages = async (req, res) => {
            try {
                const { page = 1, pageSize = 20, status } = req.query;
                if (!connection_1.AppDataSource.isInitialized) {
                    return res.status(503).json({
                        status: "error",
                        message: "Database connection not initialized"
                    });
                }
                // Use Posts API with type='page' for consistency
                const queryBuilder = this.postRepository.createQueryBuilder('post')
                    .leftJoinAndSelect('post.author', 'author')
                    .leftJoinAndSelect('post.categories', 'categories')
                    .leftJoinAndSelect('post.tags', 'tags')
                    .where('post.type = :type', { type: 'page' });
                if (status) {
                    queryBuilder.andWhere('post.status = :status', { status });
                }
                const skip = (Number(page) - 1) * Number(pageSize);
                queryBuilder.skip(skip).take(Number(pageSize));
                const [pages, total] = await queryBuilder.getManyAndCount();
                return res.json({
                    status: 'success',
                    data: pages,
                    pagination: {
                        page: Number(page),
                        pageSize: Number(pageSize),
                        totalItems: total,
                        totalPages: Math.ceil(total / Number(pageSize))
                    }
                });
            }
            catch (error) {
                // console.error('getPages error:', error);
                return res.status(500).json({
                    status: 'error',
                    message: 'Failed to fetch pages'
                });
            }
        };
        this.getPage = async (req, res) => {
            return res.json({
                status: 'success',
                data: {
                    id: req.params.id,
                    title: 'Sample Page',
                    slug: 'sample-page',
                    content: { type: 'doc', content: [] }
                }
            });
        };
        this.createPage = async (req, res) => {
            return res.json({
                status: 'success',
                data: { id: Date.now().toString(), ...req.body }
            });
        };
        this.updatePage = async (req, res) => {
            return res.json({
                status: 'success',
                data: { id: req.params.id, ...req.body }
            });
        };
        this.deletePage = async (req, res) => {
            return res.json({
                status: 'success',
                message: 'Page deleted successfully'
            });
        };
        // Media Management
        this.getMediaFiles = async (req, res) => {
            try {
                // 데이터베이스가 초기화되지 않은 경우 빈 배열 반환
                if (!connection_1.AppDataSource.isInitialized) {
                    return res.status(503).json({
                        status: "error",
                        message: "Database connection not initialized"
                    });
                }
                // 데이터베이스에서 미디어 파일 가져오기
                const media = await this.mediaRepository.find();
                return res.json({
                    status: 'success',
                    data: media
                });
            }
            catch (error) {
                return res.status(500).json({
                    status: 'error',
                    message: 'Failed to fetch media files'
                });
            }
        };
        this.getMediaFile = async (req, res) => {
            return res.json({
                status: 'success',
                data: { id: req.params.id, filename: 'sample.jpg', url: '/uploads/sample.jpg' }
            });
        };
        this.uploadMedia = async (req, res) => {
            return res.json({
                status: 'success',
                data: {
                    id: Date.now().toString(),
                    filename: 'uploaded.jpg',
                    url: '/uploads/uploaded.jpg'
                }
            });
        };
        this.updateMedia = async (req, res) => {
            return res.json({
                status: 'success',
                data: { id: req.params.id, ...req.body }
            });
        };
        this.deleteMedia = async (req, res) => {
            return res.json({
                status: 'success',
                message: 'Media deleted successfully'
            });
        };
        // Authors
        this.getAuthors = async (req, res) => {
            try {
                if (!connection_1.AppDataSource.isInitialized) {
                    return res.status(503).json({
                        status: "error",
                        message: "Database connection not initialized"
                    });
                }
                const users = await this.userRepository.find({
                    select: ['id', 'name'],
                    where: { status: User_1.UserStatus.ACTIVE }
                });
                return res.json({
                    status: 'success',
                    data: users
                });
            }
            catch (error) {
                return res.status(500).json({
                    status: 'error',
                    message: 'Failed to fetch authors'
                });
            }
        };
    }
}
exports.ContentController = ContentController;
//# sourceMappingURL=content.controller.js.map
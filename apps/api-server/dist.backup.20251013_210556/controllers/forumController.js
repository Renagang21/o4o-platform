"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ForumController = void 0;
const forumService_1 = require("../services/forumService");
class ForumController {
    constructor() {
        // Category endpoints
        this.getCategories = async (req, res) => {
            try {
                const { includeInactive = false } = req.query;
                const categories = await forumService_1.forumService.getCategories(includeInactive === 'true');
                res.json({
                    success: true,
                    data: categories
                });
            }
            catch (error) {
                // Error log removed
                res.status(500).json({
                    success: false,
                    error: 'Failed to fetch forum categories'
                });
            }
        };
        this.getCategoryBySlug = async (req, res) => {
            try {
                const { slug } = req.params;
                const category = await forumService_1.forumService.getCategoryBySlug(slug);
                if (!category) {
                    return res.status(404).json({
                        success: false,
                        error: 'Category not found'
                    });
                }
                res.json({
                    success: true,
                    data: category
                });
            }
            catch (error) {
                // Error log removed
                res.status(500).json({
                    success: false,
                    error: 'Failed to fetch category'
                });
            }
        };
        this.createCategory = async (req, res) => {
            var _a, _b;
            try {
                const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
                const userRole = (_b = req.user) === null || _b === void 0 ? void 0 : _b.role;
                if (!userId || !['admin', 'manager'].includes(userRole || '')) {
                    return res.status(403).json({
                        success: false,
                        error: 'Insufficient permissions'
                    });
                }
                const categoryData = req.body;
                const category = await forumService_1.forumService.createCategory(categoryData, userId);
                res.status(201).json({
                    success: true,
                    data: category
                });
            }
            catch (error) {
                // Error log removed
                res.status(500).json({
                    success: false,
                    error: 'Failed to create category'
                });
            }
        };
        this.updateCategory = async (req, res) => {
            var _a, _b;
            try {
                const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
                const userRole = (_b = req.user) === null || _b === void 0 ? void 0 : _b.role;
                const { categoryId } = req.params;
                if (!userId || !['admin', 'manager'].includes(userRole || '')) {
                    return res.status(403).json({
                        success: false,
                        error: 'Insufficient permissions'
                    });
                }
                const updateData = req.body;
                const category = await forumService_1.forumService.updateCategory(categoryId, updateData);
                if (!category) {
                    return res.status(404).json({
                        success: false,
                        error: 'Category not found'
                    });
                }
                res.json({
                    success: true,
                    data: category
                });
            }
            catch (error) {
                // Error log removed
                res.status(500).json({
                    success: false,
                    error: 'Failed to update category'
                });
            }
        };
        // Post endpoints
        this.getPosts = async (req, res) => {
            var _a;
            try {
                const userRole = ((_a = req.user) === null || _a === void 0 ? void 0 : _a.role) || 'customer';
                const searchOptions = {
                    query: req.query.q,
                    categoryId: req.query.categoryId,
                    authorId: req.query.author_id,
                    tags: req.query.tags ? req.query.tags.split(',') : undefined,
                    type: req.query.type,
                    page: parseInt(req.query.page) || 1,
                    limit: parseInt(req.query.limit) || 20,
                    sortBy: req.query.sortBy || 'latest'
                };
                if (req.query.startDate || req.query.endDate) {
                    searchOptions.dateRange = {
                        start: req.query.startDate ? new Date(req.query.startDate) : undefined,
                        end: req.query.endDate ? new Date(req.query.endDate) : undefined
                    };
                }
                const result = await forumService_1.forumService.searchPosts(searchOptions, userRole);
                res.json({
                    success: true,
                    data: result
                });
            }
            catch (error) {
                // Error log removed
                res.status(500).json({
                    success: false,
                    error: 'Failed to fetch posts'
                });
            }
        };
        this.getPostById = async (req, res) => {
            var _a, _b;
            try {
                const { postId } = req.params;
                const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
                const post = await forumService_1.forumService.getPost(postId, userId);
                if (!post) {
                    return res.status(404).json({
                        success: false,
                        error: 'Post not found'
                    });
                }
                // 접근 권한 확인
                if (!post.canUserView(((_b = req.user) === null || _b === void 0 ? void 0 : _b.role) || '')) {
                    return res.status(403).json({
                        success: false,
                        error: 'Access denied'
                    });
                }
                res.json({
                    success: true,
                    data: post
                });
            }
            catch (error) {
                // Error log removed
                res.status(500).json({
                    success: false,
                    error: 'Failed to fetch post'
                });
            }
        };
        this.getPostBySlug = async (req, res) => {
            var _a, _b;
            try {
                const { slug } = req.params;
                const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
                const post = await forumService_1.forumService.getPostBySlug(slug, userId);
                if (!post) {
                    return res.status(404).json({
                        success: false,
                        error: 'Post not found'
                    });
                }
                // 접근 권한 확인
                if (!post.canUserView(((_b = req.user) === null || _b === void 0 ? void 0 : _b.role) || '')) {
                    return res.status(403).json({
                        success: false,
                        error: 'Access denied'
                    });
                }
                res.json({
                    success: true,
                    data: post
                });
            }
            catch (error) {
                // Error log removed
                res.status(500).json({
                    success: false,
                    error: 'Failed to fetch post'
                });
            }
        };
        this.createPost = async (req, res) => {
            var _a, _b;
            try {
                const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
                const userRole = (_b = req.user) === null || _b === void 0 ? void 0 : _b.role;
                if (!userId) {
                    return res.status(401).json({
                        success: false,
                        error: 'Authentication required'
                    });
                }
                const postData = req.body;
                // 카테고리 접근 권한 확인은 서비스에서 처리
                const post = await forumService_1.forumService.createPost(postData, userId);
                res.status(201).json({
                    success: true,
                    data: post
                });
            }
            catch (error) {
                // Error log removed
                res.status(500).json({
                    success: false,
                    error: error.message || 'Failed to create post'
                });
            }
        };
        this.updatePost = async (req, res) => {
            var _a, _b;
            try {
                const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
                const userRole = ((_b = req.user) === null || _b === void 0 ? void 0 : _b.role) || '';
                const { postId } = req.params;
                if (!userId) {
                    return res.status(401).json({
                        success: false,
                        error: 'Authentication required'
                    });
                }
                const updateData = req.body;
                const post = await forumService_1.forumService.updatePost(postId, updateData, userId, userRole);
                if (!post) {
                    return res.status(404).json({
                        success: false,
                        error: 'Post not found'
                    });
                }
                res.json({
                    success: true,
                    data: post
                });
            }
            catch (error) {
                // Error log removed
                res.status(500).json({
                    success: false,
                    error: error.message || 'Failed to update post'
                });
            }
        };
        // Comment endpoints
        this.getComments = async (req, res) => {
            try {
                const { postId } = req.params;
                const page = parseInt(req.query.page) || 1;
                const limit = parseInt(req.query.limit) || 20;
                const result = await forumService_1.forumService.getComments(postId, page, limit);
                res.json({
                    success: true,
                    data: result
                });
            }
            catch (error) {
                // Error log removed
                res.status(500).json({
                    success: false,
                    error: 'Failed to fetch comments'
                });
            }
        };
        this.createComment = async (req, res) => {
            var _a;
            try {
                const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
                if (!userId) {
                    return res.status(401).json({
                        success: false,
                        error: 'Authentication required'
                    });
                }
                const commentData = req.body;
                const comment = await forumService_1.forumService.createComment(commentData, userId);
                res.status(201).json({
                    success: true,
                    data: comment
                });
            }
            catch (error) {
                // Error log removed
                res.status(500).json({
                    success: false,
                    error: error.message || 'Failed to create comment'
                });
            }
        };
        // Statistics endpoint
        this.getStatistics = async (req, res) => {
            var _a;
            try {
                const userRole = (_a = req.user) === null || _a === void 0 ? void 0 : _a.role;
                // 통계는 로그인된 사용자만 조회 가능
                if (!userRole) {
                    return res.status(401).json({
                        success: false,
                        error: 'Authentication required'
                    });
                }
                const statistics = await forumService_1.forumService.getForumStatistics();
                res.json({
                    success: true,
                    data: statistics
                });
            }
            catch (error) {
                // Error log removed
                res.status(500).json({
                    success: false,
                    error: 'Failed to fetch forum statistics'
                });
            }
        };
        // Search endpoint
        this.searchPosts = async (req, res) => {
            var _a;
            try {
                const userRole = ((_a = req.user) === null || _a === void 0 ? void 0 : _a.role) || 'customer';
                const searchOptions = {
                    query: req.query.q,
                    categoryId: req.query.categoryId,
                    authorId: req.query.author_id,
                    tags: req.query.tags ? req.query.tags.split(',') : undefined,
                    type: req.query.type,
                    page: parseInt(req.query.page) || 1,
                    limit: parseInt(req.query.limit) || 20,
                    sortBy: req.query.sortBy || 'latest'
                };
                if (req.query.startDate || req.query.endDate) {
                    searchOptions.dateRange = {
                        start: req.query.startDate ? new Date(req.query.startDate) : undefined,
                        end: req.query.endDate ? new Date(req.query.endDate) : undefined
                    };
                }
                const result = await forumService_1.forumService.searchPosts(searchOptions, userRole);
                res.json({
                    success: true,
                    data: result
                });
            }
            catch (error) {
                // Error log removed
                res.status(500).json({
                    success: false,
                    error: 'Failed to search posts'
                });
            }
        };
        // Trending posts endpoint
        this.getTrendingPosts = async (req, res) => {
            var _a;
            try {
                const userRole = ((_a = req.user) === null || _a === void 0 ? void 0 : _a.role) || 'customer';
                const searchOptions = {
                    page: parseInt(req.query.page) || 1,
                    limit: parseInt(req.query.limit) || 10,
                    sortBy: 'trending',
                    dateRange: {
                        start: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) // 최근 1주일
                    }
                };
                const result = await forumService_1.forumService.searchPosts(searchOptions, userRole);
                res.json({
                    success: true,
                    data: result
                });
            }
            catch (error) {
                // Error log removed
                res.status(500).json({
                    success: false,
                    error: 'Failed to fetch trending posts'
                });
            }
        };
        // Popular posts endpoint
        this.getPopularPosts = async (req, res) => {
            var _a;
            try {
                const userRole = ((_a = req.user) === null || _a === void 0 ? void 0 : _a.role) || 'customer';
                const searchOptions = {
                    page: parseInt(req.query.page) || 1,
                    limit: parseInt(req.query.limit) || 10,
                    sortBy: 'popular'
                };
                const result = await forumService_1.forumService.searchPosts(searchOptions, userRole);
                res.json({
                    success: true,
                    data: result
                });
            }
            catch (error) {
                // Error log removed
                res.status(500).json({
                    success: false,
                    error: 'Failed to fetch popular posts'
                });
            }
        };
    }
}
exports.ForumController = ForumController;
//# sourceMappingURL=forumController.js.map
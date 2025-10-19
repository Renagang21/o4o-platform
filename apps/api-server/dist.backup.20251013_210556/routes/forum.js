"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_middleware_1 = require("../middleware/auth.middleware");
const auth_1 = require("../middleware/auth");
const forumController_1 = require("../controllers/forumController");
const router = (0, express_1.Router)();
const forumController = new forumController_1.ForumController();
// Category routes
router.get('/categories', forumController.getCategories);
router.get('/categories/:slug', forumController.getCategoryBySlug);
router.post('/categories', auth_middleware_1.authenticate, forumController.createCategory);
router.put('/categories/:categoryId', auth_middleware_1.authenticate, forumController.updateCategory);
// Post routes
router.get('/posts', auth_1.optionalAuth, forumController.getPosts);
router.get('/posts/trending', auth_1.optionalAuth, forumController.getTrendingPosts);
router.get('/posts/popular', auth_1.optionalAuth, forumController.getPopularPosts);
router.get('/posts/search', auth_1.optionalAuth, forumController.searchPosts);
router.get('/posts/:postId', auth_1.optionalAuth, forumController.getPostById);
router.get('/posts/slug/:slug', auth_1.optionalAuth, forumController.getPostBySlug);
router.post('/posts', auth_middleware_1.authenticate, forumController.createPost);
router.put('/posts/:postId', auth_middleware_1.authenticate, forumController.updatePost);
// Comment routes
router.get('/posts/:postId/comments', forumController.getComments);
router.post('/comments', auth_middleware_1.authenticate, forumController.createComment);
// Statistics routes
router.get('/statistics', auth_middleware_1.authenticate, forumController.getStatistics);
exports.default = router;
//# sourceMappingURL=forum.js.map
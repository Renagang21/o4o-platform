"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const ForumCPTController_1 = require("../../controllers/forum/ForumCPTController");
const auth_middleware_1 = require("../../middleware/auth.middleware");
const permission_middleware_1 = require("../../middleware/permission.middleware");
const User_1 = require("../../entities/User");
const router = (0, express_1.Router)();
const forumController = new ForumCPTController_1.ForumCPTController();
// All forum admin routes require authentication
router.use(auth_middleware_1.authenticate);
// System management routes (admin/moderator only)
router.get('/system-status', (0, permission_middleware_1.requireAnyRole)([User_1.UserRole.ADMIN, User_1.UserRole.SUPER_ADMIN, User_1.UserRole.MODERATOR]), forumController.getSystemStatus);
router.post('/initialize', permission_middleware_1.requireAdmin, forumController.initializeSystem);
router.post('/seed', permission_middleware_1.requireAdmin, forumController.createSampleData);
// Statistics (admin/moderator only)
router.get('/statistics', (0, permission_middleware_1.requireAnyRole)([User_1.UserRole.ADMIN, User_1.UserRole.SUPER_ADMIN, User_1.UserRole.MODERATOR]), forumController.getStatistics);
// Content management routes
router.get('/categories', (0, permission_middleware_1.requireAnyRole)([User_1.UserRole.ADMIN, User_1.UserRole.SUPER_ADMIN, User_1.UserRole.MODERATOR]), forumController.getCategories);
router.get('/categories/:id', (0, permission_middleware_1.requireAnyRole)([User_1.UserRole.ADMIN, User_1.UserRole.SUPER_ADMIN, User_1.UserRole.MODERATOR]), forumController.getCategory);
router.post('/categories', (0, permission_middleware_1.requireAnyRole)([User_1.UserRole.ADMIN, User_1.UserRole.SUPER_ADMIN, User_1.UserRole.MODERATOR]), forumController.createCategory);
router.put('/categories/:id', (0, permission_middleware_1.requireAnyRole)([User_1.UserRole.ADMIN, User_1.UserRole.SUPER_ADMIN, User_1.UserRole.MODERATOR]), forumController.updateCategory);
router.delete('/categories/:id', permission_middleware_1.requireAdmin, forumController.deleteCategory);
router.get('/posts', (0, permission_middleware_1.requireAnyRole)([User_1.UserRole.ADMIN, User_1.UserRole.SUPER_ADMIN, User_1.UserRole.MODERATOR]), forumController.getPosts);
router.get('/posts/:id', (0, permission_middleware_1.requireAnyRole)([User_1.UserRole.ADMIN, User_1.UserRole.SUPER_ADMIN, User_1.UserRole.MODERATOR]), forumController.getPost);
router.put('/posts/:id', (0, permission_middleware_1.requireAnyRole)([User_1.UserRole.ADMIN, User_1.UserRole.SUPER_ADMIN, User_1.UserRole.MODERATOR]), forumController.updatePost);
router.patch('/posts/:id/pin', (0, permission_middleware_1.requireAnyRole)([User_1.UserRole.ADMIN, User_1.UserRole.SUPER_ADMIN, User_1.UserRole.MODERATOR]), forumController.updatePostPin);
router.delete('/posts/:id', permission_middleware_1.requireAdmin, forumController.deletePost);
router.get('/posts/:postId/comments', (0, permission_middleware_1.requireAnyRole)([User_1.UserRole.ADMIN, User_1.UserRole.SUPER_ADMIN, User_1.UserRole.MODERATOR]), forumController.getComments);
// Content creation routes (all authenticated users)
router.post('/posts', forumController.createPost);
router.post('/comments', forumController.createComment);
exports.default = router;
//# sourceMappingURL=forum.routes.js.map
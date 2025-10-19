"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const post_creation_1 = require("../../controllers/post-creation");
const router = (0, express_1.Router)();
// 🆕 Post Creation (UAGBFormsBlock에서 호출)
router.post('/create', post_creation_1.createPost);
// 🆕 Archive Data (UAGBArchiveBlock에서 호출)  
router.post('/archive', post_creation_1.getArchiveData);
// 🆕 Post Type 관리
router.get('/post-types/:slug/schema', post_creation_1.getPostTypeSchema);
router.post('/post-types', post_creation_1.createPostType);
router.get('/post-types', post_creation_1.getUserAvailablePostTypes);
// 🆕 개별 Post 관리 (UAGBContentManagerBlock용)
router.get('/posts/:id', post_creation_1.getPostById);
router.put('/posts/:id', post_creation_1.updatePost);
router.delete('/posts/:id', post_creation_1.deletePost);
// 🆕 User 통계 (UAGBUserDashboardBlock용)
router.get('/user/:userId/stats', post_creation_1.getUserStats);
exports.default = router;
//# sourceMappingURL=index.js.map
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = require("../../middleware/auth");
const content_controller_1 = require("../../controllers/v1/content.controller");
const cache_1 = require("../../middleware/cache");
const router = (0, express_1.Router)();
const contentController = new content_controller_1.ContentController();
/**
 * @swagger
 * /v1/content/posts:
 *   get:
 *     summary: Get all posts
 *     tags: [Content]
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [draft, published, archived]
 *     responses:
 *       200:
 *         description: List of posts
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PaginatedResponse'
 *   post:
 *     summary: Create a new post
 *     tags: [Content]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Post'
 *     responses:
 *       201:
 *         description: Post created successfully
 *       401:
 *         description: Unauthorized
 */
/**
 * @swagger
 * /v1/content/posts/{id}:
 *   get:
 *     summary: Get a post by ID
 *     tags: [Content]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Post details
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Post'
 *       404:
 *         description: Post not found
 *   put:
 *     summary: Update a post
 *     tags: [Content]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Post'
 *     responses:
 *       200:
 *         description: Post updated successfully
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Post not found
 *   delete:
 *     summary: Delete a post
 *     tags: [Content]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       204:
 *         description: Post deleted successfully
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Post not found
 */
// Posts endpoints (with caching for public GET requests)
router.get('/posts', (0, cache_1.cache)({ ttl: 300 }), contentController.getPosts);
router.get('/posts/:id', (0, cache_1.cache)({ ttl: 600 }), contentController.getPost);
router.post('/posts', auth_1.authenticateToken, contentController.createPost);
router.put('/posts/:id', auth_1.authenticateToken, contentController.updatePost);
router.delete('/posts/:id', auth_1.authenticateToken, contentController.deletePost);
router.post('/posts/:id/clone', auth_1.authenticateToken, contentController.clonePost);
router.patch('/posts/bulk', auth_1.authenticateToken, contentController.bulkUpdatePosts);
router.delete('/posts/bulk', auth_1.authenticateToken, contentController.bulkDeletePosts);
// Categories endpoints (with longer cache for relatively static data)
router.get('/categories', (0, cache_1.cache)({ ttl: 1800 }), contentController.getCategories);
router.get('/categories/:id', (0, cache_1.cache)({ ttl: 1800 }), contentController.getCategory);
router.post('/categories', auth_1.authenticateToken, contentController.createCategory);
router.put('/categories/:id', auth_1.authenticateToken, contentController.updateCategory);
router.delete('/categories/:id', auth_1.authenticateToken, contentController.deleteCategory);
// Tags endpoints
router.get('/tags', contentController.getTags);
router.get('/tags/:id', contentController.getTag);
router.post('/tags', auth_1.authenticateToken, contentController.createTag);
router.put('/tags/:id', auth_1.authenticateToken, contentController.updateTag);
router.delete('/tags/:id', auth_1.authenticateToken, contentController.deleteTag);
// Pages endpoints
router.get('/pages', contentController.getPages);
router.get('/pages/:id', contentController.getPage);
router.post('/pages', auth_1.authenticateToken, contentController.createPage);
router.put('/pages/:id', auth_1.authenticateToken, contentController.updatePage);
router.delete('/pages/:id', auth_1.authenticateToken, contentController.deletePage);
// Media endpoints
router.get('/media', contentController.getMediaFiles);
router.get('/media/:id', contentController.getMediaFile);
router.post('/media/upload', auth_1.authenticateToken, contentController.uploadMedia);
router.put('/media/:id', auth_1.authenticateToken, contentController.updateMedia);
router.delete('/media/:id', auth_1.authenticateToken, contentController.deleteMedia);
// Authors endpoint
router.get('/authors', contentController.getAuthors);
exports.default = router;
//# sourceMappingURL=content.routes.js.map
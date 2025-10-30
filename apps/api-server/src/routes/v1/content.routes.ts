import { Router } from 'express';
import { authenticate } from '../../middleware/auth.middleware.js';
import { ContentController } from '../../controllers/v1/content.controller.js';
import { MediaController } from '../../controllers/content/MediaController.js';
import { cache } from '../../middleware/cache.js';
import { uploadMiddleware } from '../../middleware/upload.middleware.js';

const router: Router = Router();
const contentController = new ContentController();
const mediaController = new MediaController();

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
router.get('/posts', cache({ ttl: 300 }), contentController.getPosts);
router.get('/posts/:id', cache({ ttl: 600 }), contentController.getPost);
router.post('/posts', authenticate, contentController.createPost);
router.post('/posts/draft', authenticate, contentController.createDraft);
router.post('/posts/:id/publish', authenticate, contentController.publishPost);
router.put('/posts/:id', authenticate, contentController.updatePost);
router.delete('/posts/:id', authenticate, contentController.deletePost);
router.post('/posts/:id/clone', authenticate, contentController.clonePost);
router.patch('/posts/bulk', authenticate, contentController.bulkUpdatePosts);
router.delete('/posts/bulk', authenticate, contentController.bulkDeletePosts);

// Categories endpoints (with longer cache for relatively static data)
router.get('/categories', cache({ ttl: 1800 }), contentController.getCategories);
router.get('/categories/:id', cache({ ttl: 1800 }), contentController.getCategory);
router.post('/categories', authenticate, contentController.createCategory);
router.put('/categories/:id', authenticate, contentController.updateCategory);
router.delete('/categories/:id', authenticate, contentController.deleteCategory);

// Tags endpoints
router.get('/tags', contentController.getTags);
router.get('/tags/:id', contentController.getTag);
router.post('/tags', authenticate, contentController.createTag);
router.put('/tags/:id', authenticate, contentController.updateTag);
router.delete('/tags/:id', authenticate, contentController.deleteTag);

// Pages endpoints
router.get('/pages', contentController.getPages);
router.get('/pages/:id', contentController.getPage);
router.post('/pages', authenticate, contentController.createPage);
router.put('/pages/:id', authenticate, contentController.updatePage);
router.delete('/pages/:id', authenticate, contentController.deletePage);

// Media endpoints
router.get('/media', mediaController.getMedia);
router.get('/media/:id', mediaController.getMediaById);
// Temporarily allow upload without auth for admin dashboard
router.post('/media/upload', uploadMiddleware('file', 10), mediaController.uploadMedia);
router.put('/media/:id', authenticate, mediaController.updateMedia);
router.delete('/media/:id', authenticate, mediaController.deleteMedia);

// Authors endpoint
router.get('/authors', contentController.getAuthors);

export default router;
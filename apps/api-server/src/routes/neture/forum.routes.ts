import { Router } from 'express';
import { NetureForumController } from '../../controllers/neture/NetureForumController.js';
import { authenticate } from '../../middleware/auth.middleware.js';

const router: Router = Router();
const controller = new NetureForumController();

/**
 * Neture Forum Routes
 *
 * Routes for cosmetics forum with metadata filtering
 */

// List posts with filters (category, skinType, concerns, productId)
router.get('/posts', controller.listPosts.bind(controller));

// Get single post
router.get('/posts/:id', controller.getPost.bind(controller));

// Create new post (requires auth)
router.post('/posts', authenticate, controller.createPost.bind(controller));

// Update post (requires auth)
router.put('/posts/:id', authenticate, controller.updatePost.bind(controller));

// Delete post (requires auth)
router.delete('/posts/:id', authenticate, controller.deletePost.bind(controller));

// Get posts for a specific product
router.get('/products/:productId/posts', controller.listProductPosts.bind(controller));

// Get forum statistics
router.get('/stats', controller.getStats.bind(controller));

export default router;

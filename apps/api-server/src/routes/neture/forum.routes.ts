import { Router } from 'express';
import { NetureForumController } from '../../controllers/neture/NetureForumController.js';
import { authenticate } from '../../middleware/auth.middleware.js';

const router: Router = Router();
const controller = new NetureForumController();

/**
 * Neture Forum Routes
 *
 * Beauty-focused forum with skin type, concerns, and product integration
 */

// Health check (public)
router.get('/health', controller.health.bind(controller));

// List posts with Neture filtering (public)
router.get('/posts', controller.listPosts.bind(controller));

// Get post details (public)
router.get('/posts/:id', controller.getPost.bind(controller));

// Get posts by product (public)
router.get('/posts/product/:productId', controller.getProductPosts.bind(controller));

// Create new post (authenticated)
router.post('/posts', authenticate, controller.createPost.bind(controller));

export default router;

import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware.js';
import { optionalAuth } from '../middleware/auth.js';
import { ForumController } from '../controllers/forumController.js';

const router: Router = Router();
const forumController = new ForumController();

// Category routes
router.get('/categories', forumController.getCategories);
router.get('/categories/:slug', forumController.getCategoryBySlug);
router.post('/categories', authenticate, forumController.createCategory);
router.put('/categories/:categoryId', authenticate, forumController.updateCategory);

// Post routes
router.get('/posts', optionalAuth, forumController.getPosts);
router.get('/posts/trending', optionalAuth, forumController.getTrendingPosts);
router.get('/posts/popular', optionalAuth, forumController.getPopularPosts);
router.get('/posts/search', optionalAuth, forumController.searchPosts);
router.get('/posts/:postId', optionalAuth, forumController.getPostById);
router.get('/posts/slug/:slug', optionalAuth, forumController.getPostBySlug);
router.post('/posts', authenticate, forumController.createPost);
router.put('/posts/:postId', authenticate, forumController.updatePost);

// Comment routes
router.get('/posts/:postId/comments', forumController.getComments);
router.post('/comments', authenticate, forumController.createComment);

// Statistics routes
router.get('/statistics', authenticate, forumController.getStatistics);

export default router;
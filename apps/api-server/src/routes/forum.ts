import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware.js';
import { optionalAuth } from '../middleware/auth.js';
import { addDeprecationHeaders } from '../middleware/deprecation.middleware.js';
import { ForumController } from '../controllers/forumController.js';

const router: Router = Router();
const forumController = new ForumController();

// Deprecation middleware for legacy routes
const deprecatePosts = addDeprecationHeaders({
  successorRoute: '/api/v1/posts',
  message: 'Use /api/v1/posts instead',
});

// Category routes
router.get('/categories', forumController.getCategories);
router.get('/categories/:slug', forumController.getCategoryBySlug);
router.post('/categories', authenticate, forumController.createCategory);
router.put('/categories/:categoryId', authenticate, forumController.updateCategory);

// Post routes (with deprecation warnings)
router.get('/posts', deprecatePosts, optionalAuth, forumController.getPosts);
router.get('/posts/trending', deprecatePosts, optionalAuth, forumController.getTrendingPosts);
router.get('/posts/popular', deprecatePosts, optionalAuth, forumController.getPopularPosts);
router.get('/posts/search', deprecatePosts, optionalAuth, forumController.searchPosts);
router.get('/posts/:postId', deprecatePosts, optionalAuth, forumController.getPostById);
router.get('/posts/slug/:slug', deprecatePosts, optionalAuth, forumController.getPostBySlug);
router.post('/posts', deprecatePosts, authenticate, forumController.createPost);
router.put('/posts/:postId', deprecatePosts, authenticate, forumController.updatePost);

// Comment routes
router.get('/posts/:postId/comments', forumController.getComments);
router.post('/comments', authenticate, forumController.createComment);

// Statistics routes
router.get('/statistics', authenticate, forumController.getStatistics);

export default router;
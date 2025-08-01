import { Router } from 'express';
import { authenticateToken, optionalAuth } from '../middleware/auth';
import { ForumController } from '../controllers/forumController';

const router: Router = Router();
const forumController = new ForumController();

// Category routes
router.get('/categories', forumController.getCategories);
router.get('/categories/:slug', forumController.getCategoryBySlug);
router.post('/categories', authenticateToken, forumController.createCategory);
router.put('/categories/:categoryId', authenticateToken, forumController.updateCategory);

// Post routes
router.get('/posts', optionalAuth, forumController.getPosts);
router.get('/posts/trending', optionalAuth, forumController.getTrendingPosts);
router.get('/posts/popular', optionalAuth, forumController.getPopularPosts);
router.get('/posts/search', optionalAuth, forumController.searchPosts);
router.get('/posts/:postId', optionalAuth, forumController.getPostById);
router.get('/posts/slug/:slug', optionalAuth, forumController.getPostBySlug);
router.post('/posts', authenticateToken, forumController.createPost);
router.put('/posts/:postId', authenticateToken, forumController.updatePost);

// Comment routes
router.get('/posts/:postId/comments', forumController.getComments);
router.post('/comments', authenticateToken, forumController.createComment);

// Statistics routes
router.get('/statistics', authenticateToken, forumController.getStatistics);

export default router;
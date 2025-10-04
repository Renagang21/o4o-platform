import { Router } from 'express';
import { ForumCPTController } from '../../controllers/forum/ForumCPTController';
import { authenticateToken } from '../../middleware/auth';
import { validateRole } from '../../middleware/roleValidation';

const router: Router = Router();
const forumController = new ForumCPTController();

// All forum admin routes require authentication
router.use(authenticateToken);

// System management routes (admin/moderator only)
router.get('/system-status', validateRole(['admin', 'super_admin', 'moderator']), forumController.getSystemStatus);
router.post('/initialize', validateRole(['admin', 'super_admin']), forumController.initializeSystem);
router.post('/seed', validateRole(['admin', 'super_admin']), forumController.createSampleData);

// Statistics (admin/moderator only)
router.get('/statistics', validateRole(['admin', 'super_admin', 'moderator']), forumController.getStatistics);

// Content management routes
router.get('/categories', validateRole(['admin', 'super_admin', 'moderator']), forumController.getCategories);
router.get('/posts', validateRole(['admin', 'super_admin', 'moderator']), forumController.getPosts);
router.get('/posts/:postId/comments', validateRole(['admin', 'super_admin', 'moderator']), forumController.getComments);

// Content creation routes (all authenticated users)
router.post('/posts', forumController.createPost);
router.post('/comments', forumController.createComment);

export default router;
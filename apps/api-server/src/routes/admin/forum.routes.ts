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
router.get('/categories/:id', validateRole(['admin', 'super_admin', 'moderator']), forumController.getCategory);
router.post('/categories', validateRole(['admin', 'super_admin', 'moderator']), forumController.createCategory);
router.put('/categories/:id', validateRole(['admin', 'super_admin', 'moderator']), forumController.updateCategory);
router.delete('/categories/:id', validateRole(['admin', 'super_admin']), forumController.deleteCategory);

router.get('/posts', validateRole(['admin', 'super_admin', 'moderator']), forumController.getPosts);
router.get('/posts/:id', validateRole(['admin', 'super_admin', 'moderator']), forumController.getPost);
router.put('/posts/:id', validateRole(['admin', 'super_admin', 'moderator']), forumController.updatePost);
router.patch('/posts/:id/pin', validateRole(['admin', 'super_admin', 'moderator']), forumController.updatePostPin);
router.delete('/posts/:id', validateRole(['admin', 'super_admin']), forumController.deletePost);

router.get('/posts/:postId/comments', validateRole(['admin', 'super_admin', 'moderator']), forumController.getComments);

// Content creation routes (all authenticated users)
router.post('/posts', forumController.createPost);
router.post('/comments', forumController.createComment);

export default router;
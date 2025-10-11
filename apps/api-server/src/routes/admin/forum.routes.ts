import { Router } from 'express';
import { ForumCPTController } from '../../controllers/forum/ForumCPTController';
import { authenticateToken } from '../../middleware/auth';
import { requireAnyRole, requireAdmin } from '../../middleware/permission.middleware';
import { UserRole } from '../../entities/User';

const router: Router = Router();
const forumController = new ForumCPTController();

// All forum admin routes require authentication
router.use(authenticateToken);

// System management routes (admin/moderator only)
router.get('/system-status', requireAnyRole([UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.MODERATOR]), forumController.getSystemStatus);
router.post('/initialize', requireAdmin, forumController.initializeSystem);
router.post('/seed', requireAdmin, forumController.createSampleData);

// Statistics (admin/moderator only)
router.get('/statistics', requireAnyRole([UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.MODERATOR]), forumController.getStatistics);

// Content management routes
router.get('/categories', requireAnyRole([UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.MODERATOR]), forumController.getCategories);
router.get('/categories/:id', requireAnyRole([UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.MODERATOR]), forumController.getCategory);
router.post('/categories', requireAnyRole([UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.MODERATOR]), forumController.createCategory);
router.put('/categories/:id', requireAnyRole([UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.MODERATOR]), forumController.updateCategory);
router.delete('/categories/:id', requireAdmin, forumController.deleteCategory);

router.get('/posts', requireAnyRole([UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.MODERATOR]), forumController.getPosts);
router.get('/posts/:id', requireAnyRole([UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.MODERATOR]), forumController.getPost);
router.put('/posts/:id', requireAnyRole([UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.MODERATOR]), forumController.updatePost);
router.patch('/posts/:id/pin', requireAnyRole([UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.MODERATOR]), forumController.updatePostPin);
router.delete('/posts/:id', requireAdmin, forumController.deletePost);

router.get('/posts/:postId/comments', requireAnyRole([UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.MODERATOR]), forumController.getComments);

// Content creation routes (all authenticated users)
router.post('/posts', forumController.createPost);
router.post('/comments', forumController.createComment);

export default router;
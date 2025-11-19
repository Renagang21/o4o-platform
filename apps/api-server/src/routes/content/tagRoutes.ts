import { Router } from 'express';
import { TagController } from '../../controllers/content/TagController.js';
import { authenticate as authMiddleware, requireRole } from '../../middleware/auth.middleware.js';

const router: Router = Router();
const tagController = new TagController();

// Public routes - no authentication required for reading
router.get('/tags', tagController.getTags.bind(tagController));
router.get('/tags/popular', tagController.getPopularTags.bind(tagController));
router.get('/tags/:id', tagController.getTag.bind(tagController));
router.get('/tags/:id/stats', tagController.getTagStats.bind(tagController));

// Admin only routes - require authentication and admin role
router.post('/tags',
  authMiddleware,
  requireRole(['admin', 'super_admin', 'editor']),
  tagController.createTag.bind(tagController)
);

router.put('/tags/:id',
  authMiddleware,
  requireRole(['admin', 'super_admin', 'editor']),
  tagController.updateTag.bind(tagController)
);

router.delete('/tags/:id',
  authMiddleware,
  requireRole(['admin', 'super_admin']),
  tagController.deleteTag.bind(tagController)
);

router.post('/tags/:fromId/merge/:toId',
  authMiddleware,
  requireRole(['admin', 'super_admin']),
  tagController.mergeTags.bind(tagController)
);

export default router;
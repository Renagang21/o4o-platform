import { Router } from 'express';
import { TagController } from '../../controllers/content/TagController';
import { authenticate as authMiddleware } from '../../middleware/auth.middleware';
import { checkRole } from '../../middleware/checkRole';

const router: Router = Router();
const tagController = new TagController();

// Public routes - no authentication required for reading
router.get('/tags', tagController.getTags.bind(tagController));
router.get('/tags/popular', tagController.getPopularTags.bind(tagController));
router.get('/tags/:id', tagController.getTag.bind(tagController));
router.get('/tags/:id/stats', tagController.getTagStats.bind(tagController));

// Protected routes - require authentication
router.use(authMiddleware);

// Admin only routes - require admin role
router.post('/tags', 
  checkRole(['admin', 'super_admin', 'editor']), 
  tagController.createTag.bind(tagController)
);

router.put('/tags/:id', 
  checkRole(['admin', 'super_admin', 'editor']), 
  tagController.updateTag.bind(tagController)
);

router.delete('/tags/:id', 
  checkRole(['admin', 'super_admin']), 
  tagController.deleteTag.bind(tagController)
);

router.post('/tags/:fromId/merge/:toId', 
  checkRole(['admin', 'super_admin']), 
  tagController.mergeTags.bind(tagController)
);

export default router;
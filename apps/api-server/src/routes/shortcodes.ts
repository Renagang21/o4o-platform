import { Router } from 'express';
import { ShortcodeController } from '../controllers/shortcodeController';
import { authenticateToken, requireAdmin } from '../middleware/auth';

const router: Router = Router();

// Public routes
router.get('/', ShortcodeController.getShortcodes);
router.get('/categories', ShortcodeController.getCategories);
router.get('/:id', ShortcodeController.getShortcode);
router.post('/render', ShortcodeController.renderShortcode);

// Admin routes
router.post('/', authenticateToken, requireAdmin, ShortcodeController.createShortcode);
router.put('/:id', authenticateToken, requireAdmin, ShortcodeController.updateShortcode);
router.delete('/:id', authenticateToken, requireAdmin, ShortcodeController.deleteShortcode);

// Initialize default shortcodes
router.post('/init-defaults', authenticateToken, requireAdmin, ShortcodeController.createDefaultShortcodes);

export default router;
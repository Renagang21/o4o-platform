import { Router } from 'express';
import { ShortcodeController } from '../controllers/shortcode/ShortcodeController';
import { authenticateToken } from '../middleware/auth';
import { checkRole } from '../middleware/checkRole';

const router: Router = Router();
const shortcodeController = new ShortcodeController();

// Public routes - available to everyone
router.get('/', shortcodeController.getShortcodes);
router.get('/statistics', shortcodeController.getStatistics);
router.get('/export', shortcodeController.exportShortcodes);
router.get('/logs', shortcodeController.getExecutionLogs); // Move before :name to avoid conflict
router.get('/:name', shortcodeController.getShortcode);

// Parse and preview routes (require authentication for security)
router.post('/parse', authenticateToken, shortcodeController.parseContent);
router.post('/preview', authenticateToken, shortcodeController.previewShortcode);

// Protected routes - require authentication
router.use(authenticateToken);

// Editor routes - for content creators
router.post('/', checkRole(['admin', 'editor']), shortcodeController.createShortcode);
router.put('/:name', checkRole(['admin', 'editor']), shortcodeController.updateShortcode);

// Admin only routes - for system management
router.delete('/:name', checkRole(['admin']), shortcodeController.deleteShortcode);
router.post('/cache/clear', checkRole(['admin']), shortcodeController.clearCache);
router.put('/bulk/status', checkRole(['admin']), shortcodeController.bulkUpdateStatus);
router.post('/import', checkRole(['admin']), shortcodeController.importShortcodes);

export default router;
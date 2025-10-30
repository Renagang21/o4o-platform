import { Router } from 'express';
import { MenuController } from '../controllers/menu/MenuController.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { checkRole } from '../middleware/checkRole.js';

const router: Router = Router();
const menuController = new MenuController();

// Public routes
router.get('/', menuController.getMenus);
router.get('/locations', menuController.getMenuLocations);
router.get('/location/:key', menuController.getMenuByLocation);
router.get('/:id', menuController.getMenu);
router.get('/:id/filtered', menuController.getFilteredMenu); // Role-based filtered menu

// Protected routes (require authentication)
router.use(authenticate);

// Admin and Editor routes
router.post('/', checkRole(['admin', 'editor']), menuController.createMenu);
router.put('/:id', checkRole(['admin', 'editor']), menuController.updateMenu);
router.put('/:id/reorder', checkRole(['admin', 'editor']), menuController.reorderMenuItems);
router.post('/:id/duplicate', checkRole(['admin', 'editor']), menuController.duplicateMenu);

// Admin only routes
router.delete('/:id', checkRole(['admin']), menuController.deleteMenu);

export default router;
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

// ============================================================================
// ADVANCED FEATURES - Conditions, Styles, Mega Menu
// ============================================================================

// Menu item conditions - Admin only
router.post('/:id/conditions', checkRole(['admin', 'super_admin']), menuController.createMenuItemConditions);
router.get('/:id/conditions', checkRole(['admin', 'super_admin', 'editor']), menuController.getMenuItemConditions);
router.delete('/:id/conditions', checkRole(['admin', 'super_admin']), menuController.deleteMenuItemConditions);

// Menu styles - Admin and Editor
router.post('/:id/styles', checkRole(['admin', 'super_admin', 'editor']), menuController.createMenuStyles);
router.get('/:id/styles', menuController.getMenuStyles);
router.put('/:id/styles', checkRole(['admin', 'super_admin', 'editor']), menuController.updateMenuStyles);

// Mega menu configuration - Admin only
router.post('/:id/mega-menu', checkRole(['admin', 'super_admin']), menuController.createMegaMenu);
router.get('/:id/mega-menu', menuController.getMegaMenu);
router.put('/:id/mega-menu', checkRole(['admin', 'super_admin']), menuController.updateMegaMenu);

// ============================================================================
// MENU ITEMS CRUD (merged from menu-items.ts)
// ============================================================================

// Menu item operations - Admin and Editor
router.post('/items', checkRole(['admin', 'editor']), menuController.addMenuItem);
router.put('/items/:id', checkRole(['admin', 'editor']), menuController.updateMenuItem);
router.delete('/items/:id', checkRole(['admin', 'editor']), menuController.deleteMenuItem);

export default router;
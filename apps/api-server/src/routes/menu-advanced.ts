import { Router } from 'express';
import { MenuAdvancedController } from '../controllers/menu/MenuAdvancedController';
import { authenticateToken } from '../middleware/auth';
import { checkRole } from '../middleware/checkRole';

const router: Router = Router();
const menuAdvancedController = new MenuAdvancedController();

// All advanced menu routes require authentication
router.use(authenticateToken);

// ============================================================================
// CONDITIONAL DISPLAY APIs
// ============================================================================

// Menu item conditions - Admin only
router.post(
  '/menu-items/:id/conditions',
  checkRole(['admin', 'super_admin']),
  menuAdvancedController.createMenuItemConditions.bind(menuAdvancedController)
);

router.get(
  '/menu-items/:id/conditions',
  checkRole(['admin', 'super_admin', 'editor']),
  menuAdvancedController.getMenuItemConditions.bind(menuAdvancedController)
);

router.delete(
  '/menu-items/:id/conditions',
  checkRole(['admin', 'super_admin']),
  menuAdvancedController.deleteMenuItemConditions.bind(menuAdvancedController)
);

// ============================================================================
// MENU STYLES APIs
// ============================================================================

// Menu styles - Admin and Editor
router.post(
  '/menus/:id/styles',
  checkRole(['admin', 'super_admin', 'editor']),
  menuAdvancedController.createMenuStyles.bind(menuAdvancedController)
);

router.get(
  '/menus/:id/styles',
  menuAdvancedController.getMenuStyles.bind(menuAdvancedController)
);

router.put(
  '/menus/:id/styles',
  checkRole(['admin', 'super_admin', 'editor']),
  menuAdvancedController.updateMenuStyles.bind(menuAdvancedController)
);

// ============================================================================
// MEGA MENU APIs
// ============================================================================

// Mega menu configuration - Admin only
router.post(
  '/menus/:id/mega-menu',
  checkRole(['admin', 'super_admin']),
  menuAdvancedController.createMegaMenu.bind(menuAdvancedController)
);

router.get(
  '/menus/:id/mega-menu',
  menuAdvancedController.getMegaMenu.bind(menuAdvancedController)
);

router.put(
  '/menus/:id/mega-menu',
  checkRole(['admin', 'super_admin']),
  menuAdvancedController.updateMegaMenu.bind(menuAdvancedController)
);

export default router;
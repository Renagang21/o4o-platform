import { Router } from 'express';
import { MenuCacheController } from '../controllers/menu/MenuCacheController';
import { MenuAnalyticsController } from '../controllers/menu/MenuAnalyticsController';
import { MenuWidgetController } from '../controllers/menu/MenuWidgetController';
import { authenticateToken } from '../middleware/auth';
import { checkRole } from '../middleware/checkRole';

const router = Router();
const menuCacheController = new MenuCacheController();
const menuAnalyticsController = new MenuAnalyticsController();
const menuWidgetController = new MenuWidgetController();

// ============================================================================
// MENU CACHING APIs
// ============================================================================

// Cache management - Admin only
router.post(
  '/menus/:id/cache',
  authenticateToken,
  checkRole(['admin', 'super_admin']),
  menuCacheController.createMenuCache.bind(menuCacheController)
);

router.delete(
  '/menus/:id/cache',
  authenticateToken,
  checkRole(['admin', 'super_admin']),
  menuCacheController.deleteMenuCache.bind(menuCacheController)
);

router.get(
  '/menus/cache-status',
  authenticateToken,
  checkRole(['admin', 'super_admin']),
  menuCacheController.getCacheStatus.bind(menuCacheController)
);

// ============================================================================
// MENU ANALYTICS APIs
// ============================================================================

// Analytics - Admin and Editor can view
router.get(
  '/menus/:id/analytics',
  authenticateToken,
  checkRole(['admin', 'super_admin', 'editor']),
  menuAnalyticsController.getMenuAnalytics.bind(menuAnalyticsController)
);

router.get(
  '/menus/:id/performance',
  authenticateToken,
  checkRole(['admin', 'super_admin', 'editor']),
  menuAnalyticsController.getMenuPerformance.bind(menuAnalyticsController)
);

// Public endpoint for tracking clicks
router.post(
  '/menus/:id/track-click',
  menuAnalyticsController.trackMenuClick.bind(menuAnalyticsController)
);

// ============================================================================
// MENU WIDGET APIs
// ============================================================================

// Widget management
router.get(
  '/menu-widgets',
  authenticateToken,
  menuWidgetController.getMenuWidgets.bind(menuWidgetController)
);

router.post(
  '/menu-widgets',
  authenticateToken,
  checkRole(['admin', 'super_admin', 'editor']),
  menuWidgetController.createMenuWidget.bind(menuWidgetController)
);

router.get(
  '/menu-widgets/:id',
  authenticateToken,
  menuWidgetController.getMenuWidget.bind(menuWidgetController)
);

router.put(
  '/menu-widgets/:id',
  authenticateToken,
  checkRole(['admin', 'super_admin', 'editor']),
  menuWidgetController.updateMenuWidget.bind(menuWidgetController)
);

router.delete(
  '/menu-widgets/:id',
  authenticateToken,
  checkRole(['admin', 'super_admin']),
  menuWidgetController.deleteMenuWidget.bind(menuWidgetController)
);

// Widget rendering - can be public or authenticated based on requirements
router.post(
  '/menu-widgets/:id/render',
  menuWidgetController.renderMenuWidget.bind(menuWidgetController)
);

export default router;
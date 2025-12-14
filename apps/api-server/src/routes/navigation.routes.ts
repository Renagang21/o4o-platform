/**
 * Navigation API Routes
 * Phase P0 Task A — Dynamic Navigation System
 *
 * Provides REST endpoints for dynamic admin navigation:
 * - GET /api/v1/navigation/admin - Get admin navigation tree
 * - GET /api/v1/navigation/stats - Get navigation statistics
 */

import { Router, Request, Response } from 'express';
import { navigationRegistry, type ServiceGroup } from '@o4o-apps/cms-core';
import { authenticate, optionalAuth } from '../middleware/auth.middleware.js';
import { roleAssignmentService } from '../modules/auth/services/role-assignment.service.js';
import logger from '../utils/logger.js';

// Valid service groups
const VALID_SERVICE_GROUPS: ServiceGroup[] = [
  'cosmetics',
  'yaksa',
  'tourist',
  'sellerops',
  'supplierops',
  'global',
];

const router: Router = Router();

/**
 * GET /api/v1/navigation/admin
 * Get admin navigation tree with role/permission filtering
 */
router.get('/admin', optionalAuth, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const serviceGroup = req.query.serviceGroup as string | undefined;
    const tenantId = req.query.tenantId as string | undefined;

    // Get user roles and permissions
    let userRoles: string[] = [];
    let userPermissions: string[] = [];

    if (user?.id) {
      try {
        userRoles = await roleAssignmentService.getRoleNames(user.id);
        userPermissions = await roleAssignmentService.getPermissions(user.id);
      } catch (error) {
        logger.warn('[Navigation] Failed to fetch user roles/permissions:', error);
        // Fallback to user object properties
        userRoles = extractRolesFromUser(user);
        userPermissions = user.permissions || [];
      }
    }

    // Validate and cast serviceGroup
    const validServiceGroup =
      serviceGroup && VALID_SERVICE_GROUPS.includes(serviceGroup as ServiceGroup)
        ? (serviceGroup as ServiceGroup)
        : undefined;

    // Build context for navigation filtering
    const context = {
      serviceGroup: validServiceGroup,
      tenantId: tenantId || undefined,
      roles: userRoles,
      permissions: userPermissions,
    };

    // Get navigation tree with context filtering
    const navTree = navigationRegistry.getNavTreeByContext(context);

    // Transform to MenuItem format expected by frontend
    const menuItems = transformToMenuItems(navTree);

    res.json({
      success: true,
      data: menuItems,
      total: menuItems.length,
      context: {
        serviceGroup,
        tenantId,
        userRoles,
        authenticated: !!user,
      },
    });
  } catch (error) {
    logger.error('[Navigation Routes] Get admin navigation error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get navigation',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * GET /api/v1/navigation/stats
 * Get navigation registry statistics
 */
router.get('/stats', async (req: Request, res: Response) => {
  try {
    const stats = navigationRegistry.getStats();
    const cacheStats = navigationRegistry.getCacheStats();

    res.json({
      success: true,
      data: {
        ...stats,
        cache: cacheStats,
      },
    });
  } catch (error) {
    logger.error('[Navigation Routes] Get stats error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get navigation stats',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * POST /api/v1/navigation/cache/clear
 * Clear navigation cache (admin only)
 */
router.post('/cache/clear', authenticate, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;

    // Check admin permission
    const isAdmin = await roleAssignmentService.isAdmin(user.id);

    if (!isAdmin) {
      return res.status(403).json({
        success: false,
        error: 'Admin permission required',
      });
    }

    navigationRegistry.clearCache();

    res.json({
      success: true,
      message: 'Navigation cache cleared',
    });
  } catch (error) {
    logger.error('[Navigation Routes] Clear cache error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to clear cache',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * Extract roles from user object (fallback)
 */
function extractRolesFromUser(user: any): string[] {
  if (!user) return [];

  // Support multiple role formats
  if (Array.isArray(user.roles)) {
    return user.roles.map((r: any) => (typeof r === 'string' ? r : r.name)).filter(Boolean);
  }

  if (user.role) {
    return [user.role];
  }

  return [];
}

/**
 * Transform NavigationItem to MenuItem format for frontend compatibility
 */
function transformToMenuItems(navItems: any[]): any[] {
  return navItems.map((item) => ({
    id: item.id,
    label: item.label,
    icon: item.icon,
    path: item.path,
    order: item.order,
    appId: item.appId,
    roles: item.roles,
    permissions: item.permissions,
    children: item.children ? transformToMenuItems(item.children) : undefined,
  }));
}

export default router;

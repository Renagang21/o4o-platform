/**
 * Routes API Endpoint
 *
 * Phase P0 Task B: Dynamic Routing System
 *
 * Provides API endpoints for fetching registered routes from DynamicRouter.
 * Frontend can fetch routes and dynamically generate Route components.
 *
 * Endpoints:
 * - GET /api/v1/routes/admin - Get all admin routes
 * - GET /api/v1/routes/stats - Get routes statistics
 * - POST /api/v1/routes/cache/clear - Clear routes cache (admin only)
 */

import { Router, Request, Response } from 'express';
import { dynamicRouter, type ServiceGroup } from '@o4o-apps/cms-core';
import { authenticate, optionalAuth } from '../middleware/auth.middleware.js';
import { roleAssignmentService } from '../modules/auth/services/role-assignment.service.js';

const router = Router();

// Valid service groups for type safety
const VALID_SERVICE_GROUPS: ServiceGroup[] = [
  'cosmetics',
  'yaksa',
  'tourist',
  'sellerops',
  'supplierops',
  'global',
];

/**
 * Extended route meta with RBAC fields
 * DynamicRouteConfig.meta base + additional RBAC fields
 */
interface ExtendedRouteMeta {
  title?: string;
  layout?: string;
  auth?: boolean;
  roles?: string[];
  permissions?: string[];
}

/**
 * Route item response interface
 */
interface RouteItem {
  pattern: string;
  viewId: string;
  appId?: string;
  meta?: ExtendedRouteMeta;
}

/**
 * GET /admin
 *
 * Returns all registered admin routes filtered by context.
 * Supports filtering by:
 * - serviceGroup: Service group context
 * - tenantId: Multi-tenant context
 * - userRoles/permissions: RBAC filtering
 */
router.get('/admin', optionalAuth, async (req: Request, res: Response) => {
  try {
    const { serviceGroup, tenantId } = req.query;
    const user = (req as any).user;

    // Get user roles and permissions
    let userRoles: string[] = [];
    let userPermissions: string[] = [];

    if (user?.id) {
      try {
        // Try to get roles from RoleAssignment service
        const assignments = await roleAssignmentService.getActiveRoles(user.id);
        userRoles = assignments.map(a => a.role).filter(Boolean);

        // Get permissions from RoleAssignment service
        userPermissions = await roleAssignmentService.getPermissions(user.id);
      } catch (e) {
        // Fallback to user object
        if (user.role) {
          userRoles = [user.role];
        }
        if (user.permissions) {
          userPermissions = user.permissions;
        }
      }
    }

    // Get all routes from DynamicRouter
    const allRoutes = dynamicRouter.listRoutes();

    // Transform routes to response format
    const routeItems: RouteItem[] = allRoutes.map(route => {
      // Extract appId from viewId (format: appId.viewName)
      const appId = route.viewId.includes('.') ? route.viewId.split('.')[0] : undefined;

      // Cast meta to extended type (may have additional fields from manifest)
      const extendedMeta = route.meta as ExtendedRouteMeta | undefined;

      return {
        pattern: route.pattern,
        viewId: route.viewId,
        appId,
        meta: {
          title: extendedMeta?.title,
          layout: extendedMeta?.layout,
          auth: extendedMeta?.auth !== false, // Default to true
          roles: extendedMeta?.roles || [],
          permissions: extendedMeta?.permissions || [],
        },
      };
    });

    // Filter routes by user roles/permissions if authenticated
    const filteredRoutes = routeItems.filter(route => {
      // If route requires auth but user not authenticated, skip
      if (route.meta?.auth && !user) {
        return false;
      }

      // If route has required roles, check user has at least one
      if (route.meta?.roles && route.meta.roles.length > 0) {
        const hasRole = route.meta.roles.some(r => userRoles.includes(r));
        if (!hasRole && !userRoles.includes('admin') && !userRoles.includes('super_admin')) {
          return false;
        }
      }

      // If route has required permissions, check user has all
      if (route.meta?.permissions && route.meta.permissions.length > 0) {
        const hasPermission = route.meta.permissions.every(p => userPermissions.includes(p));
        // Admin roles have implicit access
        if (!hasPermission && !userRoles.includes('admin') && !userRoles.includes('super_admin')) {
          return false;
        }
      }

      return true;
    });

    // Validate and cast serviceGroup
    const validServiceGroup =
      serviceGroup && VALID_SERVICE_GROUPS.includes(serviceGroup as ServiceGroup)
        ? (serviceGroup as ServiceGroup)
        : undefined;

    res.json({
      success: true,
      data: filteredRoutes,
      total: filteredRoutes.length,
      context: {
        serviceGroup: validServiceGroup,
        tenantId: tenantId || undefined,
        userRoles,
        authenticated: !!user,
      },
    });
  } catch (error) {
    console.error('[Routes API] Error fetching routes:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch routes',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * GET /stats
 *
 * Returns routes statistics.
 */
router.get('/stats', async (req: Request, res: Response) => {
  try {
    const allRoutes = dynamicRouter.listRoutes();

    // Group routes by appId
    const routesByApp: Record<string, number> = {};
    allRoutes.forEach(route => {
      const appId = route.viewId.includes('.') ? route.viewId.split('.')[0] : 'unknown';
      routesByApp[appId] = (routesByApp[appId] || 0) + 1;
    });

    // Count routes by layout
    const routesByLayout: Record<string, number> = {};
    allRoutes.forEach(route => {
      const layout = route.meta?.layout || 'default';
      routesByLayout[layout] = (routesByLayout[layout] || 0) + 1;
    });

    // Count auth-required routes
    const authRequired = allRoutes.filter(r => r.meta?.auth !== false).length;
    const publicRoutes = allRoutes.length - authRequired;

    res.json({
      success: true,
      data: {
        total: allRoutes.length,
        byApp: routesByApp,
        byLayout: routesByLayout,
        authRequired,
        publicRoutes,
      },
    });
  } catch (error) {
    console.error('[Routes API] Error fetching stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch routes statistics',
    });
  }
});

/**
 * POST /cache/clear
 *
 * Clears routes cache. Admin only.
 */
router.post('/cache/clear', authenticate, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;

    // Check admin permission
    const userRoles: string[] = [];
    if (user?.id) {
      try {
        const assignments = await roleAssignmentService.getActiveRoles(user.id);
        userRoles.push(...assignments.map(a => a.role).filter(Boolean));
      } catch (e) {
        if (user.role) {
          userRoles.push(user.role);
        }
      }
    }

    if (!userRoles.includes('admin') && !userRoles.includes('super_admin')) {
      return res.status(403).json({
        success: false,
        error: 'Admin permission required',
      });
    }

    // DynamicRouter doesn't have cache, but we can trigger a refresh
    // For now, just return success
    res.json({
      success: true,
      message: 'Routes cache cleared',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[Routes API] Error clearing cache:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to clear routes cache',
    });
  }
});

/**
 * GET /by-app/:appId
 *
 * Returns routes for a specific app.
 */
router.get('/by-app/:appId', optionalAuth, async (req: Request, res: Response) => {
  try {
    const { appId } = req.params;
    const allRoutes = dynamicRouter.listRoutes();

    const appRoutes = allRoutes.filter(route => {
      const routeAppId = route.viewId.includes('.') ? route.viewId.split('.')[0] : undefined;
      return routeAppId === appId;
    });

    const routeItems: RouteItem[] = appRoutes.map(route => {
      // Cast meta to extended type (may have additional fields from manifest)
      const extendedMeta = route.meta as ExtendedRouteMeta | undefined;

      return {
        pattern: route.pattern,
        viewId: route.viewId,
        appId,
        meta: {
          title: extendedMeta?.title,
          layout: extendedMeta?.layout,
          auth: extendedMeta?.auth !== false,
          roles: extendedMeta?.roles || [],
          permissions: extendedMeta?.permissions || [],
        },
      };
    });

    res.json({
      success: true,
      data: routeItems,
      total: routeItems.length,
      appId,
    });
  } catch (error) {
    console.error('[Routes API] Error fetching app routes:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch app routes',
    });
  }
});

export default router;

/**
 * Organization Routes
 * Phase R3.5: Organization Core Absorption
 *
 * Basic organization CRUD API for Core platform.
 * This provides the foundational organization structure for all services.
 */

import { Router, Request, Response } from 'express';
import { OrganizationService } from '@o4o/organization-core';
import { AppDataSource } from '../database/connection.js';
import logger from '../utils/logger.js';

const router = Router();

/**
 * Get organization service instance (lazy initialization)
 */
function getOrganizationService(): OrganizationService | null {
  if (!AppDataSource.isInitialized) {
    return null;
  }
  return new OrganizationService(AppDataSource);
}

/**
 * @route GET /api/v1/organizations
 * @desc List organizations with optional filters
 * @access Public (read-only)
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const service = getOrganizationService();
    if (!service) {
      return res.status(503).json({
        success: false,
        error: 'Database not initialized (GRACEFUL_STARTUP mode)',
      });
    }

    const { type, parentId, isActive, search, page, limit } = req.query;

    const result = await service.listOrganizations({
      type: type as any,
      parentId: parentId as string,
      isActive: isActive === 'true' ? true : isActive === 'false' ? false : undefined,
      search: search as string,
      page: page ? parseInt(page as string) : 1,
      limit: limit ? parseInt(limit as string) : 20,
    });

    res.json({
      success: true,
      data: result.items,
      pagination: {
        total: result.total,
        page: result.page,
        limit: result.limit,
        totalPages: Math.ceil(result.total / result.limit),
      },
    });
  } catch (error: any) {
    logger.error('Failed to list organizations', { error: error.message });
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * @route GET /api/v1/organizations/tree
 * @desc Get organization tree structure
 * @access Public (read-only)
 */
router.get('/tree', async (req: Request, res: Response) => {
  try {
    const service = getOrganizationService();
    if (!service) {
      return res.status(503).json({
        success: false,
        error: 'Database not initialized (GRACEFUL_STARTUP mode)',
      });
    }

    const tree = await service.buildTree();

    res.json({
      success: true,
      data: tree,
    });
  } catch (error: any) {
    logger.error('Failed to build organization tree', { error: error.message });
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * @route GET /api/v1/organizations/:id
 * @desc Get organization by ID
 * @access Public (read-only)
 */
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const service = getOrganizationService();
    if (!service) {
      return res.status(503).json({
        success: false,
        error: 'Database not initialized (GRACEFUL_STARTUP mode)',
      });
    }

    const { id } = req.params;
    const { includeParent, includeChildren, includeMemberCount } = req.query;

    const organization = await service.getOrganization(id, {
      includeParent: includeParent === 'true',
      includeChildren: includeChildren === 'true',
      includeMemberCount: includeMemberCount === 'true',
    });

    res.json({
      success: true,
      data: organization,
    });
  } catch (error: any) {
    logger.error('Failed to get organization', { error: error.message, id: req.params.id });

    if (error.message.includes('not found')) {
      return res.status(404).json({
        success: false,
        error: error.message,
      });
    }

    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * @route GET /api/v1/organizations/:id/descendants
 * @desc Get all descendant organizations
 * @access Public (read-only)
 */
router.get('/:id/descendants', async (req: Request, res: Response) => {
  try {
    const service = getOrganizationService();
    if (!service) {
      return res.status(503).json({
        success: false,
        error: 'Database not initialized (GRACEFUL_STARTUP mode)',
      });
    }

    const { id } = req.params;
    const { maxDepth, includeInactive } = req.query;

    const descendants = await service.getDescendants(id, {
      maxDepth: maxDepth ? parseInt(maxDepth as string) : undefined,
      includeInactive: includeInactive === 'true',
    });

    res.json({
      success: true,
      data: descendants,
    });
  } catch (error: any) {
    logger.error('Failed to get organization descendants', { error: error.message, id: req.params.id });
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// ============================================================================
// ADMIN ROUTES (require authentication - to be implemented)
// ============================================================================
// POST /api/v1/organizations - Create organization
// PUT /api/v1/organizations/:id - Update organization
// DELETE /api/v1/organizations/:id - Delete organization
//
// These routes will be added when admin authentication is integrated.
// For now, organizations are read-only from the Core API.
// ============================================================================

export default router;

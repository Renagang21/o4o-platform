import { Router, Request, Response } from 'express';
import { body, param, query } from 'express-validator';
import { CMSController } from '../controllers/CMSController.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { requireAnyRole, requireAdmin } from '../middleware/permission.middleware.js';
import type { AuthRequest } from '../types/auth.js';

const router: Router = Router();
const cmsController = new CMSController();

/**
 * NextGen CMS Routes
 * Manages View JSON entities for the ViewRenderer system
 */

// Public route - get view by viewId (for ViewRenderer)
router.get(
  '/views/by-view-id/:viewId',
  param('viewId').isString().notEmpty(),
  async (req: Request, res: Response) => cmsController.getViewByViewId(req, res)
);

// Protected routes - require authentication
router.use(authenticate);

// List views
router.get(
  '/views',
  query('page').optional().isInt({ min: 1 }),
  query('pageSize').optional().isInt({ min: 1, max: 100 }),
  query('status').optional().isIn(['draft', 'published', 'archived']),
  query('category').optional().isString(),
  query('search').optional().isString(),
  query('orderBy').optional().isIn(['title', 'viewId', 'createdAt', 'updatedAt', 'status']),
  query('order').optional().isIn(['ASC', 'DESC']),
  async (req: Request, res: Response) => cmsController.listViews(req, res)
);

// Get single view by ID
router.get(
  '/views/:id',
  param('id').isUUID(),
  async (req: Request, res: Response) => cmsController.getView(req, res)
);

// Create new view - require admin or editor role
router.post(
  '/views',
  requireAnyRole(['admin', 'editor']),
  body('viewId').isString().notEmpty().trim(),
  body('url').isString().notEmpty().trim(),
  body('title').isString().notEmpty().trim(),
  body('description').optional().isString(),
  body('json').isObject(),
  body('status').optional().isIn(['draft', 'published', 'archived']),
  body('category').optional().isString(),
  body('tags').optional().isArray(),
  body('metadata').optional().isObject(),
  async (req: AuthRequest, res: Response) => cmsController.createView(req, res)
);

// Update view - require admin or editor role
router.put(
  '/views/:id',
  requireAnyRole(['admin', 'editor']),
  param('id').isUUID(),
  body('viewId').optional().isString().notEmpty().trim(),
  body('url').optional().isString().notEmpty().trim(),
  body('title').optional().isString().notEmpty().trim(),
  body('description').optional().isString(),
  body('json').optional().isObject(),
  body('status').optional().isIn(['draft', 'published', 'archived']),
  body('category').optional().isString(),
  body('tags').optional().isArray(),
  body('metadata').optional().isObject(),
  async (req: AuthRequest, res: Response) => cmsController.updateView(req, res)
);

// Delete view - require admin role
router.delete(
  '/views/:id',
  requireAdmin,
  param('id').isUUID(),
  async (req: Request, res: Response) => cmsController.deleteView(req, res)
);

// Publish view - require admin or editor role
router.post(
  '/views/:id/publish',
  requireAnyRole(['admin', 'editor']),
  param('id').isUUID(),
  async (req: Request, res: Response) => cmsController.publishView(req, res)
);

// Unpublish view - require admin or editor role
router.post(
  '/views/:id/unpublish',
  requireAnyRole(['admin', 'editor']),
  param('id').isUUID(),
  async (req: Request, res: Response) => cmsController.unpublishView(req, res)
);

export default router;

/**
 * Dropshipping API Routes
 * 드랍쉬핑 설정 관리 라우트
 */

import { Router, Request, Response } from 'express';
import { DropshippingController } from '../../controllers/DropshippingController';
import { authMiddleware } from '../../middleware/authMiddleware';

const router: Router = Router();
const dropshippingController = new DropshippingController();

// All routes require authentication
// router.use(authenticateToken);

// Most dropshipping settings require admin role
// const requireAdmin = requireRole(['admin']);

/**
 * @route   GET /api/v1/dropshipping/settings
 * @desc    Get dropshipping settings
 * @access  Admin
 */
router.get('/settings', (req: Request, res: Response) => {
  dropshippingController.getSettings(req as any, res);
});

/**
 * @route   PUT /api/v1/dropshipping/settings
 * @desc    Update dropshipping settings
 * @access  Admin
 */
router.put('/settings', (req: Request, res: Response) => {
  dropshippingController.updateSettings(req as any, res);
});

/**
 * @route   GET /api/v1/dropshipping/connectors
 * @desc    Get supplier connectors status
 * @access  Admin
 */
router.get('/connectors', (req: Request, res: Response) => {
  dropshippingController.getConnectors(req as any, res);
});

/**
 * @route   POST /api/v1/dropshipping/connectors/:connectorId/test
 * @desc    Test supplier connector
 * @access  Admin
 */
router.post('/connectors/:connectorId/test', 
  authMiddleware.authenticateToken,
  authMiddleware.requirePermission('dropshipping:test'),
  (req: Request, res: Response) => {
    dropshippingController.testConnector(req as any, res);
  }
);

/**
 * @route   GET /api/v1/dropshipping/margin-policies
 * @desc    Get margin policies
 * @access  Admin
 */
router.get('/margin-policies', (req: Request, res: Response) => {
  dropshippingController.getMarginPolicies(req as any, res);
});

/**
 * @route   GET /api/v1/dropshipping/statistics
 * @desc    Get dropshipping statistics
 * @access  Admin
 */
router.get('/statistics', (req: Request, res: Response) => {
  dropshippingController.getStatistics(req as any, res);
});

export default router;
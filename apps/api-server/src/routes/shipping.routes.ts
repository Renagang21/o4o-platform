import { Router, Request, Response } from 'express';
import { ShippingTrackingController } from '../controllers/shippingTracking.controller';
import { authenticate } from '../middleware/auth.middleware';
import { authorize } from '../middleware/authorize.middleware';
import { UserRole } from '../entities/User';

const router: Router = Router();
const shippingController = new ShippingTrackingController();

// Public routes - tracking lookup
router.get('/track/:trackingNumber', (req: Request, res: Response) => 
  shippingController.getByTrackingNumber(req, res)
);

router.get('/order/:orderId/tracking', (req: Request, res: Response) =>
  shippingController.getByOrderId(req, res)
);

// Protected routes - require authentication
router.use(authenticate);

// Admin/Vendor routes
router.post('/tracking',
  authorize([UserRole.ADMIN, UserRole.VENDOR, UserRole.VENDOR_MANAGER]),
  (req: Request, res: Response) => shippingController.createTracking(req as any, res)
);

router.put('/tracking/:id/status',
  authorize([UserRole.ADMIN, UserRole.VENDOR, UserRole.VENDOR_MANAGER]),
  (req: Request, res: Response) => shippingController.updateStatus(req as any, res)
);

router.post('/tracking/:id/fail',
  authorize([UserRole.ADMIN, UserRole.VENDOR, UserRole.VENDOR_MANAGER]),
  (req: Request, res: Response) => shippingController.markAsFailed(req as any, res)
);

router.post('/tracking/:id/return',
  authorize([UserRole.ADMIN, UserRole.VENDOR, UserRole.VENDOR_MANAGER]),
  (req: Request, res: Response) => shippingController.processReturn(req as any, res)
);

router.get('/tracking/status/:status',
  authorize([UserRole.ADMIN, UserRole.VENDOR, UserRole.VENDOR_MANAGER]),
  (req: Request, res: Response) => shippingController.getByStatus(req, res)
);

router.post('/tracking/batch-update/:carrier',
  authorize([UserRole.ADMIN]),
  (req: Request, res: Response) => shippingController.batchUpdate(req as any, res)
);

// Statistics - Admin only
router.get('/statistics',
  authorize([UserRole.ADMIN]),
  (req: Request, res: Response) => shippingController.getStatistics(req, res)
);

export default router;
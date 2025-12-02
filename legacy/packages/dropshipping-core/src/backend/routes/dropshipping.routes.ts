import { Router } from 'express';
import { DropshippingController } from '../../controllers/dropshipping/DropshippingController.js';
import { authenticate } from '../../middleware/auth.middleware.js';
import { requireAdmin } from '../../middleware/permission.middleware.js';

const router: Router = Router();
const dropshippingController = new DropshippingController();

// All routes require admin authentication
router.use(authenticate);
router.use(requireAdmin);

// Commission Policies
router.get('/commission-policies', dropshippingController.getCommissionPolicies);

// Approvals
router.get('/approvals', dropshippingController.getApprovals);
router.post('/approvals/:id/approve', dropshippingController.approveRequest);
router.post('/approvals/:id/reject', dropshippingController.rejectRequest);

// System Status and Management
router.get('/system-status', dropshippingController.getSystemStatus);
router.post('/initialize', dropshippingController.initializeSystem);
router.post('/seed', dropshippingController.createSampleData);

// Bulk Import Products
router.post('/products/bulk-import', dropshippingController.bulkImportProducts);

export default router;
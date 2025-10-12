import { Router } from 'express';
import { DropshippingController } from '../../controllers/dropshipping/DropshippingController';
import { authenticate } from '../../middleware/auth.middleware';
import { requireAdmin } from '../../middleware/permission.middleware';

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

export default router;
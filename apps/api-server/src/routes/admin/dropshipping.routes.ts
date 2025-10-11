import { Router } from 'express';
import { DropshippingController } from '../../controllers/dropshipping/DropshippingController';
import { authenticateToken } from '../../middleware/auth';
import { requireAdmin } from '../../middleware/permission.middleware';

const router: Router = Router();
const dropshippingController = new DropshippingController();

// All routes require admin authentication
router.use(authenticateToken);
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
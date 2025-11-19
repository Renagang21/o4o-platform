import { Router } from 'express';
import { SupplierController } from '../../controllers/SupplierController.js';
import { authenticateToken, requireRole } from '../../middleware/auth.middleware.js';
import { UserRole } from '../../entities/User.js';

/**
 * Supplier Routes
 * Phase PD-4: Dropshipping Order Pipeline Integration
 *
 * /api/v2/supplier - Supplier-specific endpoints
 *
 * All routes require authentication and supplier role
 */

const router: Router = Router();

// Apply authentication and supplier role requirement to all routes
router.use(authenticateToken);
router.use(requireRole(UserRole.SUPPLIER));

// Phase PD-4: Orders
router.get('/orders', SupplierController.getSupplierOrders);

// Phase PD-4: Settlement preview (stub for PD-5)
router.get('/settlements/preview', SupplierController.getSettlementPreview);

export default router;

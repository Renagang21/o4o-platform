import { Router } from 'express';
import { SellerController } from '../../controllers/SellerController.js';
import { authenticateToken } from '../../middleware/auth.js';
import { requireRole } from '../../middleware/permission.middleware.js';
import { UserRole } from '../../entities/User.js';

/**
 * Seller Routes
 * Phase PD-3: Dropshipping Seller Workflow
 *
 * /api/v2/seller - Seller-specific endpoints
 *
 * All routes require authentication and seller role
 */

const router: Router = Router();

// Apply authentication and seller role requirement to all routes
router.use(authenticateToken);
router.use(requireRole(UserRole.SELLER));

// Catalog endpoints
router.get('/catalog', SellerController.getCatalog);
router.post('/catalog/import', SellerController.importProduct);

// Seller products endpoints
router.get('/products', SellerController.getSellerProducts);
router.get('/products/:id', SellerController.getSellerProduct);
router.patch('/products/:id', SellerController.updateSellerProduct);
router.delete('/products/:id', SellerController.deleteSellerProduct);

// Statistics
router.get('/stats', SellerController.getSellerStats);

export default router;

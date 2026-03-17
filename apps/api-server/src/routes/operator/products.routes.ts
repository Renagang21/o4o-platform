/**
 * Operator Product Console Routes — Extension Layer
 * WO-O4O-PRODUCT-MASTER-CONSOLE-V1
 *
 * Core Freeze 준수: Neture 모듈 미수정
 */
import { Router } from 'express';
import { ProductConsoleController } from '../../controllers/operator/ProductConsoleController.js';
import { authenticate, requireRole } from '../../middleware/auth.middleware.js';
import { injectServiceScope } from '../../utils/serviceScope.js';

const router: Router = Router();
const controller = new ProductConsoleController();

// All routes require authentication + operator-level role + service scope
// Platform roles + service-prefixed operator/admin roles
router.use(authenticate);
router.use(requireRole([
  'admin', 'super_admin', 'operator', 'manager',
  'platform:admin', 'platform:super_admin',
  'neture:admin', 'neture:operator',
  'glycopharm:admin', 'glycopharm:operator',
  'glucoseview:admin', 'glucoseview:operator',
  'k-cosmetics:admin', 'k-cosmetics:operator',
  'kpa-society:admin', 'kpa-society:operator',
]));
router.use(injectServiceScope);

// Product list with images + brand + category + supplier count
router.get('/', controller.getProducts);

// Duplicate barcode detection
router.get('/duplicates', controller.getDuplicates);

// Product detail
router.get('/:productId', controller.getProductDetail);

// Product supplier offers
router.get('/:productId/suppliers', controller.getProductSuppliers);

export default router;

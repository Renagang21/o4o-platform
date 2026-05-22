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
// WO-O4O-REQUIREADMIN-PREFIXED-ONLY-V1: legacy unprefixed roles 제거
router.use(requireRole([
  'platform:admin', 'platform:super_admin',
  'neture:admin', 'neture:operator',
  'glycopharm:admin', 'glycopharm:operator',
  'cosmetics:admin', 'cosmetics:operator',
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

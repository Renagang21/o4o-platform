/**
 * Operator Product Console Routes — Extension Layer
 * WO-O4O-PRODUCT-MASTER-CONSOLE-V1
 *
 * Core Freeze 준수: Neture 모듈 미수정
 */
import { Router } from 'express';
import { ProductConsoleController } from '../../controllers/operator/ProductConsoleController.js';
import { authenticate } from '../../middleware/auth.middleware.js';
import { requireAnyRole } from '../../middleware/permission.middleware.js';
import { UserRole } from '../../entities/User.js';

const router: Router = Router();
const controller = new ProductConsoleController();

// All routes require authentication + operator-level role
router.use(authenticate);
router.use(requireAnyRole([UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.OPERATOR, UserRole.MANAGER]));

// Product list with images + brand + category + supplier count
router.get('/', controller.getProducts);

// Duplicate barcode detection
router.get('/duplicates', controller.getDuplicates);

// Product detail
router.get('/:productId', controller.getProductDetail);

// Product supplier offers
router.get('/:productId/suppliers', controller.getProductSuppliers);

export default router;

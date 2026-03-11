/**
 * Operator Store Console Routes — Extension Layer
 * WO-O4O-STORE-CONSOLE-V1
 *
 * Core Freeze 준수: KPA 모듈 미수정
 */
import { Router } from 'express';
import { StoreConsoleController } from '../../controllers/operator/StoreConsoleController.js';
import { authenticate } from '../../middleware/auth.middleware.js';
import { requireAnyRole } from '../../middleware/permission.middleware.js';
import { UserRole } from '../../entities/User.js';

const router: Router = Router();
const controller = new StoreConsoleController();

// All routes require authentication + operator-level role
router.use(authenticate);
router.use(requireAnyRole([UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.OPERATOR, UserRole.MANAGER]));

// Store list with slug + owner + channel_count + product_count
router.get('/', controller.getStores);

// Store detail
router.get('/:storeId', controller.getStoreDetail);

// Store channels
router.get('/:storeId/channels', controller.getStoreChannels);

// Store product listings
router.get('/:storeId/products', controller.getStoreProducts);

// Store capabilities (WO-O4O-STORE-CAPABILITY-SYSTEM-V1)
router.get('/:storeId/capabilities', controller.getStoreCapabilities);
router.put('/:storeId/capabilities', controller.updateStoreCapabilities);

export default router;

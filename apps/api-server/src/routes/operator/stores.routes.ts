/**
 * Operator Store Console Routes — Extension Layer
 * WO-O4O-STORE-CONSOLE-V1
 *
 * Core Freeze 준수: KPA 모듈 미수정
 */
import { Router } from 'express';
import { StoreConsoleController } from '../../controllers/operator/StoreConsoleController.js';
import { authenticate, requireRole } from '../../middleware/auth.middleware.js';
import { injectServiceScope } from '../../utils/serviceScope.js';

const router: Router = Router();
const controller = new StoreConsoleController();

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

// Store list with slug + owner + channel_count + product_count
router.get('/', controller.getStores);

// WO-O4O-STORE-CHANNEL-LIFECYCLE-V1: Cross-store channel list
// NOTE: Must be before /:storeId to avoid param collision
router.get('/channels', controller.getAllChannels);

// Store detail
router.get('/:storeId', controller.getStoreDetail);

// Store channels
router.get('/:storeId/channels', controller.getStoreChannels);

// WO-O4O-STORE-CHANNEL-LIFECYCLE-V1: Channel status update
router.put('/:storeId/channels/:channelId/status', controller.updateChannelStatus);

// Store product listings
router.get('/:storeId/products', controller.getStoreProducts);

// WO-O4O-STORE-PROFILE-UNIFICATION-V1: Store profile update
router.put('/:storeId/profile', controller.updateStoreProfile);

// Store capabilities (WO-O4O-STORE-CAPABILITY-SYSTEM-V1)
router.get('/:storeId/capabilities', controller.getStoreCapabilities);
router.put('/:storeId/capabilities', controller.updateStoreCapabilities);

export default router;

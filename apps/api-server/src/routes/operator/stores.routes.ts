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

// WO-O4O-OPERATOR-ROLE-ASSIGNMENT-REPAIR-AND-GUARD-NORMALIZATION-V1:
// 이전의 requireOperatorAccess 는 F11 §2 "membership bypass 로직 ❌" 위반이었음.
// 운영자 권한의 canonical source = role_assignments (F9 SSOT). 데이터 보정 완료
// (4 계정 RA reactivate) 후 표준 requireRole 로 정상화. 다른 4 operator route 와
// 동일한 guard 체인을 갖도록 통일.
//
// WO-O4O-REQUIREADMIN-PREFIXED-ONLY-V1: legacy unprefixed roles 제거
router.use(authenticate);
router.use(requireRole([
  'platform:admin', 'platform:super_admin',
  'neture:admin', 'neture:operator',
  'glycopharm:admin', 'glycopharm:operator',
  'cosmetics:admin', 'cosmetics:operator',
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

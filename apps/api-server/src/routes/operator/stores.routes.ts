/**
 * Operator Store Console Routes — Extension Layer
 * WO-O4O-STORE-CONSOLE-V1
 *
 * Core Freeze 준수: KPA 모듈 미수정
 */
import { Router } from 'express';
import type { Request, Response, NextFunction } from 'express';
import { StoreConsoleController } from '../../controllers/operator/StoreConsoleController.js';
import { authenticate } from '../../middleware/auth.middleware.js';
import { injectServiceScope } from '../../utils/serviceScope.js';

const router: Router = Router();
const controller = new StoreConsoleController();

const OPERATOR_ROLES = [
  'admin', 'super_admin', 'operator', 'manager',
  'platform:admin', 'platform:super_admin',
  'neture:admin', 'neture:operator',
  'glycopharm:admin', 'glycopharm:operator',
  'k-cosmetics:admin', 'k-cosmetics:operator',
  'kpa-society:admin', 'kpa-society:operator',
];

/**
 * Accept operators who have role_assignments OR active service memberships.
 * KPA Society operators use membership-based auth (service_memberships),
 * not role_assignments, so requireRole() would reject them.
 * WO-KPA-SOCIETY-STORE-ACCESS-FIX-V1
 */
function requireOperatorAccess(req: Request, res: Response, next: NextFunction): void {
  const user = (req as any).user;
  if (!user) {
    res.status(401).json({ success: false, error: 'Authentication required', code: 'UNAUTHORIZED' });
    return;
  }

  // Check JWT roles (from role_assignments, set at login)
  const userRoles: string[] = user.roles || [];
  if (OPERATOR_ROLES.some(r => userRoles.includes(r))) {
    next();
    return;
  }

  // Fallback: active service membership in JWT (KPA-style membership-based operators)
  const memberships: { serviceKey: string; status: string }[] = user.memberships || [];
  if (memberships.some(m => m.status === 'active')) {
    next();
    return;
  }

  res.status(403).json({
    success: false,
    error: `One of these roles required: ${OPERATOR_ROLES.join(', ')}`,
    code: 'ROLE_REQUIRED',
    details: { requiredRoles: OPERATOR_ROLES },
  });
}

// All routes require authentication + operator-level role (or active membership) + service scope
router.use(authenticate);
router.use(requireOperatorAccess);
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

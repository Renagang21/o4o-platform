/**
 * Operator Membership Console Routes — Extension Layer
 * WO-O4O-MEMBERSHIP-CONSOLE-V1
 * WO-NETURE-MEMBERSHIP-APPROVAL-FLOW-STABILIZATION-V1:
 *   서비스별 operator/admin role 추가 (neture:operator 등)
 *
 * Core Freeze F10 준수: 기존 admin/users 라우트 미수정
 */
import { Router } from 'express';
import { MembershipConsoleController } from '../../controllers/operator/MembershipConsoleController.js';
import { authenticate, requireRole } from '../../middleware/auth.middleware.js';
import { injectServiceScope } from '../../utils/serviceScope.js';

const router: Router = Router();
const controller = new MembershipConsoleController();

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

// Member list with memberships + roles
router.get('/', controller.getMembers);

// Member detail
router.get('/:userId', controller.getMemberDetail);

// Membership approval/rejection
router.patch('/:membershipId/approve', controller.approveMembership);
router.patch('/:membershipId/reject', controller.rejectMembership);

export default router;

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
// WO-O4O-REQUIREADMIN-PREFIXED-ONLY-V1: legacy unprefixed roles 제거
// WO-O4O-KPA-OPERATOR-CANONICAL-ROLE-GUARD-FIX-V1: 'kpa-society:*' → canonical 'kpa:*'
//   (service_key 를 role prefix 자리에 쓴 오타. cosmetics 는 6b586fb06 에서 선행 정정됨)
router.use(requireRole([
  'platform:super_admin',
  'neture:admin', 'neture:operator',
  'glycopharm:admin', 'glycopharm:operator',
  'cosmetics:admin', 'cosmetics:operator',
  'kpa:admin', 'kpa:operator',
  // WO-O4O-PHARMACYHUB-OPERATOR-COMMUNITY-AND-COMMON-CAPABILITY-FULL-ADOPTION-V1:
  //   공통 API 는 이미 service scope 로 격리되는데 allowlist 에만 pharmacy-hub 가 빠져 있었다.
  //   (injectServiceScope 가 'pharmacy-hub' 를 self-map 하므로 데이터 경계는 그대로다.)
  'pharmacy-hub:admin', 'pharmacy-hub:operator',
]));
router.use(injectServiceScope);

// Member list with memberships + roles
router.get('/', controller.getMembers);

// Member statistics (operator-level)
router.get('/stats', controller.getStats);

// Member detail
router.get('/:userId', controller.getMemberDetail);

// Member update (password change) / status change / delete
router.put('/:userId', controller.updateMember);
router.patch('/:userId/status', controller.updateMemberStatus);
router.post('/:userId/reactivate', controller.reactivateMember);
router.get('/:userId/delete-risk', controller.getDeleteRisk);
router.delete('/:userId', controller.deleteMember);

// Role assignment/removal
router.post('/:userId/roles', controller.assignMemberRole);
router.delete('/:userId/roles/:role', controller.removeMemberRole);

// Membership approval/rejection
router.patch('/:membershipId/approve', controller.approveMembership);
router.patch('/:membershipId/reject', controller.rejectMembership);

// V3 Batch — WO-O4O-TABLE-STANDARD-V3-EXPANSION
router.post('/batch-status', controller.batchUpdateStatus);

export default router;

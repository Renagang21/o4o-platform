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
  'cosmetics:admin', 'cosmetics:operator',
  'kpa:admin', 'kpa:operator',
  // WO-O4O-PHARMACYHUB-OPERATOR-COMMUNITY-AND-COMMON-CAPABILITY-FULL-ADOPTION-V1:
  //   공통 API 는 이미 service scope 로 격리되는데 allowlist 에만 pharmacy-hub 가 빠져 있었다.
  //   (injectServiceScope 가 'pharmacy-hub' 를 self-map 하므로 데이터 경계는 그대로다.)
  'pharmacy-hub:admin', 'pharmacy-hub:operator',
  // WO-O4O-SERVICE-IDENTITY-AND-OPERATOR-SCOPE-V1 §7:
  //   study.neture.co.kr(= `lecture`) 와 커뮤니티에는 가입 승인 경로가 없었다. 두 서비스도
  //   service_memberships 로 가입을 판정하는데 이 allowlist 에만 빠져 있어서, 자기 서비스의
  //   가입 신청을 승인할 수 있는 사람이 platform:super_admin 뿐이었다.
  //   데이터 경계는 extractServiceScope 가 role prefix 에서 그대로 파생하므로(범용) 여기
  //   추가만으로 각자 서비스 membership 밖으로 나가지 않는다.
  //   `community:operator` 는 없다 — 커뮤니티 개별 운영은 개체 역할이며 서비스 전체 축이 아니다.
  //   `kpa-branch:*` 는 추가하지 않는다 — 분회는 전용 승인 경로(/admin/service-members)가 있고
  //   두 경로를 만들면 승인 주체가 둘로 갈라진다.
  'lecture:admin', 'lecture:operator',
  'community:admin',
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

/**
 * @core O4O_PLATFORM_CORE — Approval
 * Core Routes: GET /admin/users, PATCH /admin/users/:id/status
 * Do not modify without CORE_CHANGE approval.
 * Freeze: WO-O4O-CORE-FREEZE-V1 (2026-03-11)
 */
import { Router } from 'express';
import { AdminUserController } from '../../controllers/admin/AdminUserController.js';
import { authenticate } from '../../middleware/auth.middleware.js';
import { requireRole } from '../../middleware/auth.middleware.js';
import { body } from 'express-validator';

const router: Router = Router();
const adminUserController = new AdminUserController();

// WO-OPERATOR-FIX-V1: Valid role patterns include service-prefixed roles
const LEGACY_ROLES = [
  'super_admin', 'admin', 'operator', 'manager', 'moderator',
  'vendor', 'seller', 'customer', 'business', 'supplier', 'affiliate', 'user'
];
// Validate role: accept legacy roles OR service-prefixed roles (e.g., kpa:admin, neture:operator)
const isValidRole = (value: string) => {
  if (LEGACY_ROLES.includes(value)) return true;
  if (/^[a-z][a-z0-9-]*:[a-z][a-z_]*$/.test(value)) return true;
  throw new Error(`Invalid role: ${value}`);
};

// All admin user routes require authentication
router.use(authenticate);

// WO-O4O-REQUIREADMIN-PREFIXED-ONLY-V1: platform: prefix 필수 (legacy super_admin/admin 제거)
const ADMIN_ROLES = ['platform:super_admin'];

// User management routes (platform admin only)
router.get('/', requireRole(ADMIN_ROLES), adminUserController.getUsers);
router.get('/statistics', requireRole(ADMIN_ROLES), adminUserController.getUserStatistics);
router.get('/:id', requireRole(ADMIN_ROLES), adminUserController.getUser);

// User creation (admin only) — IR-O4O-ADMIN-OPERATOR-CREATE-SUPERADMIN-AUTH-FAILURE-V1
router.post('/',
  requireRole(ADMIN_ROLES),
  [
    body('email').isEmail().withMessage('Valid email is required'),
    // WO-O4O-ADMIN-OPERATOR-GOOGLE-INVITATION-AND-ASSIGNMENT-CUTOVER-V1 §18:
    //   password 검증 선언을 제거한다 — 이 경로는 더 이상 비밀번호를 만들지 않으며
    //   password 가 오면 controller 가 400 `PASSWORD_NOT_ALLOWED_HERE` 로 거절한다.
    //   운영자는 Google 계정으로 지정(`POST /admin/operator-assignments`) 하거나
    //   초대(`POST /admin/operator-invitations`) 한다.
    // 이름은 optional 이다 — 이 경로는 **기존 사용자에게 역할을 추가**할 뿐이며 이름을 쓰지 않는다
    //   (신규 user 생성 경로는 §18 에서 은퇴했다: 400 OPERATOR_INVITATION_REQUIRED).
    body('firstName').optional().notEmpty().withMessage('First name cannot be empty'),
    body('lastName').optional().notEmpty().withMessage('Last name cannot be empty'),
    body('role').optional().custom(isValidRole),
    body('roles').optional().isArray().withMessage('roles must be an array'),
    body('roles.*').optional().custom(isValidRole),
    // 대상 서비스 canonical key (선택) — role 에서 파생한 키와 일치해야 한다.
    body('serviceKey').optional().isString().withMessage('serviceKey must be a string'),
    body('status').optional().isIn(['approved', 'pending', 'rejected', 'suspended']).withMessage('Invalid status')
  ],
  adminUserController.createUser
);

// User updates (platform admin only) — WO-O4O-ADMIN-GUARD-PLATFORM-PREFIX-FIX-V1
router.put('/:id',
  requireRole(ADMIN_ROLES),
  [
    body('email').optional().isEmail().withMessage('Valid email is required'),
    // WO-O4O-CENTRAL-OPERATORS-PASSWORD-POLICY-UX-ALIGNMENT-V1:
    //   password 검증 선언을 제거한다 — 이 경로의 controller 는 password 가 오면
    //   항상 400 `PASSWORD_NOT_ALLOWED_HERE` 로 거절하므로(AdminUserController.updateUser)
    //   검증 규칙이 통과해도 의미가 없고, "여기서 비밀번호를 바꿀 수 있다" 는 오해만 만든다.
    //   서비스 비밀번호는 `PUT /api/v1/operator/members/:userId { password, serviceKey }`,
    //   플랫폼 계정 비밀번호는 `PATCH /api/v1/admin/platform-accounts/:id/password` 가 담당한다.
    body('firstName').optional().notEmpty().withMessage('First name cannot be empty'),
    body('lastName').optional().notEmpty().withMessage('Last name cannot be empty'),
    body('role').optional().custom(isValidRole),
    body('roles').optional().isArray().withMessage('roles must be an array'),
    body('roles.*').optional().custom(isValidRole),
    body('status').optional().isIn(['approved', 'pending', 'rejected', 'suspended']).withMessage('Invalid status')
  ],
  adminUserController.updateUser
);

// Update user status (platform admin only) — WO-O4O-ADMIN-GUARD-PLATFORM-PREFIX-FIX-V1
router.patch('/:id/status',
  requireRole(ADMIN_ROLES),
  [
    body('status').isIn(['approved', 'pending', 'rejected', 'suspended']).withMessage('Invalid status')
  ],
  adminUserController.updateUserStatus
);

// User deletion (admin only) — IR-O4O-ADMIN-OPERATOR-CREATE-SUPERADMIN-AUTH-FAILURE-V1
router.delete('/:id', requireRole(ADMIN_ROLES), adminUserController.deleteUser);

// WO-O4O-ADMIN-OPERATOR-ROLE-REVOKE-AND-SUPERADMIN-GUARD-V1
// 단일 역할 해제 — 계정 삭제/비활성화 없이 role_assignments만 비활성화
//
// WO-O4O-ADMIN-INDIVIDUAL-API-ACCESS-BOUNDARY-CORRECTION-V1 — 주석 정정 (동작 변경 없음)
//   기존 주석은 "legacy super_admin / admin 도 모두 허용" 이라고 적혀 있었으나 사실과 다르다.
//   ADMIN_ROLES 는 위 :32 에서 platform: 접두 2종만으로 좁혀졌다
//   (WO-O4O-REQUIREADMIN-PREFIXED-ONLY-V1, legacy 데이터는
//    migration 20261027000000-MigrateLegacyRolesToPlatformPrefixed 로 platform: 접두로 이전됨).
//   즉 legacy 표기 역할은 이 라우트 전체에서 403 이다.
router.delete('/:userId/role-assignments/:role', requireRole(ADMIN_ROLES), adminUserController.revokeRoleAssignment);

export default router;
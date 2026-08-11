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
// WO-O4O-CENTRAL-OPERATORS-PASSWORD-POLICY-UX-ALIGNMENT-V1: 비밀번호 정책 정본
import { PASSWORD_MIN_LENGTH, PASSWORD_POLICY_MESSAGE, PASSWORD_POLICY_REGEX } from '../../utils/password-policy.js';

const router: Router = Router();
const adminUserController = new AdminUserController();

// WO-OPERATOR-FIX-V1: Valid role patterns include service-prefixed roles
const LEGACY_ROLES = [
  'super_admin', 'admin', 'operator', 'manager', 'moderator',
  'vendor', 'seller', 'customer', 'business', 'partner', 'supplier', 'affiliate', 'user'
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
    // WO-O4O-ADMIN-SERVICE-OPERATOR-REGISTRATION-IDENTITY-V2-V1:
    //   password 는 optional 이 된다 — **기존 사용자에게 권한만 추가**하고 그 서비스 credential 이
    //   이미 있으면 비밀번호를 받을 이유가 없기 때문이다(기존 credential 은 덮어쓰지 않는다).
    //   신규 사용자 필수 여부와 최소 길이(8자)는 controller 가 계약으로 강제한다
    //   (SERVICE_PASSWORD_REQUIRED / SERVICE_PASSWORD_TOO_SHORT).
    //   WO-O4O-CENTRAL-OPERATORS-PASSWORD-POLICY-UX-ALIGNMENT-V1:
    //     기존 `min: 6` 은 controller 계약(8자 + 영문 + 숫자)보다 느슨해 6~7자를 통과시킨 뒤
    //     controller 에서 다시 거절하는 이중 문구를 만들었다. 정책 정본으로 맞춘다.
    body('password')
      .optional()
      .isLength({ min: PASSWORD_MIN_LENGTH })
      .withMessage(PASSWORD_POLICY_MESSAGE)
      .matches(PASSWORD_POLICY_REGEX)
      .withMessage(PASSWORD_POLICY_MESSAGE),
    // WO-O4O-ADMIN-SERVICE-OPERATOR-REGISTRATION-IDENTITY-V2-V1:
    //   이름도 optional 이 된다 — **기존 사용자 권한 추가** 경로는 이름을 쓰지 않으며(무시된다),
    //   관리자가 알지도 못하는 이름을 형식 통과 목적으로 입력하게 만들 이유가 없다.
    //   신규 사용자 필수 여부는 controller 가 계약으로 강제한다(NAME_REQUIRED).
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
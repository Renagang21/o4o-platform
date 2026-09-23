import { Router, Request, Response } from 'express';
import { UserManagementController } from '../controllers/UserManagementController.js';
import { authenticate, requireAdmin, type AuthRequest } from '../middleware/auth.middleware.js';
import { UserController, SelfProfileController } from '../modules/user/controllers/index.js';
import { UserRole } from '../types/auth.js';
import { asyncHandler } from '../middleware/error-handler.js';
import { validationResult } from 'express-validator';
import { body, param, query } from 'express-validator';

const router: Router = Router();
const userController = new UserManagementController();

// Validation rules
const createUserValidation = [
  body('email').isEmail().normalizeEmail(),
  body('firstName').optional().trim().notEmpty(),
  body('lastName').optional().trim().notEmpty(),
  body('role').optional().isIn(Object.values(UserRole)),
  body('roles').optional().isArray(),
  body('roles.*').optional().isIn(Object.values(UserRole))
];

const updateUserValidation = [
  body('email').optional().isEmail().normalizeEmail(),
  body('firstName').optional().trim().notEmpty(),
  body('lastName').optional().trim().notEmpty(),
  body('status').optional().isIn(['active', 'pending', 'approved', 'rejected']),
  body('roles').optional().isArray(),
  body('roles.*').optional().isIn(Object.values(UserRole))
];

const paginationValidation = [
  query('page').optional().isInt({ min: 1 }).toInt(),
  query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
  query('sortBy').optional().isIn(['createdAt', 'email', 'firstName', 'lastName']),
  query('sortOrder').optional().isIn(['ASC', 'DESC'])
];

// Public routes (none for user management)

// Protected routes - require authentication
router.use(authenticate);

// ============================================================================
// Authenticated user routes (no admin role required)
// WO-NETURE-EXTERNAL-CONTACT-V1: Contact settings for any authenticated user
// ============================================================================

router.get(
  '/me/contact',
  asyncHandler(async (req: AuthRequest, res: Response) => {
    return UserController.getContactSettings(req, res);
  })
);

router.patch(
  '/me/contact',
  [
    body('contactEnabled').optional().isBoolean(),
    body('kakaoOpenChatUrl').optional({ nullable: true }).isString(),
    body('kakaoChannelUrl').optional({ nullable: true }).isString(),
  ],
  asyncHandler(async (req: AuthRequest, res: Response) => {
    return UserController.updateContactSettings(req, res);
  })
);

// ---------------------------------------------------------------------------
// WO-O4O-CROSS-SERVICE-SELF-PROFILE-WRITE-CONTRACT-V1
// GET/PATCH /api/v1/users/me/profile — 인증 사용자의 ACCOUNT_CORE 자기 조회·수정
//   플랫폼 공통 canonical self-profile 계약 (서비스별 임시 API 금지).
//   requireAdmin 적용 전에 등록 — 일반 사용자가 호출할 수 있어야 한다.
//   대상은 항상 req.user.id 이며 body/path 로 다른 사용자를 지목할 수 없다.
// ---------------------------------------------------------------------------
router.get(
  '/me/profile',
  asyncHandler(async (req: AuthRequest, res: Response) => {
    return SelfProfileController.getSelfProfile(req, res);
  }),
);

router.patch(
  '/me/profile',
  asyncHandler(async (req: AuthRequest, res: Response) => {
    return SelfProfileController.updateSelfProfile(req, res);
  }),
);

// WO-O4O-LEGACY-PASSWORD-AUTH-RETIREMENT-V1:
//   PUT /api/v1/users/password 는 은퇴했다. 바꿀 비밀번호가 없다.
//   계정 보안 설정은 연결된 Google identity 표시로 대체된다.

// Validation middleware
const validateRequest = (req: any, res: any, next: any) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  next();
};

// Admin only routes
router.use(requireAdmin);

// Get all users with filters
router.get(
  '/',
  [
    ...paginationValidation,
    query('search').optional().trim(),
    query('role').optional(),
    query('status').optional(),
    query('dateFrom').optional().isISO8601(),
    query('dateTo').optional().isISO8601()
  ],
  validateRequest,
  userController.getUsers
);

// Get pending approval users
router.get(
  '/pending',
  paginationValidation,
  validateRequest,
  userController.getPendingUsers
);

// Handle /new path explicitly (return empty data for new user form)
router.get('/new', (req, res) => {
  res.json({
    success: true,
    data: {
      user: null,
      roles: ['admin', 'moderator', 'manager', 'vendor', 'seller', 'user', 'business']
    }
  });
});

// Get single user
router.get(
  '/:id',
  param('id').isUUID(),
  validateRequest,
  userController.getUser
);

// Create new user
router.post(
  '/',
  createUserValidation,
  validateRequest,
  userController.createUser
);

// Update user
router.put(
  '/:id',
  [
    param('id').isUUID(),
    ...updateUserValidation
  ],
  validateRequest,
  userController.updateUser
);

// Delete user (soft delete)
router.delete(
  '/:id',
  param('id').isUUID(),
  validateRequest,
  userController.deleteUser
);

// Approve user
router.post(
  '/:id/approve',
  [
    param('id').isUUID(),
    body('notes').optional().trim()
  ],
  validateRequest,
  userController.approveUser
);

// Reject user
router.post(
  '/:id/reject',
  [
    param('id').isUUID(),
    body('notes').optional().trim()
  ],
  validateRequest,
  userController.rejectUser
);

// Bulk approve users
router.post(
  '/bulk-approve',
  [
    body('userIds').isArray().notEmpty(),
    body('userIds.*').isUUID(),
    body('notes').optional().trim()
  ],
  validateRequest,
  userController.bulkApprove
);

// Bulk reject users
router.post(
  '/bulk-reject',
  [
    body('userIds').isArray().notEmpty(),
    body('userIds.*').isUUID(),
    body('notes').optional().trim()
  ],
  validateRequest,
  userController.bulkReject
);

// Update user roles
router.put(
  '/:id/roles',
  [
    param('id').isUUID(),
    body('roles').isArray().notEmpty(),
    body('roles.*').isIn(Object.values(UserRole))
  ],
  validateRequest,
  userController.updateUserRoles
);

// Get user approval history
router.get(
  '/:id/approval-history',
  param('id').isUUID(),
  validateRequest,
  userController.getUserApprovalHistory
);

// Export users to CSV
router.get(
  '/export/csv',
  [
    ...paginationValidation,
    query('search').optional().trim(),
    query('role').optional(),
    query('status').optional()
  ],
  validateRequest,
  userController.exportUsers
);

export default router;
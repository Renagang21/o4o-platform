import { Router, Request, Response } from 'express';
import { body, query, param, validationResult } from 'express-validator';
import { requireAuth, requireAdmin, AuthRequest } from '../../../common/middleware/auth.middleware.js';
import { asyncHandler } from '../../../middleware/error-handler.js';
import {
  UserController,
  UserManagementController,
  UserRoleController,
  UserActivityController,
} from '../controllers/index.js';
import logger from '../../../utils/logger.js';

/**
 * Unified User Routes - NextGen Pattern
 *
 * This router consolidates all user-related endpoints:
 * - Profile management (UserController)
 * - User administration (UserManagementController)
 * - Role management (UserRoleController)
 * - Activity logs (UserActivityController)
 *
 * Replaces legacy routes:
 * - /api/user (user.js)
 * - /api/users (users.routes.js)
 * - /api/v1/users (v1/users.routes.js)
 * - /api/v1/userRole (v1/userRole.routes.js)
 */
const router: Router = Router();

/**
 * Helper: Validate request
 */
function validateRequest(req: Request, res: Response): boolean {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400).json({
      success: false,
      errors: errors.array(),
    });
    return false;
  }
  return true;
}

// ============================================================================
// PROFILE MANAGEMENT ROUTES (UserController)
// ============================================================================

/**
 * GET /api/v1/users/profile
 * Get current user profile
 */
router.get(
  '/profile',
  requireAuth,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    return UserController.getProfile(req, res);
  })
);

/**
 * PUT /api/v1/users/profile
 * Update current user profile
 */
router.put(
  '/profile',
  requireAuth,
  [
    body('name').optional().isString().trim().isLength({ min: 2 }).withMessage('Name must be at least 2 characters'),
    body('email').optional().isEmail().withMessage('Valid email is required'),
    body('phone').optional().isString(),
    body('avatar').optional().isString(),
  ],
  asyncHandler(async (req: AuthRequest, res: Response) => {
    if (!validateRequest(req, res)) return;
    return UserController.updateProfile(req, res);
  })
);

/**
 * GET /api/v1/users/profile/completeness
 * Get profile completeness percentage
 */
router.get(
  '/profile/completeness',
  requireAuth,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    return UserController.getProfileCompleteness(req, res);
  })
);

/**
 * PUT /api/v1/users/password
 * Change password
 */
router.put(
  '/password',
  requireAuth,
  [
    body('currentPassword').isString().isLength({ min: 6 }).withMessage('Current password is required'),
    body('newPassword').isString().isLength({ min: 8 }).withMessage('New password must be at least 8 characters'),
    body('newPasswordConfirm').isString().withMessage('Password confirmation is required'),
  ],
  asyncHandler(async (req: AuthRequest, res: Response) => {
    if (!validateRequest(req, res)) return;
    return UserController.changePassword(req, res);
  })
);

// ============================================================================
// EXTERNAL CONTACT ROUTES (UserController)
// WO-NETURE-EXTERNAL-CONTACT-V1
// ============================================================================

/**
 * GET /api/v1/users/me/contact
 * Get current user's external contact settings
 */
router.get(
  '/me/contact',
  requireAuth,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    return UserController.getContactSettings(req, res);
  })
);

/**
 * PATCH /api/v1/users/me/contact
 * Update current user's external contact settings
 */
router.patch(
  '/me/contact',
  requireAuth,
  [
    body('contactEnabled').optional().isBoolean().withMessage('contactEnabled must be a boolean'),
    body('kakaoOpenChatUrl').optional({ nullable: true }).isString().withMessage('kakaoOpenChatUrl must be a string'),
    body('kakaoChannelUrl').optional({ nullable: true }).isString().withMessage('kakaoChannelUrl must be a string'),
  ],
  asyncHandler(async (req: AuthRequest, res: Response) => {
    if (!validateRequest(req, res)) return;
    return UserController.updateContactSettings(req, res);
  })
);

// ============================================================================
// SESSION MANAGEMENT ROUTES (UserController)
// ============================================================================

/**
 * GET /api/v1/users/sessions
 * Get user sessions
 */
router.get(
  '/sessions',
  requireAuth,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    return UserController.getSessions(req, res);
  })
);

/**
 * DELETE /api/v1/users/sessions/:sessionId
 * Delete a specific session
 */
router.delete(
  '/sessions/:sessionId',
  requireAuth,
  [param('sessionId').isString().notEmpty().withMessage('Session ID is required')],
  asyncHandler(async (req: AuthRequest, res: Response) => {
    if (!validateRequest(req, res)) return;
    return UserController.deleteSession(req, res);
  })
);

// ============================================================================
// USER ACTIVITY ROUTES (UserActivityController)
// ============================================================================

/**
 * GET /api/v1/users/activities
 * Get current user's activities
 */
router.get(
  '/activities',
  requireAuth,
  [
    query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
    query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
    query('type').optional().isString(),
    query('startDate').optional().isISO8601().withMessage('Start date must be a valid ISO 8601 date'),
    query('endDate').optional().isISO8601().withMessage('End date must be a valid ISO 8601 date'),
  ],
  asyncHandler(async (req: AuthRequest, res: Response) => {
    if (!validateRequest(req, res)) return;
    return UserActivityController.getMyActivities(req, res);
  })
);

// ============================================================================
// ROLE MANAGEMENT ROUTES (UserRoleController)
// ============================================================================

/**
 * GET /api/v1/users/roles
 * Get all available roles (public endpoint)
 */
router.get(
  '/roles',
  asyncHandler(async (req: Request, res: Response) => {
    return UserRoleController.getRoles(req, res);
  })
);

// ============================================================================
// ADMIN USER MANAGEMENT ROUTES (UserManagementController)
// ============================================================================

/**
 * GET /api/v1/users
 * List all users (paginated, filtered) - Admin only
 */
router.get(
  '/',
  requireAdmin,
  [
    query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
    query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
    query('search').optional().isString(),
    query('role').optional().isString(),
    query('status').optional().isString(),
    query('sortBy').optional().isString(),
    query('sortOrder').optional().isIn(['asc', 'desc', 'ASC', 'DESC']).withMessage('Sort order must be asc or desc'),
  ],
  asyncHandler(async (req: Request, res: Response) => {
    if (!validateRequest(req, res)) return;
    return UserManagementController.listUsers(req, res);
  })
);

/**
 * GET /api/v1/users/:id
 * Get user by ID - Admin only
 */
router.get(
  '/:id',
  requireAdmin,
  [param('id').isString().notEmpty().withMessage('User ID is required')],
  asyncHandler(async (req: Request, res: Response) => {
    if (!validateRequest(req, res)) return;
    return UserManagementController.getUserById(req, res);
  })
);

/**
 * PUT /api/v1/users/:id
 * Update user - Admin only
 */
router.put(
  '/:id',
  requireAdmin,
  [
    param('id').isString().notEmpty().withMessage('User ID is required'),
    body('name').optional().isString(),
    body('email').optional().isEmail(),
    body('status').optional().isIn(['active', 'inactive', 'suspended', 'pending', 'approved']),
    body('role').optional().isString(),
  ],
  asyncHandler(async (req: Request, res: Response) => {
    if (!validateRequest(req, res)) return;
    return UserManagementController.updateUser(req, res);
  })
);

/**
 * DELETE /api/v1/users/:id
 * Delete user (soft delete) - Admin only
 */
router.delete(
  '/:id',
  requireAdmin,
  [param('id').isString().notEmpty().withMessage('User ID is required')],
  asyncHandler(async (req: Request, res: Response) => {
    if (!validateRequest(req, res)) return;
    return UserManagementController.deleteUser(req, res);
  })
);

// ============================================================================
// ADMIN USER ROLE MANAGEMENT ROUTES (UserRoleController)
// ============================================================================

/**
 * GET /api/v1/users/:userId/roles
 * Get roles for a specific user - Admin only
 */
router.get(
  '/:userId/roles',
  requireAdmin,
  [param('userId').isString().notEmpty().withMessage('User ID is required')],
  asyncHandler(async (req: Request, res: Response) => {
    if (!validateRequest(req, res)) return;
    return UserRoleController.getUserRoles(req, res);
  })
);

/**
 * POST /api/v1/users/:userId/roles
 * Assign a role to a user - Admin only
 */
router.post(
  '/:userId/roles',
  requireAdmin,
  [
    param('userId').isString().notEmpty().withMessage('User ID is required'),
    body('role').isString().notEmpty().withMessage('Role name is required'),
    body('validFrom').optional().isISO8601().withMessage('Valid from must be a valid ISO 8601 date'),
    body('validUntil').optional().isISO8601().withMessage('Valid until must be a valid ISO 8601 date'),
  ],
  asyncHandler(async (req: AuthRequest, res: Response) => {
    if (!validateRequest(req, res)) return;
    return UserRoleController.assignRole(req, res);
  })
);

/**
 * DELETE /api/v1/users/:userId/roles/:roleId
 * Remove a role from a user - Admin only
 */
router.delete(
  '/:userId/roles/:roleId',
  requireAdmin,
  [
    param('userId').isString().notEmpty().withMessage('User ID is required'),
    param('roleId').isString().notEmpty().withMessage('Role ID is required'),
  ],
  asyncHandler(async (req: Request, res: Response) => {
    if (!validateRequest(req, res)) return;
    return UserRoleController.removeRole(req, res);
  })
);

/**
 * PUT /api/v1/users/:userId/roles/:roleId
 * Update role validity period - Admin only
 */
router.put(
  '/:userId/roles/:roleId',
  requireAdmin,
  [
    param('userId').isString().notEmpty().withMessage('User ID is required'),
    param('roleId').isString().notEmpty().withMessage('Role ID is required'),
    body('validFrom').optional().isISO8601().withMessage('Valid from must be a valid ISO 8601 date'),
    body('validUntil').optional().isISO8601().withMessage('Valid until must be a valid ISO 8601 date'),
  ],
  asyncHandler(async (req: Request, res: Response) => {
    if (!validateRequest(req, res)) return;
    return UserRoleController.updateRoleValidity(req, res);
  })
);

// ============================================================================
// ADMIN USER ACTIVITY ROUTES (UserActivityController)
// ============================================================================

/**
 * GET /api/v1/users/:userId/activities
 * Get activities for a specific user - Admin only
 */
router.get(
  '/:userId/activities',
  requireAdmin,
  [
    param('userId').isString().notEmpty().withMessage('User ID is required'),
    query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
    query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
    query('type').optional().isString(),
    query('startDate').optional().isISO8601().withMessage('Start date must be a valid ISO 8601 date'),
    query('endDate').optional().isISO8601().withMessage('End date must be a valid ISO 8601 date'),
  ],
  asyncHandler(async (req: Request, res: Response) => {
    if (!validateRequest(req, res)) return;
    return UserActivityController.getUserActivities(req, res);
  })
);

export default router;

/**
 * Operator Membership Console Routes — Extension Layer
 * WO-O4O-MEMBERSHIP-CONSOLE-V1
 *
 * Core Freeze F10 준수: 기존 admin/users 라우트 미수정
 */
import { Router } from 'express';
import { MembershipConsoleController } from '../../controllers/operator/MembershipConsoleController.js';
import { authenticate } from '../../middleware/auth.middleware.js';
import { requireAnyRole } from '../../middleware/permission.middleware.js';
import { UserRole } from '../../entities/User.js';

const router: Router = Router();
const controller = new MembershipConsoleController();

// All routes require authentication + operator-level role
router.use(authenticate);
router.use(requireAnyRole([UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.OPERATOR, UserRole.MANAGER]));

// Member list with memberships + roles
router.get('/', controller.getMembers);

// Member detail
router.get('/:userId', controller.getMemberDetail);

// Membership approval/rejection
router.patch('/:membershipId/approve', controller.approveMembership);
router.patch('/:membershipId/reject', controller.rejectMembership);

export default router;

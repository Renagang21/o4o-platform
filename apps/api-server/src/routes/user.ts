import { Router, Request } from 'express';
import { UserController } from '../controllers/userController.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { requireAdmin, requireAnyRole } from '../middleware/permission.middleware.js';
import { UserRole } from '../entities/User.js';

const router: Router = Router();
const userController = new UserController();

// 현재 사용자 프로필 조회
router.get('/profile', authenticate, userController.getProfile.bind(userController));

// 비즈니스 정보 업데이트
router.put('/business-info', authenticate, userController.updateBusinessInfo.bind(userController));

// 관리자 전용 라우트
router.get('/', requireAnyRole([UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.MANAGER]), userController.getUsers.bind(userController));
router.put('/:userId/role', requireAdmin, userController.updateUserRole.bind(userController));
router.put('/:userId/suspend', requireAdmin, userController.suspendUser.bind(userController));

export default router;
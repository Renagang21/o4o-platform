import { Router } from 'express';
import { UserController } from '../controllers/userController';
import { authenticateToken, requireAdmin, requireManagerOrAdmin } from '../middleware/auth';

const router: Router = Router();
const userController = new UserController();

// 현재 사용자 프로필 조회
router.get('/profile', authenticateToken, userController.getProfile.bind(userController));

// 비즈니스 정보 업데이트
router.put('/business-info', authenticateToken, userController.updateBusinessInfo.bind(userController));

// 관리자 전용 라우트
router.get('/', requireManagerOrAdmin, userController.getUsers.bind(userController));
router.put('/:userId/role', requireAdmin, userController.updateUserRole.bind(userController));
router.put('/:userId/suspend', requireAdmin, userController.suspendUser.bind(userController));

export default router;
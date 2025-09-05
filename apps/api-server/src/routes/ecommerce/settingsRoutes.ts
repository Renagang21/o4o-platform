import { Router } from 'express';
import { EcommerceSettingsController } from '../../controllers/ecommerce/EcommerceSettingsController';
import { authenticate as authMiddleware } from '../../middleware/auth.middleware';

const router: Router = Router();
const settingsController = new EcommerceSettingsController();

// 인증 미들웨어 적용 (관리자만 접근 가능) - 개발 중에는 임시로 비활성화
// router.use(authMiddleware);

// Settings 엔드포인트
router.get('/settings', settingsController.getSettings.bind(settingsController));
router.put('/settings', settingsController.updateSettings.bind(settingsController));
router.post('/settings', settingsController.updateSettings.bind(settingsController)); // POST도 지원

export default router;
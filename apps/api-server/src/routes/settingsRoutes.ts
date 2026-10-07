import { Router } from 'express';
import { SettingsController } from '../controllers/settingsController.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { requireAdmin } from '../middleware/auth.middleware.js';

const router: Router = Router();
const settingsController = new SettingsController();

// Public endpoints
router.get('/homepage', settingsController.getHomepageSettings.bind(settingsController));
router.get('/general', settingsController.getGeneralSettings.bind(settingsController));
router.get('/customizer', settingsController.getCustomizerSettings.bind(settingsController));
router.get('/header-builder', settingsController.getHeaderBuilder.bind(settingsController));

// OAuth settings endpoints (admin only) - must be before /:type
// WO-O4O-GOOGLE-ONLY-AUTH-CLEANUP-V1: OAuth 설정 endpoint 은퇴.
//   passport 계층 제거로 GOOGLE/KAKAO/NAVER_CLIENT_* 의 소비처가 0이 됐다.
//   GET 은 clientSecret 을 응답에 실어 보내고 PUT 은 저장조차 하지 않는 안내였다.

// Admin only endpoints
router.get('/:type', authenticate, requireAdmin, settingsController.getSettings.bind(settingsController));
router.put('/:type', authenticate, requireAdmin, settingsController.updateSettings.bind(settingsController));
router.post('/initialize', authenticate, requireAdmin, settingsController.initializeSettings.bind(settingsController));
router.post('/header-builder', authenticate, requireAdmin, settingsController.updateHeaderBuilder.bind(settingsController));
router.delete('/customizer', authenticate, requireAdmin, settingsController.deleteCustomizerSettings.bind(settingsController));

export default router;
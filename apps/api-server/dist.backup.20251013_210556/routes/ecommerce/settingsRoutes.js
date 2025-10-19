"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const EcommerceSettingsController_1 = require("../../controllers/ecommerce/EcommerceSettingsController");
const router = (0, express_1.Router)();
const settingsController = new EcommerceSettingsController_1.EcommerceSettingsController();
// 인증 미들웨어 적용 (관리자만 접근 가능) - 개발 중에는 임시로 비활성화
// router.use(authMiddleware);
// Settings 엔드포인트
router.get('/settings', settingsController.getSettings.bind(settingsController));
router.put('/settings', settingsController.updateSettings.bind(settingsController));
router.post('/settings', settingsController.updateSettings.bind(settingsController)); // POST도 지원
exports.default = router;
//# sourceMappingURL=settingsRoutes.js.map
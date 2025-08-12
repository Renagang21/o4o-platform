"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const userController_1 = require("../controllers/userController");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
const userController = new userController_1.UserController();
// 현재 사용자 프로필 조회
router.get('/profile', auth_1.authenticateToken, userController.getProfile.bind(userController));
// 비즈니스 정보 업데이트
router.put('/business-info', auth_1.authenticateToken, userController.updateBusinessInfo.bind(userController));
// 관리자 전용 라우트
router.get('/', auth_1.requireManagerOrAdmin, userController.getUsers.bind(userController));
router.put('/:userId/role', auth_1.requireAdmin, userController.updateUserRole.bind(userController));
router.put('/:userId/suspend', auth_1.requireAdmin, userController.suspendUser.bind(userController));
exports.default = router;
//# sourceMappingURL=user.js.map
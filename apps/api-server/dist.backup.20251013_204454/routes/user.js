"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const userController_1 = require("../controllers/userController");
const auth_middleware_1 = require("../middleware/auth.middleware");
const permission_middleware_1 = require("../middleware/permission.middleware");
const User_1 = require("../entities/User");
const router = (0, express_1.Router)();
const userController = new userController_1.UserController();
// 현재 사용자 프로필 조회
router.get('/profile', auth_middleware_1.authenticate, userController.getProfile.bind(userController));
// 비즈니스 정보 업데이트
router.put('/business-info', auth_middleware_1.authenticate, userController.updateBusinessInfo.bind(userController));
// 관리자 전용 라우트
router.get('/', (0, permission_middleware_1.requireAnyRole)([User_1.UserRole.ADMIN, User_1.UserRole.SUPER_ADMIN, User_1.UserRole.MANAGER]), userController.getUsers.bind(userController));
router.put('/:userId/role', permission_middleware_1.requireAdmin, userController.updateUserRole.bind(userController));
router.put('/:userId/suspend', permission_middleware_1.requireAdmin, userController.suspendUser.bind(userController));
exports.default = router;
//# sourceMappingURL=user.js.map
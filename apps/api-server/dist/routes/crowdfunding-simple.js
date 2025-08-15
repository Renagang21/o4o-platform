"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.crowdfundingSimpleRoutes = void 0;
const express_1 = require("express");
const crowdfundingController_1 = require("../controllers/crowdfundingController");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
exports.crowdfundingSimpleRoutes = router;
// crowdfundingController is already instantiated in the import
// 프로젝트 관련 라우트 (인증 필요)
router.use(auth_1.authenticateToken);
// 공통 라우트 (모든 로그인 사용자)
router.get('/projects', crowdfundingController_1.crowdfundingController.getProjects.bind(crowdfundingController_1.crowdfundingController));
router.get('/projects/:id', crowdfundingController_1.crowdfundingController.getProjectDetails.bind(crowdfundingController_1.crowdfundingController));
router.get('/dashboard/stats', crowdfundingController_1.crowdfundingController.getCreatorDashboard.bind(crowdfundingController_1.crowdfundingController));
// 참여 관련 (Business/Affiliate 사용자만)
router.post('/projects/:id/join', (0, auth_1.requireRole)(['business', 'affiliate']), crowdfundingController_1.crowdfundingController.createBacking.bind(crowdfundingController_1.crowdfundingController));
// router.post('/projects/:id/cancel', requireRole(['business', 'affiliate']), crowdfundingController.cancelParticipation.bind(crowdfundingController));
// router.get('/projects/:id/participation-status', crowdfundingController.getParticipationStatus.bind(crowdfundingController));
// 프로젝트 생성/수정/삭제 (Business 사용자만 - 제품 개발사)
router.post('/projects', (0, auth_1.requireRole)(['business']), crowdfundingController_1.crowdfundingController.createProject.bind(crowdfundingController_1.crowdfundingController));
router.put('/projects/:id', (0, auth_1.requireRole)(['business']), crowdfundingController_1.crowdfundingController.updateProject.bind(crowdfundingController_1.crowdfundingController));
// router.delete('/projects/:id', requireRole(['business']), crowdfundingController.deleteProject.bind(crowdfundingController));
// 관리자 전용 라우트
router.patch('/projects/:id/status', (0, auth_1.requireRole)(['admin']), crowdfundingController_1.crowdfundingController.approveProject.bind(crowdfundingController_1.crowdfundingController));
//# sourceMappingURL=crowdfunding-simple.js.map
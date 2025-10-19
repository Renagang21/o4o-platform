"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const PartnerController_1 = __importDefault(require("../controllers/PartnerController"));
const auth_middleware_1 = require("../middleware/auth.middleware");
const router = (0, express_1.Router)();
const partnerController = new PartnerController_1.default();
// 클릭 추적은 인증 불필요 (공개 엔드포인트)
router.post('/track-click', partnerController.trackClick);
// 나머지는 모두 인증 필요
router.use(auth_middleware_1.authenticate);
// 파트너 신청 및 승인
router.post('/apply', partnerController.applyAsPartner);
router.post('/:id/approve', partnerController.approvePartner);
// 파트너 CRUD
router.get('/:id', partnerController.getPartner);
router.get('/', partnerController.getPartners);
router.put('/:id', partnerController.updatePartner);
// 추천 링크 생성
router.post('/:id/referral-link', partnerController.generateReferralLink);
// 커미션 관련
router.get('/:id/commissions', partnerController.getCommissions);
router.get('/:id/stats', partnerController.getPartnerStats);
// 개인 파트너 정보 (특정 라우트가 먼저 와야 함)
router.get('/me', partnerController.getMyPartnerInfo);
router.get('/me/dashboard', partnerController.getPartnerDashboard);
// 관리자용 기능
router.post('/update-tiers', partnerController.updatePartnerTiers);
router.get('/stats/overview', partnerController.getOverallStats);
exports.default = router;
//# sourceMappingURL=partners.js.map
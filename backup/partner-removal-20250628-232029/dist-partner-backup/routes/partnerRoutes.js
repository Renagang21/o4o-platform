"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.partnerRoutes = void 0;
// src/partner/routes/partnerRoutes.ts
const express_1 = __importDefault(require("express"));
const PartnerService_1 = require("../services/PartnerService");
const connection_1 = require("../database/connection");
const router = express_1.default.Router();
exports.partnerRoutes = router;
// =====================================
// Partner 신청 관련 API
// =====================================
// Partner 신청하기
router.post('/apply', async (req, res) => {
    try {
        const { customer_id, customer_email, customer_name, application_reason, marketing_plan } = req.body;
        // 입력 검증
        if (!customer_id || !customer_email || !customer_name || !application_reason) {
            return res.status(400).json({
                error: 'Missing required fields',
                message: '필수 정보를 모두 입력해주세요.'
            });
        }
        if (application_reason.length < 10) {
            return res.status(400).json({
                error: 'Invalid application reason',
                message: '신청 사유는 최소 10자 이상 입력해주세요.'
            });
        }
        const application = await PartnerService_1.partnerService.createApplication({
            customer_id,
            customer_email,
            customer_name,
            application_reason,
            marketing_plan
        });
        res.status(201).json({
            success: true,
            message: 'Partner 신청이 완료되었습니다.',
            data: application
        });
    }
    catch (error) {
        res.status(400).json({
            error: 'Application failed',
            message: error.message
        });
    }
});
// Partner 신청 상태 확인
router.get('/application/:customerId', async (req, res) => {
    try {
        const { customerId } = req.params;
        const applications = await PartnerService_1.partnerService.getApplications();
        const userApplication = applications.find(app => app.customer_id === customerId);
        if (!userApplication) {
            return res.json({
                success: true,
                data: null,
                message: '신청 내역이 없습니다.'
            });
        }
        res.json({
            success: true,
            data: userApplication
        });
    }
    catch (error) {
        res.status(500).json({
            error: 'Failed to fetch application',
            message: error.message
        });
    }
});
// =====================================
// Partner 프로필 관련 API
// =====================================
// Partner 정보 조회 (코드로)
router.get('/profile/:partnerCode', async (req, res) => {
    try {
        const { partnerCode } = req.params;
        const partner = await PartnerService_1.partnerService.getPartnerByCode(partnerCode);
        if (!partner) {
            return res.status(404).json({
                error: 'Partner not found',
                message: '존재하지 않는 Partner 코드입니다.'
            });
        }
        const stats = await PartnerService_1.partnerService.getPartnerStats(partner.id);
        res.json({
            success: true,
            data: {
                ...partner,
                stats
            }
        });
    }
    catch (error) {
        res.status(500).json({
            error: 'Failed to fetch partner profile',
            message: error.message
        });
    }
});
// Partner 정보 조회 (고객 ID로)
router.get('/profile/customer/:customerId', async (req, res) => {
    try {
        const { customerId } = req.params;
        const partner = await PartnerService_1.partnerService.getPartnerByCustomerId(customerId);
        if (!partner) {
            return res.status(404).json({
                error: 'Partner not found',
                message: '등록되지 않은 Partner입니다.'
            });
        }
        const stats = await PartnerService_1.partnerService.getPartnerStats(partner.id);
        res.json({
            success: true,
            data: {
                ...partner,
                stats
            }
        });
    }
    catch (error) {
        res.status(500).json({
            error: 'Failed to fetch partner profile',
            message: error.message
        });
    }
});
// =====================================
// 링크 생성 API
// =====================================
// Partner 링크 생성
router.post('/generate-link', async (req, res) => {
    try {
        const { partner_code, product_id, base_url } = req.body;
        if (!partner_code) {
            return res.status(400).json({
                error: 'Missing partner code',
                message: 'Partner 코드가 필요합니다.'
            });
        }
        // Partner 존재 확인
        const partner = await PartnerService_1.partnerService.getPartnerByCode(partner_code);
        if (!partner) {
            return res.status(404).json({
                error: 'Partner not found',
                message: '존재하지 않는 Partner 코드입니다.'
            });
        }
        const link = PartnerService_1.partnerService.generatePartnerLink(partner_code, product_id, base_url || 'https://yourstore.com');
        res.json({
            success: true,
            data: {
                link,
                partner_code,
                product_id,
                created_at: new Date().toISOString()
            }
        });
    }
    catch (error) {
        res.status(500).json({
            error: 'Failed to generate link',
            message: error.message
        });
    }
});
// =====================================
// 클릭 추적 API
// =====================================
// 클릭 추적 기록
router.post('/track-click', async (req, res) => {
    try {
        const { partner_code, product_id } = req.body;
        const visitor_ip = req.ip || req.connection.remoteAddress || '';
        const user_agent = req.headers['user-agent'] || '';
        const referrer = req.headers.referer || req.headers.referrer || '';
        const session_id = req.sessionID || `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        if (!partner_code) {
            return res.status(400).json({
                error: 'Missing partner code',
                message: 'Partner 코드가 필요합니다.'
            });
        }
        // Partner 존재 확인
        const partner = await PartnerService_1.partnerService.getPartnerByCode(partner_code);
        if (!partner) {
            return res.status(404).json({
                error: 'Partner not found',
                message: '존재하지 않는 Partner 코드입니다.'
            });
        }
        const click = await PartnerService_1.partnerService.recordClick({
            partner_id: partner.id,
            partner_code,
            product_id,
            visitor_ip,
            user_agent,
            referrer,
            session_id
        });
        res.json({
            success: true,
            message: '클릭이 기록되었습니다.',
            data: click
        });
    }
    catch (error) {
        res.status(500).json({
            error: 'Failed to track click',
            message: error.message
        });
    }
});
// =====================================
// 지급 요청 API
// =====================================
// 지급 요청하기
router.post('/payout-request', async (req, res) => {
    try {
        const { partner_id, request_amount, payment_method, account_info } = req.body;
        if (!partner_id || !request_amount || !payment_method || !account_info) {
            return res.status(400).json({
                error: 'Missing required fields',
                message: '필수 정보를 모두 입력해주세요.'
            });
        }
        const payoutRequest = await PartnerService_1.partnerService.createPayoutRequest({
            partner_id,
            request_amount: parseFloat(request_amount),
            payment_method,
            account_info: JSON.stringify(account_info)
        });
        res.status(201).json({
            success: true,
            message: '지급 요청이 완료되었습니다.',
            data: payoutRequest
        });
    }
    catch (error) {
        res.status(400).json({
            error: 'Payout request failed',
            message: error.message
        });
    }
});
// =====================================
// 관리자 API
// =====================================
// 신청 목록 조회 (관리자)
router.get('/admin/applications', async (req, res) => {
    try {
        const { status } = req.query;
        const applications = await PartnerService_1.partnerService.getApplications(status);
        res.json({
            success: true,
            data: applications,
            count: applications.length
        });
    }
    catch (error) {
        res.status(500).json({
            error: 'Failed to fetch applications',
            message: error.message
        });
    }
});
// 신청 승인 (관리자)
router.post('/admin/applications/:id/approve', async (req, res) => {
    try {
        const { id } = req.params;
        const { reviewer_id, notes } = req.body;
        const partner = await PartnerService_1.partnerService.approveApplication(parseInt(id), reviewer_id || 'admin', notes);
        res.json({
            success: true,
            message: 'Partner 신청이 승인되었습니다.',
            data: partner
        });
    }
    catch (error) {
        res.status(400).json({
            error: 'Approval failed',
            message: error.message
        });
    }
});
// 신청 거부 (관리자)
router.post('/admin/applications/:id/reject', async (req, res) => {
    try {
        const { id } = req.params;
        const { reviewer_id, reason } = req.body;
        if (!reason) {
            return res.status(400).json({
                error: 'Missing rejection reason',
                message: '거부 사유를 입력해주세요.'
            });
        }
        const application = await PartnerService_1.partnerService.rejectApplication(parseInt(id), reviewer_id || 'admin', reason);
        res.json({
            success: true,
            message: 'Partner 신청이 거부되었습니다.',
            data: application
        });
    }
    catch (error) {
        res.status(400).json({
            error: 'Rejection failed',
            message: error.message
        });
    }
});
// Partner 목록 조회 (관리자)
router.get('/admin/partners', async (req, res) => {
    try {
        const { status } = req.query;
        const partners = await PartnerService_1.partnerService.getPartners(status);
        res.json({
            success: true,
            data: partners,
            count: partners.length
        });
    }
    catch (error) {
        res.status(500).json({
            error: 'Failed to fetch partners',
            message: error.message
        });
    }
});
// 지급 요청 목록 조회 (관리자)
router.get('/admin/payout-requests', async (req, res) => {
    try {
        const { status } = req.query;
        const requests = await PartnerService_1.partnerService.getPayoutRequests(status);
        res.json({
            success: true,
            data: requests,
            count: requests.length
        });
    }
    catch (error) {
        res.status(500).json({
            error: 'Failed to fetch payout requests',
            message: error.message
        });
    }
});
// 시스템 통계 조회 (관리자)
router.get('/admin/stats', async (req, res) => {
    try {
        const stats = await (0, connection_1.getDatabaseStats)();
        res.json({
            success: true,
            data: stats
        });
    }
    catch (error) {
        res.status(500).json({
            error: 'Failed to fetch stats',
            message: error.message
        });
    }
});

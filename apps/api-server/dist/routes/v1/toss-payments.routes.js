"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const TossPaymentsService_1 = require("../../services/TossPaymentsService");
const auth_1 = require("../../middleware/auth");
const connection_1 = require("../../database/connection");
const Order_1 = require("../../entities/Order");
const simpleLogger_1 = __importDefault(require("../../utils/simpleLogger"));
const router = (0, express_1.Router)();
const orderRepository = connection_1.AppDataSource.getRepository(Order_1.Order);
/**
 * 결제 요청 생성
 * POST /api/v1/payments/toss/create
 */
router.post('/payments/toss/create', auth_1.authenticateToken, async (req, res) => {
    var _a, _b, _c, _d;
    try {
        const { orderId, successUrl, failUrl } = req.body;
        const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
        // 주문 조회 및 검증
        const order = await orderRepository.findOne({
            where: { id: orderId, userId },
            relations: ['items', 'items.product']
        });
        if (!order) {
            return res.status(404).json({
                success: false,
                error: '주문을 찾을 수 없습니다'
            });
        }
        if (order.paymentStatus === 'paid') {
            return res.status(400).json({
                success: false,
                error: '이미 결제된 주문입니다'
            });
        }
        // 결제 요청 생성
        const payment = await TossPaymentsService_1.tossPaymentsService.createPayment({
            amount: order.totalAmount,
            orderId: order.id,
            orderName: `주문 #${order.orderNumber}`,
            customerName: ((_b = order.billing) === null || _b === void 0 ? void 0 : _b.firstName) + ' ' + ((_c = order.billing) === null || _c === void 0 ? void 0 : _c.lastName),
            customerEmail: (_d = order.billing) === null || _d === void 0 ? void 0 : _d.email,
            successUrl: successUrl || `${process.env.FRONTEND_URL}/payment/success`,
            failUrl: failUrl || `${process.env.FRONTEND_URL}/payment/fail`
        });
        res.json(payment);
    }
    catch (error) {
        simpleLogger_1.default.error('Payment creation failed:', error);
        res.status(500).json({
            success: false,
            error: error.message || '결제 요청 생성 실패'
        });
    }
});
/**
 * 결제 승인
 * POST /api/v1/payments/toss/confirm
 */
router.post('/payments/toss/confirm', async (req, res) => {
    var _a, _b, _c, _d;
    try {
        const { paymentKey, orderId, amount } = req.body;
        if (!paymentKey || !orderId || !amount) {
            return res.status(400).json({
                success: false,
                error: '필수 파라미터가 누락되었습니다'
            });
        }
        const result = await TossPaymentsService_1.tossPaymentsService.confirmPayment({
            paymentKey,
            orderId,
            amount
        });
        res.json(result);
    }
    catch (error) {
        simpleLogger_1.default.error('Payment confirmation failed:', error);
        const errorCode = (_b = (_a = error.response) === null || _a === void 0 ? void 0 : _a.data) === null || _b === void 0 ? void 0 : _b.code;
        const errorMessage = ((_d = (_c = error.response) === null || _c === void 0 ? void 0 : _c.data) === null || _d === void 0 ? void 0 : _d.message) || error.message;
        res.status(400).json({
            success: false,
            error: errorMessage,
            code: errorCode
        });
    }
});
/**
 * 결제 취소
 * POST /api/v1/payments/toss/cancel
 */
router.post('/payments/toss/cancel', auth_1.authenticateToken, async (req, res) => {
    var _a;
    try {
        const { paymentKey, cancelReason, cancelAmount } = req.body;
        const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
        if (!paymentKey || !cancelReason) {
            return res.status(400).json({
                success: false,
                error: '필수 파라미터가 누락되었습니다'
            });
        }
        // 권한 확인 (주문 소유자 또는 관리자)
        // TODO: 실제 권한 체크 로직 구현
        const result = await TossPaymentsService_1.tossPaymentsService.cancelPayment(paymentKey, cancelReason, cancelAmount);
        res.json(result);
    }
    catch (error) {
        simpleLogger_1.default.error('Payment cancellation failed:', error);
        res.status(500).json({
            success: false,
            error: error.message || '결제 취소 실패'
        });
    }
});
/**
 * 결제 조회
 * GET /api/v1/payments/toss/:paymentKey
 */
router.get('/payments/toss/:paymentKey', auth_1.authenticateToken, async (req, res) => {
    try {
        const { paymentKey } = req.params;
        const result = await TossPaymentsService_1.tossPaymentsService.getPayment(paymentKey);
        res.json(result);
    }
    catch (error) {
        simpleLogger_1.default.error('Payment query failed:', error);
        res.status(500).json({
            success: false,
            error: error.message || '결제 조회 실패'
        });
    }
});
/**
 * 토스페이먼츠 웹훅
 * POST /api/v1/payments/toss/webhook
 */
router.post('/payments/toss/webhook', async (req, res) => {
    try {
        const signature = req.headers['toss-signature'];
        const timestamp = req.headers['toss-timestamp'];
        if (!signature || !timestamp) {
            return res.status(400).json({
                success: false,
                error: 'Missing webhook headers'
            });
        }
        await TossPaymentsService_1.tossPaymentsService.handleWebhook(signature, timestamp, req.body);
        // 토스페이먼츠는 200 OK 응답을 기대
        res.status(200).json({ success: true });
    }
    catch (error) {
        simpleLogger_1.default.error('Webhook processing failed:', error);
        // 웹훅 처리 실패 시에도 200 반환 (재시도 방지)
        // 에러는 로깅하고 별도로 처리
        res.status(200).json({
            success: false,
            error: error.message
        });
    }
});
/**
 * 결제 성공 콜백 페이지
 * GET /api/v1/payments/toss/success
 */
router.get('/payments/toss/success', async (req, res) => {
    try {
        const { paymentKey, orderId, amount } = req.query;
        // 결제 승인 처리
        const result = await TossPaymentsService_1.tossPaymentsService.confirmPayment({
            paymentKey: paymentKey,
            orderId: orderId,
            amount: Number(amount)
        });
        // 프론트엔드 성공 페이지로 리다이렉트
        res.redirect(`${process.env.FRONTEND_URL}/payment/complete?orderId=${orderId}`);
    }
    catch (error) {
        simpleLogger_1.default.error('Payment success callback failed:', error);
        // 실패 페이지로 리다이렉트
        res.redirect(`${process.env.FRONTEND_URL}/payment/fail?error=${encodeURIComponent(error.message)}`);
    }
});
/**
 * 결제 실패 콜백 페이지
 * GET /api/v1/payments/toss/fail
 */
router.get('/payments/toss/fail', async (req, res) => {
    const { code, message, orderId } = req.query;
    simpleLogger_1.default.info('Payment failed callback:', { code, message, orderId });
    // 프론트엔드 실패 페이지로 리다이렉트
    res.redirect(`${process.env.FRONTEND_URL}/payment/fail?code=${code}&message=${encodeURIComponent(message)}`);
});
/**
 * 정산 조회 (관리자용)
 * GET /api/v1/payments/toss/settlements
 */
router.get('/payments/toss/settlements', auth_1.authenticateToken, async (req, res) => {
    var _a;
    try {
        const userRole = (_a = req.user) === null || _a === void 0 ? void 0 : _a.role;
        // 관리자만 접근 가능
        if (userRole !== 'admin' && userRole !== 'super_admin') {
            return res.status(403).json({
                success: false,
                error: '권한이 없습니다'
            });
        }
        const { date } = req.query;
        if (!date) {
            return res.status(400).json({
                success: false,
                error: '날짜를 입력해주세요 (YYYY-MM-DD)'
            });
        }
        const result = await TossPaymentsService_1.tossPaymentsService.getSettlements(date);
        res.json(result);
    }
    catch (error) {
        simpleLogger_1.default.error('Settlement query failed:', error);
        res.status(500).json({
            success: false,
            error: error.message || '정산 조회 실패'
        });
    }
});
exports.default = router;
//# sourceMappingURL=toss-payments.routes.js.map
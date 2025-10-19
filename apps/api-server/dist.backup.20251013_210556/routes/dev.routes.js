"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const productSeederController_1 = __importDefault(require("../controllers/dev/productSeederController"));
const router = (0, express_1.Router)();
/**
 * Development Routes - 개발 환경에서만 사용
 *
 * 보안 주의사항:
 * 1. 이 라우트는 반드시 개발 환경에서만 활성화되어야 함
 * 2. 프로덕션 배포 시 자동으로 비활성화됨
 * 3. 추가적인 인증 헤더 검증 권장
 */
// 개발 환경 체크 미들웨어
const devOnlyMiddleware = (req, res, next) => {
    if (process.env.NODE_ENV === 'production') {
        return res.status(404).json({
            success: false,
            message: 'Not found'
        });
    }
    // 추가 보안: 개발 키 확인 (선택적)
    const devKey = req.headers['x-dev-key'];
    if (process.env.DEV_KEY && devKey !== process.env.DEV_KEY) {
        return res.status(401).json({
            success: false,
            message: 'Unauthorized'
        });
    }
    next();
};
// 모든 개발 라우트에 미들웨어 적용
router.use(devOnlyMiddleware);
/**
 * @swagger
 * /api/v1/dev/seed-product:
 *   post:
 *     summary: 단일 테스트 상품 생성
 *     description: 랜덤한 테스트 상품 1개를 생성합니다 (개발 환경 전용)
 *     tags: [Development]
 *     responses:
 *       200:
 *         description: 상품 생성 성공
 *       403:
 *         description: 프로덕션 환경에서는 사용 불가
 */
router.post('/seed-product', productSeederController_1.default.seedSingleProduct.bind(productSeederController_1.default));
/**
 * @swagger
 * /api/v1/dev/seed-products:
 *   post:
 *     summary: 다량의 테스트 상품 생성
 *     description: 지정된 수만큼 테스트 상품을 생성합니다 (최대 50개)
 *     tags: [Development]
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               count:
 *                 type: number
 *                 default: 50
 *                 description: 생성할 상품 수
 *     responses:
 *       200:
 *         description: 상품 생성 성공
 *       403:
 *         description: 프로덕션 환경에서는 사용 불가
 */
router.post('/seed-products', productSeederController_1.default.seedMultipleProducts.bind(productSeederController_1.default));
/**
 * @swagger
 * /api/v1/dev/check-products:
 *   get:
 *     summary: 생성된 상품 확인
 *     description: 현재 생성된 상품 목록과 구조를 확인합니다
 *     tags: [Development]
 *     responses:
 *       200:
 *         description: 상품 목록 조회 성공
 */
router.get('/check-products', productSeederController_1.default.checkProducts.bind(productSeederController_1.default));
/**
 * @swagger
 * /api/v1/dev/clear-products:
 *   delete:
 *     summary: 테스트 상품 모두 삭제
 *     description: Seeder로 생성된 모든 테스트 상품을 삭제합니다
 *     tags: [Development]
 *     responses:
 *       200:
 *         description: 상품 삭제 성공
 *       403:
 *         description: 프로덕션 환경에서는 사용 불가
 */
router.delete('/clear-products', productSeederController_1.default.clearProducts.bind(productSeederController_1.default));
/**
 * @swagger
 * /api/v1/dev/health:
 *   get:
 *     summary: 개발 API 상태 확인
 *     description: 개발 API가 정상 작동하는지 확인합니다
 *     tags: [Development]
 *     responses:
 *       200:
 *         description: API 정상 작동
 */
router.get('/health', (req, res) => {
    res.json({
        success: true,
        message: 'Development API is running',
        environment: process.env.NODE_ENV,
        timestamp: new Date().toISOString(),
        features: {
            productSeeder: true,
            dataValidation: true,
            mockData: true
        }
    });
});
exports.default = router;
//# sourceMappingURL=dev.routes.js.map
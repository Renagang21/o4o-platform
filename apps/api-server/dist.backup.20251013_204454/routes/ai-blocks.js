"use strict";
/**
 * AI Blocks API Routes
 * AI 페이지 생성을 위한 블록 정보 제공 (SSOT)
 * 인증 필수 - 읽기 권한 보유자만 접근 가능
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const block_registry_service_1 = require("../services/block-registry.service");
const auth_middleware_1 = require("../middleware/auth.middleware");
const rateLimit_middleware_1 = require("../middleware/rateLimit.middleware");
const logger_1 = __importDefault(require("../utils/logger"));
const router = (0, express_1.Router)();
// AI 엔드포인트용 레이트리밋 (읽기 전용이므로 관대한 한도)
const aiReadRateLimit = (0, rateLimit_middleware_1.rateLimitMiddleware)({
    windowMs: 60 * 1000, // 1분
    max: 60, // 분당 60회
    message: 'AI 참조 데이터 요청이 너무 많습니다. 잠시 후 다시 시도해주세요.',
    keyGenerator: (req) => {
        var _a;
        const authReq = req;
        return ((_a = authReq.user) === null || _a === void 0 ? void 0 : _a.userId) || req.ip || 'anonymous';
    }
});
/**
 * AI를 위한 블록 참조 데이터 (SSOT)
 * GET /api/ai/blocks/reference
 * 인증 필수 + 레이트리밋 적용
 */
router.get('/reference', auth_middleware_1.authenticate, aiReadRateLimit, async (req, res) => {
    var _a, _b, _c, _d, _e, _f;
    const authReq = req;
    const startTime = Date.now();
    try {
        const reference = block_registry_service_1.blockRegistry.getAIReference();
        const etag = `"${Buffer.from(reference.lastUpdated).toString('base64')}"`;
        // ETag 검증 (304 Not Modified)
        const clientEtag = req.headers['if-none-match'];
        if (clientEtag === etag) {
            const duration = Date.now() - startTime;
            // Operational logging
            logger_1.default.info('AI blocks reference - 304 Not Modified', {
                userId: (_a = authReq.user) === null || _a === void 0 ? void 0 : _a.userId,
                userEmail: (_b = authReq.user) === null || _b === void 0 ? void 0 : _b.email,
                route: '/api/ai/blocks/reference',
                method: 'GET',
                status: 304,
                etag: etag,
                duration: `${duration}ms`,
                timestamp: new Date().toISOString()
            });
            return res.status(304).set({
                'Cache-Control': 'public, max-age=300',
                'ETag': etag
            }).end();
        }
        // 응답 헤더 설정 (캐싱)
        res.set({
            'Cache-Control': 'public, max-age=300', // 5분 캐싱
            'ETag': etag
        });
        const duration = Date.now() - startTime;
        // Operational logging
        logger_1.default.info('AI blocks reference - Success', {
            userId: (_c = authReq.user) === null || _c === void 0 ? void 0 : _c.userId,
            userEmail: (_d = authReq.user) === null || _d === void 0 ? void 0 : _d.email,
            route: '/api/ai/blocks/reference',
            method: 'GET',
            status: 200,
            etag: etag,
            schemaVersion: reference.schemaVersion,
            totalBlocks: reference.total,
            duration: `${duration}ms`,
            timestamp: new Date().toISOString()
        });
        res.json({
            success: true,
            data: reference,
            meta: {
                version: '1.0.0',
                generatedAt: new Date().toISOString()
            }
        });
    }
    catch (error) {
        const duration = Date.now() - startTime;
        logger_1.default.error('AI block reference error', {
            userId: (_e = authReq.user) === null || _e === void 0 ? void 0 : _e.userId,
            userEmail: (_f = authReq.user) === null || _f === void 0 ? void 0 : _f.email,
            route: '/api/ai/blocks/reference',
            method: 'GET',
            status: 500,
            error: error.message,
            duration: `${duration}ms`,
            timestamp: new Date().toISOString()
        });
        res.status(500).json({
            success: false,
            error: 'Failed to fetch block reference',
            message: error.message
        });
    }
});
/**
 * AI용 간소화된 블록 목록
 * GET /api/ai/blocks/simple
 * 인증 필수 + 레이트리밋 적용
 */
router.get('/simple', auth_middleware_1.authenticate, aiReadRateLimit, async (req, res) => {
    try {
        const { category, limit } = req.query;
        let blocks = block_registry_service_1.blockRegistry.getAll();
        // 카테고리 필터
        if (category) {
            blocks = block_registry_service_1.blockRegistry.getByCategory(category);
        }
        // 개수 제한
        if (limit) {
            const limitNum = parseInt(limit);
            blocks = blocks.slice(0, limitNum);
        }
        // AI용 간소화된 형태로 변환
        const simpleBlocks = blocks.map(block => {
            var _a;
            return ({
                name: block.name,
                title: block.title,
                description: block.description,
                category: block.category,
                exampleJson: block.example.json,
                commonUse: ((_a = block.aiPrompts) === null || _a === void 0 ? void 0 : _a[0]) || block.description
            });
        });
        res.json({
            success: true,
            data: {
                blocks: simpleBlocks,
                total: simpleBlocks.length,
                filtered: !!category || !!limit
            }
        });
    }
    catch (error) {
        logger_1.default.error('AI simple blocks error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch simple blocks',
            message: error.message
        });
    }
});
/**
 * 블록 검색
 * GET /api/ai/blocks/search?q=query
 * 인증 필수 + 레이트리밋 적용
 */
router.get('/search', auth_middleware_1.authenticate, aiReadRateLimit, async (req, res) => {
    try {
        const { q: query } = req.query;
        if (!query || typeof query !== 'string') {
            return res.status(400).json({
                success: false,
                error: 'Search query is required'
            });
        }
        const results = block_registry_service_1.blockRegistry.search(query);
        res.json({
            success: true,
            data: {
                query,
                results: results.map(block => ({
                    name: block.name,
                    title: block.title,
                    description: block.description,
                    category: block.category,
                    example: block.example,
                    relevantPrompts: block.aiPrompts || []
                })),
                total: results.length
            }
        });
    }
    catch (error) {
        logger_1.default.error('Block search error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to search blocks',
            message: error.message
        });
    }
});
/**
 * Registry 통계
 * GET /api/ai/blocks/stats
 * 인증 필수 + 레이트리밋 적용
 */
router.get('/stats', auth_middleware_1.authenticate, aiReadRateLimit, async (req, res) => {
    try {
        const stats = block_registry_service_1.blockRegistry.getStats();
        res.json({
            success: true,
            data: stats
        });
    }
    catch (error) {
        logger_1.default.error('Block stats error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch block statistics',
            message: error.message
        });
    }
});
/**
 * 블록 상세 정보
 * GET /api/ai/blocks/:name
 * 인증 필수 + 레이트리밋 적용
 */
router.get('/:name', auth_middleware_1.authenticate, aiReadRateLimit, async (req, res) => {
    try {
        const { name } = req.params;
        const block = block_registry_service_1.blockRegistry.get(name);
        if (!block) {
            return res.status(404).json({
                success: false,
                error: 'Block not found',
                message: `Block "${name}" does not exist`
            });
        }
        res.json({
            success: true,
            data: {
                ...block,
                attributeCount: Object.keys(block.attributes).length
            }
        });
    }
    catch (error) {
        logger_1.default.error('Block detail error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch block details',
            message: error.message
        });
    }
});
exports.default = router;
//# sourceMappingURL=ai-blocks.js.map
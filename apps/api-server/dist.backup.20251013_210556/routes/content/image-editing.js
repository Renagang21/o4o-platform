"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const ImageEditingController_1 = require("../../controllers/content/ImageEditingController");
const auth_middleware_1 = require("../../middleware/auth.middleware");
// Simple role guard for now - replace with actual implementation
const roleGuard = (roles) => (req, res, next) => {
    // For now, allow all authenticated users
    next();
};
const router = (0, express_1.Router)();
const imageEditingController = new ImageEditingController_1.ImageEditingController();
// Apply authentication to all routes
router.use(auth_middleware_1.authenticate);
/**
 * Image Editing API Routes
 *
 * POST   /api/cms/media/images/resize        - 이미지 리사이징
 * POST   /api/cms/media/images/crop          - 이미지 크롭
 * POST   /api/cms/media/images/rotate        - 이미지 회전
 * POST   /api/cms/media/images/watermark     - 워터마크 추가
 * POST   /api/cms/media/images/optimize      - 이미지 최적화
 * GET    /api/cms/media/images/:id/analysis  - 이미지 분석 (보너스)
 * POST   /api/cms/media/images/batch-optimize - 일괄 최적화 (보너스)
 * POST   /api/cms/media/images/generate-responsive - 반응형 이미지 생성 (보너스)
 */
// POST /api/cms/media/images/resize - 이미지 리사이징
// Requires: contributor, author, editor, or admin role
router.post('/resize', roleGuard(['contributor', 'author', 'editor', 'admin']), imageEditingController.resizeImage);
// POST /api/cms/media/images/crop - 이미지 크롭
// Requires: contributor, author, editor, or admin role
router.post('/crop', roleGuard(['contributor', 'author', 'editor', 'admin']), imageEditingController.cropImage);
// POST /api/cms/media/images/rotate - 이미지 회전
// Requires: contributor, author, editor, or admin role
router.post('/rotate', roleGuard(['contributor', 'author', 'editor', 'admin']), imageEditingController.rotateImage);
// POST /api/cms/media/images/watermark - 워터마크 추가
// Requires: contributor, author, editor, or admin role
router.post('/watermark', roleGuard(['contributor', 'author', 'editor', 'admin']), imageEditingController.addWatermark);
// POST /api/cms/media/images/optimize - 이미지 최적화
// Requires: contributor, author, editor, or admin role
router.post('/optimize', roleGuard(['contributor', 'author', 'editor', 'admin']), imageEditingController.optimizeImage);
// Bonus endpoints
// GET /api/cms/media/images/:id/analysis - 이미지 분석
// Requires: contributor, author, editor, or admin role
router.get('/:id/analysis', roleGuard(['contributor', 'author', 'editor', 'admin']), imageEditingController.getImageAnalysis);
// POST /api/cms/media/images/batch-optimize - 일괄 최적화
// Requires: editor or admin role (more resource intensive)
router.post('/batch-optimize', roleGuard(['editor', 'admin']), imageEditingController.batchOptimizeImages);
// POST /api/cms/media/images/generate-responsive - 반응형 이미지 생성
// Requires: editor or admin role (more resource intensive)
router.post('/generate-responsive', roleGuard(['editor', 'admin']), imageEditingController.generateResponsiveImages);
exports.default = router;
//# sourceMappingURL=image-editing.js.map
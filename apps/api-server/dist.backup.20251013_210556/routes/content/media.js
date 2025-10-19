"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const MediaController_1 = require("../../controllers/content/MediaController");
const auth_middleware_1 = require("../../middleware/auth.middleware");
// Simple role guard for now - replace with actual implementation
const roleGuard = (roles) => (req, res, next) => {
    // For now, allow all authenticated users
    next();
};
const upload_middleware_1 = require("../../middleware/upload.middleware");
const router = (0, express_1.Router)();
const mediaController = new MediaController_1.MediaController();
// Apply authentication to all routes
router.use(auth_middleware_1.authenticate);
/**
 * Media API Routes
 *
 * POST   /api/media/upload              - 파일 업로드
 * GET    /api/media                     - 미디어 목록
 * GET    /api/media/:id                 - 미디어 상세
 * PUT    /api/media/:id                 - 미디어 정보 수정
 * DELETE /api/media/:id                 - 미디어 삭제
 */
// POST /api/media/upload - 파일 업로드 (다중 파일 지원)
// Requires: contributor, author, editor, or admin role
router.post('/upload', roleGuard(['contributor', 'author', 'editor', 'admin']), (0, upload_middleware_1.uploadMiddleware)('files', 10), // Allow up to 10 files
mediaController.uploadMedia);
// GET /api/media - 미디어 목록
// Requires: contributor, author, editor, or admin role
router.get('/', roleGuard(['contributor', 'author', 'editor', 'admin']), mediaController.getMedia);
// GET /api/media/:id - 미디어 상세
// Requires: contributor, author, editor, or admin role
router.get('/:id', roleGuard(['contributor', 'author', 'editor', 'admin']), mediaController.getMediaById);
// PUT /api/media/:id - 미디어 정보 수정
// Requires: author (own media), editor (all media), or admin
router.put('/:id', roleGuard(['author', 'editor', 'admin']), mediaController.updateMedia);
// DELETE /api/media/:id - 미디어 삭제
// Requires: author (own media), editor (all media), or admin
router.delete('/:id', roleGuard(['author', 'editor', 'admin']), mediaController.deleteMedia);
exports.default = router;
//# sourceMappingURL=media.js.map
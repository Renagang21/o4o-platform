"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const PostController_1 = require("../../controllers/content/PostController");
const auth_middleware_1 = require("../../middleware/auth.middleware");
// Simple role guard for now - replace with actual implementation
const roleGuard = (roles) => (req, res, next) => {
    // For now, allow all authenticated users
    next();
};
const router = (0, express_1.Router)();
const postController = new PostController_1.PostController();
/**
 * Posts API Routes
 *
 * GET    /api/posts                     - 게시글 목록 조회 (공개: published만, 인증: 모든 상태)
 * GET    /api/posts/:id                 - 게시글 상세 조회 (공개: published만, 인증: 모든 상태)
 * POST   /api/posts                     - 게시글 생성 (인증 필요)
 * PUT    /api/posts/:id                 - 게시글 수정 (인증 필요)
 * DELETE /api/posts/:id                 - 게시글 삭제 (인증 필요)
 * POST   /api/posts/:id/restore         - 휴지통 복원 (인증 필요)
 * POST   /api/posts/bulk                - 일괄 작업 (인증 필요)
 * GET    /api/posts/:id/revisions       - 수정 이력 (인증 필요)
 * POST   /api/posts/:id/revisions/:revisionId - 리비전 복원 (인증 필요)
 * POST   /api/posts/:id/autosave        - 자동 저장 (인증 필요)
 * GET    /api/posts/:id/preview         - 미리보기 (인증 필요)
 * POST   /api/posts/:id/duplicate       - 게시글 복제 (인증 필요)
 */
// Conditional authentication middleware
const conditionalAuth = (req, res, next) => {
    // Allow public access to published posts only
    const allowPublicAccess = req.method === 'GET';
    if (allowPublicAccess) {
        // For GET requests, continue without authentication
        // The controller will filter based on published status
        return next();
    }
    else {
        // For non-GET requests, require authentication
        return (0, auth_middleware_1.authenticate)(req, res, next);
    }
};
// GET /api/posts - 게시글 목록 조회 (공개 접근 허용)
router.get('/', conditionalAuth, postController.getPosts);
// GET /api/posts/:id - 게시글 상세 조회 (공개 접근 허용)
router.get('/:id', conditionalAuth, postController.getPost);
// POST /api/posts - 게시글 생성 (인증 필요)
// Requires: contributor, author, editor, or admin role
router.post('/', auth_middleware_1.authenticate, roleGuard(['contributor', 'author', 'editor', 'admin']), postController.createPost);
// PUT /api/posts/:id - 게시글 수정 (인증 필요)
// Requires: contributor (own posts), author (own posts), editor (all posts), or admin
router.put('/:id', auth_middleware_1.authenticate, roleGuard(['contributor', 'author', 'editor', 'admin']), postController.updatePost);
// DELETE /api/posts/:id - 게시글 삭제 (인증 필요)
// Requires: author (own posts), editor (all posts), or admin
router.delete('/:id', auth_middleware_1.authenticate, roleGuard(['author', 'editor', 'admin']), postController.deletePost);
// POST /api/posts/:id/restore - 휴지통 복원 (인증 필요)
// Requires: author (own posts), editor (all posts), or admin
router.post('/:id/restore', auth_middleware_1.authenticate, roleGuard(['author', 'editor', 'admin']), postController.restorePost);
// POST /api/posts/bulk - 일괄 작업 (인증 필요)
// Requires: editor or admin role
router.post('/bulk', auth_middleware_1.authenticate, roleGuard(['editor', 'admin']), postController.bulkAction);
// GET /api/posts/:id/revisions - 수정 이력 (인증 필요)
// Requires: contributor (own posts), author (own posts), editor (all posts), or admin
router.get('/:id/revisions', auth_middleware_1.authenticate, roleGuard(['contributor', 'author', 'editor', 'admin']), postController.getRevisions);
// POST /api/posts/:id/revisions/:revisionId - 리비전 복원 (인증 필요)
// Requires: author (own posts), editor (all posts), or admin
router.post('/:id/revisions/:revisionId', auth_middleware_1.authenticate, roleGuard(['author', 'editor', 'admin']), postController.restoreRevision);
// POST /api/posts/:id/autosave - 자동 저장 (인증 필요)
// Requires: contributor (own posts), author (own posts), editor (all posts), or admin
router.post('/:id/autosave', auth_middleware_1.authenticate, roleGuard(['contributor', 'author', 'editor', 'admin']), postController.autoSave);
// GET /api/posts/:id/preview - 미리보기 (인증 필요)
// Requires: contributor (own posts), author (own posts), editor (all posts), or admin
router.get('/:id/preview', auth_middleware_1.authenticate, roleGuard(['contributor', 'author', 'editor', 'admin']), postController.getPreview);
// POST /api/posts/:id/duplicate - 게시글 복제 (인증 필요)
// Requires: contributor, author, editor, or admin role
router.post('/:id/duplicate', auth_middleware_1.authenticate, roleGuard(['contributor', 'author', 'editor', 'admin']), postController.duplicatePost);
exports.default = router;
//# sourceMappingURL=posts.js.map
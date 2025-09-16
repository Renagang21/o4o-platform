import { Router, RequestHandler } from 'express';
import { PostController } from '../../controllers/content/PostController';
import { authenticateToken } from '../../middleware/auth';
// Simple role guard for now - replace with actual implementation
const roleGuard = (roles: string[]) => (req: any, res: any, next: any) => {
  // For now, allow all authenticated users
  next();
};

const router: Router = Router();
const postController = new PostController();

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
const conditionalAuth = (req: any, res: any, next: any) => {
  // Allow public access to published posts only
  const allowPublicAccess = req.method === 'GET';
  
  if (allowPublicAccess) {
    // For GET requests, continue without authentication
    // The controller will filter based on published status
    return next();
  } else {
    // For non-GET requests, require authentication
    return authenticateToken(req, res, next);
  }
};

// GET /api/posts - 게시글 목록 조회 (공개 접근 허용)
router.get('/', conditionalAuth, postController.getPosts);

// GET /api/posts/:id - 게시글 상세 조회 (공개 접근 허용)
router.get('/:id', conditionalAuth, postController.getPost);

// POST /api/posts - 게시글 생성 (인증 필요)
// Requires: contributor, author, editor, or admin role
router.post('/', 
  authenticateToken,
  roleGuard(['contributor', 'author', 'editor', 'admin']),
  postController.createPost
);

// PUT /api/posts/:id - 게시글 수정 (인증 필요)
// Requires: contributor (own posts), author (own posts), editor (all posts), or admin
router.put('/:id', 
  authenticateToken,
  roleGuard(['contributor', 'author', 'editor', 'admin']),
  postController.updatePost
);

// DELETE /api/posts/:id - 게시글 삭제 (인증 필요)
// Requires: author (own posts), editor (all posts), or admin
router.delete('/:id', 
  authenticateToken,
  roleGuard(['author', 'editor', 'admin']),
  postController.deletePost
);

// POST /api/posts/:id/restore - 휴지통 복원 (인증 필요)
// Requires: author (own posts), editor (all posts), or admin
router.post('/:id/restore', 
  authenticateToken,
  roleGuard(['author', 'editor', 'admin']),
  postController.restorePost
);

// POST /api/posts/bulk - 일괄 작업 (인증 필요)
// Requires: editor or admin role
router.post('/bulk', 
  authenticateToken,
  roleGuard(['editor', 'admin']),
  postController.bulkAction
);

// GET /api/posts/:id/revisions - 수정 이력 (인증 필요)
// Requires: contributor (own posts), author (own posts), editor (all posts), or admin
router.get('/:id/revisions', 
  authenticateToken,
  roleGuard(['contributor', 'author', 'editor', 'admin']),
  postController.getRevisions
);

// POST /api/posts/:id/revisions/:revisionId - 리비전 복원 (인증 필요)
// Requires: author (own posts), editor (all posts), or admin
router.post('/:id/revisions/:revisionId', 
  authenticateToken,
  roleGuard(['author', 'editor', 'admin']),
  postController.restoreRevision
);

// POST /api/posts/:id/autosave - 자동 저장 (인증 필요)
// Requires: contributor (own posts), author (own posts), editor (all posts), or admin
router.post('/:id/autosave', 
  authenticateToken,
  roleGuard(['contributor', 'author', 'editor', 'admin']),
  postController.autoSave
);

// GET /api/posts/:id/preview - 미리보기 (인증 필요)
// Requires: contributor (own posts), author (own posts), editor (all posts), or admin
router.get('/:id/preview', 
  authenticateToken,
  roleGuard(['contributor', 'author', 'editor', 'admin']),
  postController.getPreview
);

// POST /api/posts/:id/duplicate - 게시글 복제 (인증 필요)
// Requires: contributor, author, editor, or admin role
router.post('/:id/duplicate', 
  authenticateToken,
  roleGuard(['contributor', 'author', 'editor', 'admin']),
  postController.duplicatePost
);

export default router;
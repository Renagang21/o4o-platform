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

// Apply authentication to all routes
router.use(authenticateToken);

/**
 * Posts API Routes
 * 
 * GET    /api/posts                     - 게시글 목록 조회
 * GET    /api/posts/:id                 - 게시글 상세 조회
 * POST   /api/posts                     - 게시글 생성
 * PUT    /api/posts/:id                 - 게시글 수정
 * DELETE /api/posts/:id                 - 게시글 삭제
 * POST   /api/posts/:id/restore         - 휴지통 복원
 * POST   /api/posts/bulk                - 일괄 작업
 * GET    /api/posts/:id/revisions       - 수정 이력
 * POST   /api/posts/:id/revisions/:revisionId - 리비전 복원
 * POST   /api/posts/:id/autosave        - 자동 저장
 * GET    /api/posts/:id/preview         - 미리보기
 * POST   /api/posts/:id/duplicate       - 게시글 복제
 */

// GET /api/posts - 게시글 목록 조회
router.get('/', postController.getPosts);

// GET /api/posts/:id - 게시글 상세 조회
router.get('/:id', postController.getPost);

// POST /api/posts - 게시글 생성
// Requires: contributor, author, editor, or admin role
router.post('/', 
  roleGuard(['contributor', 'author', 'editor', 'admin']),
  postController.createPost
);

// PUT /api/posts/:id - 게시글 수정
// Requires: contributor (own posts), author (own posts), editor (all posts), or admin
router.put('/:id', 
  roleGuard(['contributor', 'author', 'editor', 'admin']),
  postController.updatePost
);

// DELETE /api/posts/:id - 게시글 삭제
// Requires: author (own posts), editor (all posts), or admin
router.delete('/:id', 
  roleGuard(['author', 'editor', 'admin']),
  postController.deletePost
);

// POST /api/posts/:id/restore - 휴지통 복원
// Requires: author (own posts), editor (all posts), or admin
router.post('/:id/restore', 
  roleGuard(['author', 'editor', 'admin']),
  postController.restorePost
);

// POST /api/posts/bulk - 일괄 작업
// Requires: editor or admin role
router.post('/bulk', 
  roleGuard(['editor', 'admin']),
  postController.bulkAction
);

// GET /api/posts/:id/revisions - 수정 이력
// Requires: contributor (own posts), author (own posts), editor (all posts), or admin
router.get('/:id/revisions', 
  roleGuard(['contributor', 'author', 'editor', 'admin']),
  postController.getRevisions
);

// POST /api/posts/:id/revisions/:revisionId - 리비전 복원
// Requires: author (own posts), editor (all posts), or admin
router.post('/:id/revisions/:revisionId', 
  roleGuard(['author', 'editor', 'admin']),
  postController.restoreRevision
);

// POST /api/posts/:id/autosave - 자동 저장
// Requires: contributor (own posts), author (own posts), editor (all posts), or admin
router.post('/:id/autosave', 
  roleGuard(['contributor', 'author', 'editor', 'admin']),
  postController.autoSave
);

// GET /api/posts/:id/preview - 미리보기
// Requires: contributor (own posts), author (own posts), editor (all posts), or admin
router.get('/:id/preview', 
  roleGuard(['contributor', 'author', 'editor', 'admin']),
  postController.getPreview
);

// POST /api/posts/:id/duplicate - 게시글 복제
// Requires: contributor, author, editor, or admin role
router.post('/:id/duplicate', 
  roleGuard(['contributor', 'author', 'editor', 'admin']),
  postController.duplicatePost
);

export default router;
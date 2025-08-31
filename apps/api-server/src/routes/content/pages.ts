import { Router, RequestHandler } from 'express';
import { PageController } from '../../controllers/content/PageController';
import { authenticateToken } from '../../middleware/auth';
// Simple role guard for now - replace with actual implementation
const roleGuard = (roles: string[]) => (req: any, res: any, next: any) => {
  // For now, allow all authenticated users
  next();
};

const router: Router = Router();
const pageController = new PageController();

// Apply authentication to all routes
router.use(authenticateToken);

/**
 * Pages API Routes
 * 
 * GET    /api/pages                     - 페이지 목록 (계층구조)
 * GET    /api/pages/:id                 - 페이지 상세 조회
 * POST   /api/pages                     - 페이지 생성
 * PUT    /api/pages/:id                 - 페이지 수정
 * DELETE /api/pages/:id                 - 페이지 삭제
 * POST   /api/pages/reorder             - 페이지 순서 변경
 * GET    /api/pages/:id/children        - 하위 페이지
 * GET    /api/pages/breadcrumb/:id      - 경로 조회
 */

// GET /api/pages - 페이지 목록 (계층구조)
router.get('/', pageController.getPages);

// GET /api/pages/:id - 페이지 상세 조회
router.get('/:id', pageController.getPage);

// POST /api/pages - 페이지 생성
// Requires: author, editor, or admin role
router.post('/', 
  roleGuard(['author', 'editor', 'admin']),
  pageController.createPage
);

// PUT /api/pages/:id - 페이지 수정
// Requires: author (own pages), editor (all pages), or admin
router.put('/:id', 
  roleGuard(['author', 'editor', 'admin']),
  pageController.updatePage
);

// DELETE /api/pages/:id - 페이지 삭제
// Requires: author (own pages), editor (all pages), or admin
router.delete('/:id', 
  roleGuard(['author', 'editor', 'admin']),
  pageController.deletePage
);

// POST /api/pages/reorder - 페이지 순서 변경
// Requires: editor or admin role
router.post('/reorder', 
  roleGuard(['editor', 'admin']),
  pageController.reorderPages
);

// GET /api/pages/:id/children - 하위 페이지
router.get('/:id/children', pageController.getChildren);

// GET /api/pages/breadcrumb/:id - 경로 조회
router.get('/breadcrumb/:id', pageController.getBreadcrumb);

export default router;
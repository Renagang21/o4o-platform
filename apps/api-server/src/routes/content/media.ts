import { Router, RequestHandler } from 'express';
import { MediaController } from '../../controllers/content/MediaController';
import { authenticate } from '../../middleware/auth.middleware';
// Simple role guard for now - replace with actual implementation
const roleGuard = (roles: string[]) => (req: any, res: any, next: any) => {
  // For now, allow all authenticated users
  next();
};
import { uploadMiddleware } from '../../middleware/upload.middleware';

const router: Router = Router();
const mediaController = new MediaController();

// Apply authentication to all routes
router.use(authenticate);

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
router.post('/upload', 
  roleGuard(['contributor', 'author', 'editor', 'admin']),
  uploadMiddleware('files', 10), // Allow up to 10 files
  mediaController.uploadMedia
);

// GET /api/media - 미디어 목록
// Requires: contributor, author, editor, or admin role
router.get('/', 
  roleGuard(['contributor', 'author', 'editor', 'admin']),
  mediaController.getMedia
);

// GET /api/media/:id - 미디어 상세
// Requires: contributor, author, editor, or admin role
router.get('/:id', 
  roleGuard(['contributor', 'author', 'editor', 'admin']),
  mediaController.getMediaById
);

// PUT /api/media/:id - 미디어 정보 수정
// Requires: author (own media), editor (all media), or admin
router.put('/:id', 
  roleGuard(['author', 'editor', 'admin']),
  mediaController.updateMedia
);

// DELETE /api/media/:id - 미디어 삭제
// Requires: author (own media), editor (all media), or admin
router.delete('/:id', 
  roleGuard(['author', 'editor', 'admin']),
  mediaController.deleteMedia
);

export default router;
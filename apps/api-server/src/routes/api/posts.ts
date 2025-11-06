import { Router } from 'express'
import { Request, Response, NextFunction } from 'express'
import * as postsController from '../../controllers/postsController.js'
import { authenticate as authenticateToken } from '../../middleware/auth.middleware.js'
import { addDeprecationHeaders } from '../../middleware/deprecation.middleware.js'

const router: Router = Router()

// Deprecation middleware for legacy /api/posts routes ONLY
// Controlled by ROUTE_DEPRECATION_FLAGS environment variable
// This router is mounted at both /api/posts (legacy) and /api/v1/posts (standard)
// We only want to deprecate the legacy mount point
const deprecateIfLegacy = (req: Request, res: Response, next: NextFunction) => {
  // Check if this is the legacy path (not v1)
  if (!req.baseUrl.includes('/v1/')) {
    return addDeprecationHeaders({
      successorRoute: '/api/v1/posts',
      message: 'Use /api/v1/posts instead',
    })(req, res, next);
  }
  next();
}

// Public routes (with conditional deprecation warnings for legacy path only)
router.get('/counts', deprecateIfLegacy, postsController.getPostCounts)
router.get('/', deprecateIfLegacy, postsController.getAllPosts)
router.get('/:id', deprecateIfLegacy, postsController.getPost)
router.get('/:id/preview', deprecateIfLegacy, postsController.previewPost)

// Public meta routes (Phase 4-1: Post Meta CRUD API)
router.get('/:id/meta', deprecateIfLegacy, postsController.listPostMeta)
router.get('/:id/meta/:key', deprecateIfLegacy, postsController.getPostMetaByKey)

// Protected routes (with conditional deprecation warnings for legacy path only)
router.use(authenticateToken)
router.post('/', deprecateIfLegacy, postsController.createPost)
router.put('/:id', deprecateIfLegacy, postsController.updatePost)
router.delete('/:id', deprecateIfLegacy, postsController.deletePost)
router.post('/:id/autosave', deprecateIfLegacy, postsController.autoSavePost)
router.get('/:id/revisions', deprecateIfLegacy, postsController.getPostRevisions)
router.post('/bulk', deprecateIfLegacy, postsController.bulkOperatePosts)

// Protected meta routes (Phase 4-1: Post Meta CRUD API)
router.put('/:id/meta', deprecateIfLegacy, postsController.upsertPostMeta)
router.delete('/:id/meta/:key', deprecateIfLegacy, postsController.deletePostMetaByKey)
router.patch('/:id/meta/:key/increment', deprecateIfLegacy, postsController.incrementPostMeta)

export default router
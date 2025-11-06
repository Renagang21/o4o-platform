import { Router } from 'express'
import * as postsController from '../../controllers/postsController.js'
import { authenticate as authenticateToken } from '../../middleware/auth.middleware.js'
import { addDeprecationHeaders } from '../../middleware/deprecation.middleware.js'

const router: Router = Router()

// Deprecation middleware for legacy /api/posts routes
// Controlled by ROUTE_DEPRECATION_FLAGS environment variable
const deprecateLegacyPosts = addDeprecationHeaders({
  successorRoute: '/api/v1/posts',
  message: 'Use /api/v1/posts instead',
})

// Public routes (with deprecation warnings)
router.get('/counts', deprecateLegacyPosts, postsController.getPostCounts)
router.get('/', deprecateLegacyPosts, postsController.getAllPosts)
router.get('/:id', deprecateLegacyPosts, postsController.getPost)
router.get('/:id/preview', deprecateLegacyPosts, postsController.previewPost)

// Protected routes (with deprecation warnings)
router.use(authenticateToken)
router.post('/', deprecateLegacyPosts, postsController.createPost)
router.put('/:id', deprecateLegacyPosts, postsController.updatePost)
router.delete('/:id', deprecateLegacyPosts, postsController.deletePost)
router.post('/:id/autosave', deprecateLegacyPosts, postsController.autoSavePost)
router.get('/:id/revisions', deprecateLegacyPosts, postsController.getPostRevisions)
router.post('/bulk', deprecateLegacyPosts, postsController.bulkOperatePosts)

export default router
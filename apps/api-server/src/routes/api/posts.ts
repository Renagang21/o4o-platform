import { Router } from 'express'
import * as postsController from '../../controllers/postsController'
import { authenticate as authenticateToken } from '../../middleware/auth.middleware'

const router: Router = Router()

// Public routes
router.get('/', postsController.getAllPosts)
router.get('/:id', postsController.getPost)
router.get('/:id/preview', postsController.previewPost)

// Protected routes
router.use(authenticateToken)
router.post('/', postsController.createPost)
router.put('/:id', postsController.updatePost)
router.delete('/:id', postsController.deletePost)
router.post('/:id/autosave', postsController.autoSavePost)
router.get('/:id/revisions', postsController.getPostRevisions)
router.post('/bulk', postsController.bulkOperatePosts)

export default router
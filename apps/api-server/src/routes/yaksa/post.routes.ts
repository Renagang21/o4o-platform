import { Router } from 'express';
import { YaksaCommunityController } from '../../controllers/yaksa/YaksaCommunityController.js';
import { authenticate } from '../../middleware/auth.middleware.js';

const router: Router = Router();
const controller = new YaksaCommunityController();

/**
 * Yaksa Forum Post Routes
 *
 * All routes require authentication
 */

// Pin a post
router.post('/:postId/pin', authenticate, controller.pinPost.bind(controller));

// Unpin a post
router.post('/:postId/unpin', authenticate, controller.unpinPost.bind(controller));

// Approve a pending post
router.post('/:postId/approve', authenticate, controller.approvePost.bind(controller));

// Set post as announcement
router.post('/:postId/set-announcement', authenticate, controller.setAnnouncement.bind(controller));

// Unset post as announcement
router.post('/:postId/unset-announcement', authenticate, controller.unsetAnnouncement.bind(controller));

export default router;

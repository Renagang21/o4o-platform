import { Router } from 'express';
import { YaksaCommunityController } from '../../controllers/yaksa/YaksaCommunityController.js';
import { authenticate } from '../../middleware/auth.middleware.js';

const router: Router = Router();
const controller = new YaksaCommunityController();

/**
 * Yaksa Forum Community Routes
 *
 * All routes require authentication
 */

// List my communities
router.get('/mine', authenticate, controller.listMyCommunities.bind(controller));

// Get unified feed from all communities
router.get('/feed/all', authenticate, controller.getAllCommunityFeed.bind(controller));

// Get community details
router.get('/:id', authenticate, controller.getCommunity.bind(controller));

// Get community feed
router.get('/:id/feed', authenticate, controller.getCommunityFeed.bind(controller));

// Get community members
router.get('/:id/members', authenticate, controller.getCommunityMembers.bind(controller));

// Create new community
router.post('/', authenticate, controller.createCommunity.bind(controller));

// Create new post in community
router.post('/:id/posts', authenticate, controller.createCommunityPost.bind(controller));

// Join community
router.post('/:id/join', authenticate, controller.joinCommunity.bind(controller));

// Leave community
router.post('/:id/leave', authenticate, controller.leaveCommunity.bind(controller));

export default router;

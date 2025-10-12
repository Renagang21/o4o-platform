import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import { 
  betaUserController, 
  betaUserRegistrationValidation, 
  feedbackSubmissionValidation 
} from '../controllers/betaUserController';

const router: Router = Router();

// Public endpoints (no authentication required)

/**
 * @route POST /api/beta/register
 * @desc Register for beta program
 * @access Public
 */
router.post('/register', 
  betaUserRegistrationValidation,
  betaUserController.registerBetaUser.bind(betaUserController)
);

/**
 * @route GET /api/beta/status/:email
 * @desc Check registration status
 * @access Public
 */
router.get('/status/:email', 
  betaUserController.checkRegistrationStatus.bind(betaUserController)
);

/**
 * @route POST /api/beta/feedback
 * @desc Submit feedback (requires beta user email verification)
 * @access Semi-public
 */
router.post('/feedback', 
  feedbackSubmissionValidation,
  betaUserController.submitFeedback.bind(betaUserController)
);

// Admin endpoints (require authentication)

/**
 * @route GET /api/beta/users
 * @desc Get all beta users with search/filter options
 * @access Admin/Manager
 */
router.get('/users', 
  authenticate,
  betaUserController.getBetaUsers.bind(betaUserController)
);

/**
 * @route GET /api/beta/users/:id
 * @desc Get beta user by ID
 * @access Admin/Manager
 */
router.get('/users/:id', 
  authenticate,
  betaUserController.getBetaUserById.bind(betaUserController)
);

/**
 * @route PUT /api/beta/users/:id/approve
 * @desc Approve beta user
 * @access Admin
 */
router.put('/users/:id/approve', 
  authenticate,
  betaUserController.approveBetaUser.bind(betaUserController)
);

/**
 * @route PUT /api/beta/users/:id/status
 * @desc Update beta user status
 * @access Admin/Manager
 */
router.put('/users/:id/status', 
  authenticate,
  betaUserController.updateBetaUserStatus.bind(betaUserController)
);

// Feedback management endpoints

/**
 * @route GET /api/beta/feedback
 * @desc Get all feedback with search/filter options
 * @access Admin/Manager
 */
router.get('/feedback-admin', 
  authenticate,
  betaUserController.getFeedback.bind(betaUserController)
);

/**
 * @route GET /api/beta/feedback/:id
 * @desc Get feedback by ID
 * @access Admin/Manager
 */
router.get('/feedback-admin/:id', 
  authenticate,
  betaUserController.getFeedbackById.bind(betaUserController)
);

/**
 * @route PUT /api/beta/feedback/:id/assign
 * @desc Assign feedback to user
 * @access Admin/Manager
 */
router.put('/feedback-admin/:id/assign', 
  authenticate,
  betaUserController.assignFeedback.bind(betaUserController)
);

/**
 * @route PUT /api/beta/feedback/:id/respond
 * @desc Respond to feedback
 * @access Admin/Manager
 */
router.put('/feedback-admin/:id/respond', 
  authenticate,
  betaUserController.respondToFeedback.bind(betaUserController)
);

/**
 * @route PUT /api/beta/feedback/:id/status
 * @desc Update feedback status
 * @access Admin/Manager
 */
router.put('/feedback-admin/:id/status', 
  authenticate,
  betaUserController.updateFeedbackStatus.bind(betaUserController)
);

/**
 * @route PUT /api/beta/feedback/:id/priority
 * @desc Update feedback priority
 * @access Admin/Manager
 */
router.put('/feedback-admin/:id/priority', 
  authenticate,
  betaUserController.updateFeedbackPriority.bind(betaUserController)
);

// Analytics endpoints

/**
 * @route GET /api/beta/analytics
 * @desc Get beta program analytics
 * @access Admin
 */
router.get('/analytics', 
  authenticate,
  betaUserController.getBetaAnalytics.bind(betaUserController)
);

/**
 * @route GET /api/beta/feedback/high-priority
 * @desc Get high priority feedback
 * @access Admin/Manager
 */
router.get('/feedback-admin/high-priority', 
  authenticate,
  betaUserController.getHighPriorityFeedback.bind(betaUserController)
);

/**
 * @route GET /api/beta/feedback/unassigned
 * @desc Get unassigned feedback
 * @access Admin/Manager
 */
router.get('/feedback-admin/unassigned', 
  authenticate,
  betaUserController.getUnassignedFeedback.bind(betaUserController)
);

// Real-time conversation endpoints

/**
 * @route POST /api/beta/conversations
 * @desc Create a new conversation for feedback
 * @access Admin/Manager
 */
router.post('/conversations', 
  authenticate,
  betaUserController.createConversation.bind(betaUserController)
);

/**
 * @route GET /api/beta/conversations/:id
 * @desc Get conversation details with messages
 * @access Admin/Manager/BetaUser
 */
router.get('/conversations/:id', 
  authenticate,
  betaUserController.getConversation.bind(betaUserController)
);

/**
 * @route POST /api/beta/conversations/:id/messages
 * @desc Send a message in conversation
 * @access Admin/Manager/BetaUser
 */
router.post('/conversations/:id/messages', 
  authenticate,
  betaUserController.sendMessage.bind(betaUserController)
);

/**
 * @route PUT /api/beta/conversations/:id/status
 * @desc Update conversation status
 * @access Admin/Manager
 */
router.put('/conversations/:id/status', 
  authenticate,
  betaUserController.updateConversationStatus.bind(betaUserController)
);

/**
 * @route GET /api/beta/conversations/user/:betaUserId
 * @desc Get conversations for beta user
 * @access Admin/Manager
 */
router.get('/conversations/user/:betaUserId', 
  authenticate,
  betaUserController.getUserConversations.bind(betaUserController)
);

// Real-time feedback endpoints

/**
 * @route PUT /api/beta/feedback/:id/start-live-support
 * @desc Start live support for feedback
 * @access Public (Beta User)
 */
router.put('/feedback/:id/start-live-support', 
  betaUserController.startLiveSupport.bind(betaUserController)
);

/**
 * @route PUT /api/beta/feedback/:id/mark-viewed
 * @desc Mark feedback as viewed
 * @access Admin/Manager
 */
router.put('/feedback-admin/:id/mark-viewed', 
  authenticate,
  betaUserController.markFeedbackViewed.bind(betaUserController)
);

/**
 * @route GET /api/beta/realtime/stats
 * @desc Get real-time statistics
 * @access Admin
 */
router.get('/realtime/stats', 
  authenticate,
  betaUserController.getRealtimeStats.bind(betaUserController)
);

/**
 * @route GET /api/beta/notifications/pending
 * @desc Get pending notifications for admin
 * @access Admin/Manager
 */
router.get('/notifications/pending', 
  authenticate,
  betaUserController.getPendingNotifications.bind(betaUserController)
);

export default router;
import { Router } from 'express';
import { authenticateToken } from '../middleware/auth';
import { 
  betaUserController, 
  betaUserRegistrationValidation, 
  feedbackSubmissionValidation 
} from '../controllers/betaUserController';

const router = Router();

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
  authenticateToken,
  betaUserController.getBetaUsers.bind(betaUserController)
);

/**
 * @route GET /api/beta/users/:id
 * @desc Get beta user by ID
 * @access Admin/Manager
 */
router.get('/users/:id', 
  authenticateToken,
  betaUserController.getBetaUserById.bind(betaUserController)
);

/**
 * @route PUT /api/beta/users/:id/approve
 * @desc Approve beta user
 * @access Admin
 */
router.put('/users/:id/approve', 
  authenticateToken,
  betaUserController.approveBetaUser.bind(betaUserController)
);

/**
 * @route PUT /api/beta/users/:id/status
 * @desc Update beta user status
 * @access Admin/Manager
 */
router.put('/users/:id/status', 
  authenticateToken,
  betaUserController.updateBetaUserStatus.bind(betaUserController)
);

// Feedback management endpoints

/**
 * @route GET /api/beta/feedback
 * @desc Get all feedback with search/filter options
 * @access Admin/Manager
 */
router.get('/feedback-admin', 
  authenticateToken,
  betaUserController.getFeedback.bind(betaUserController)
);

/**
 * @route GET /api/beta/feedback/:id
 * @desc Get feedback by ID
 * @access Admin/Manager
 */
router.get('/feedback-admin/:id', 
  authenticateToken,
  betaUserController.getFeedbackById.bind(betaUserController)
);

/**
 * @route PUT /api/beta/feedback/:id/assign
 * @desc Assign feedback to user
 * @access Admin/Manager
 */
router.put('/feedback-admin/:id/assign', 
  authenticateToken,
  betaUserController.assignFeedback.bind(betaUserController)
);

/**
 * @route PUT /api/beta/feedback/:id/respond
 * @desc Respond to feedback
 * @access Admin/Manager
 */
router.put('/feedback-admin/:id/respond', 
  authenticateToken,
  betaUserController.respondToFeedback.bind(betaUserController)
);

/**
 * @route PUT /api/beta/feedback/:id/status
 * @desc Update feedback status
 * @access Admin/Manager
 */
router.put('/feedback-admin/:id/status', 
  authenticateToken,
  betaUserController.updateFeedbackStatus.bind(betaUserController)
);

/**
 * @route PUT /api/beta/feedback/:id/priority
 * @desc Update feedback priority
 * @access Admin/Manager
 */
router.put('/feedback-admin/:id/priority', 
  authenticateToken,
  betaUserController.updateFeedbackPriority.bind(betaUserController)
);

// Analytics endpoints

/**
 * @route GET /api/beta/analytics
 * @desc Get beta program analytics
 * @access Admin
 */
router.get('/analytics', 
  authenticateToken,
  betaUserController.getBetaAnalytics.bind(betaUserController)
);

/**
 * @route GET /api/beta/feedback/high-priority
 * @desc Get high priority feedback
 * @access Admin/Manager
 */
router.get('/feedback-admin/high-priority', 
  authenticateToken,
  betaUserController.getHighPriorityFeedback.bind(betaUserController)
);

/**
 * @route GET /api/beta/feedback/unassigned
 * @desc Get unassigned feedback
 * @access Admin/Manager
 */
router.get('/feedback-admin/unassigned', 
  authenticateToken,
  betaUserController.getUnassignedFeedback.bind(betaUserController)
);

// Real-time conversation endpoints

/**
 * @route POST /api/beta/conversations
 * @desc Create a new conversation for feedback
 * @access Admin/Manager
 */
router.post('/conversations', 
  authenticateToken,
  betaUserController.createConversation.bind(betaUserController)
);

/**
 * @route GET /api/beta/conversations/:id
 * @desc Get conversation details with messages
 * @access Admin/Manager/BetaUser
 */
router.get('/conversations/:id', 
  authenticateToken,
  betaUserController.getConversation.bind(betaUserController)
);

/**
 * @route POST /api/beta/conversations/:id/messages
 * @desc Send a message in conversation
 * @access Admin/Manager/BetaUser
 */
router.post('/conversations/:id/messages', 
  authenticateToken,
  betaUserController.sendMessage.bind(betaUserController)
);

/**
 * @route PUT /api/beta/conversations/:id/status
 * @desc Update conversation status
 * @access Admin/Manager
 */
router.put('/conversations/:id/status', 
  authenticateToken,
  betaUserController.updateConversationStatus.bind(betaUserController)
);

/**
 * @route GET /api/beta/conversations/user/:betaUserId
 * @desc Get conversations for beta user
 * @access Admin/Manager
 */
router.get('/conversations/user/:betaUserId', 
  authenticateToken,
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
  authenticateToken,
  betaUserController.markFeedbackViewed.bind(betaUserController)
);

/**
 * @route GET /api/beta/realtime/stats
 * @desc Get real-time statistics
 * @access Admin
 */
router.get('/realtime/stats', 
  authenticateToken,
  betaUserController.getRealtimeStats.bind(betaUserController)
);

/**
 * @route GET /api/beta/notifications/pending
 * @desc Get pending notifications for admin
 * @access Admin/Manager
 */
router.get('/notifications/pending', 
  authenticateToken,
  betaUserController.getPendingNotifications.bind(betaUserController)
);

export default router;
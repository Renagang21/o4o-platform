"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = require("../middleware/auth");
const betaUserController_1 = require("../controllers/betaUserController");
const router = (0, express_1.Router)();
// Public endpoints (no authentication required)
/**
 * @route POST /api/beta/register
 * @desc Register for beta program
 * @access Public
 */
router.post('/register', betaUserController_1.betaUserRegistrationValidation, betaUserController_1.betaUserController.registerBetaUser.bind(betaUserController_1.betaUserController));
/**
 * @route GET /api/beta/status/:email
 * @desc Check registration status
 * @access Public
 */
router.get('/status/:email', betaUserController_1.betaUserController.checkRegistrationStatus.bind(betaUserController_1.betaUserController));
/**
 * @route POST /api/beta/feedback
 * @desc Submit feedback (requires beta user email verification)
 * @access Semi-public
 */
router.post('/feedback', betaUserController_1.feedbackSubmissionValidation, betaUserController_1.betaUserController.submitFeedback.bind(betaUserController_1.betaUserController));
// Admin endpoints (require authentication)
/**
 * @route GET /api/beta/users
 * @desc Get all beta users with search/filter options
 * @access Admin/Manager
 */
router.get('/users', auth_1.authenticateToken, betaUserController_1.betaUserController.getBetaUsers.bind(betaUserController_1.betaUserController));
/**
 * @route GET /api/beta/users/:id
 * @desc Get beta user by ID
 * @access Admin/Manager
 */
router.get('/users/:id', auth_1.authenticateToken, betaUserController_1.betaUserController.getBetaUserById.bind(betaUserController_1.betaUserController));
/**
 * @route PUT /api/beta/users/:id/approve
 * @desc Approve beta user
 * @access Admin
 */
router.put('/users/:id/approve', auth_1.authenticateToken, betaUserController_1.betaUserController.approveBetaUser.bind(betaUserController_1.betaUserController));
/**
 * @route PUT /api/beta/users/:id/status
 * @desc Update beta user status
 * @access Admin/Manager
 */
router.put('/users/:id/status', auth_1.authenticateToken, betaUserController_1.betaUserController.updateBetaUserStatus.bind(betaUserController_1.betaUserController));
// Feedback management endpoints
/**
 * @route GET /api/beta/feedback
 * @desc Get all feedback with search/filter options
 * @access Admin/Manager
 */
router.get('/feedback-admin', auth_1.authenticateToken, betaUserController_1.betaUserController.getFeedback.bind(betaUserController_1.betaUserController));
/**
 * @route GET /api/beta/feedback/:id
 * @desc Get feedback by ID
 * @access Admin/Manager
 */
router.get('/feedback-admin/:id', auth_1.authenticateToken, betaUserController_1.betaUserController.getFeedbackById.bind(betaUserController_1.betaUserController));
/**
 * @route PUT /api/beta/feedback/:id/assign
 * @desc Assign feedback to user
 * @access Admin/Manager
 */
router.put('/feedback-admin/:id/assign', auth_1.authenticateToken, betaUserController_1.betaUserController.assignFeedback.bind(betaUserController_1.betaUserController));
/**
 * @route PUT /api/beta/feedback/:id/respond
 * @desc Respond to feedback
 * @access Admin/Manager
 */
router.put('/feedback-admin/:id/respond', auth_1.authenticateToken, betaUserController_1.betaUserController.respondToFeedback.bind(betaUserController_1.betaUserController));
/**
 * @route PUT /api/beta/feedback/:id/status
 * @desc Update feedback status
 * @access Admin/Manager
 */
router.put('/feedback-admin/:id/status', auth_1.authenticateToken, betaUserController_1.betaUserController.updateFeedbackStatus.bind(betaUserController_1.betaUserController));
/**
 * @route PUT /api/beta/feedback/:id/priority
 * @desc Update feedback priority
 * @access Admin/Manager
 */
router.put('/feedback-admin/:id/priority', auth_1.authenticateToken, betaUserController_1.betaUserController.updateFeedbackPriority.bind(betaUserController_1.betaUserController));
// Analytics endpoints
/**
 * @route GET /api/beta/analytics
 * @desc Get beta program analytics
 * @access Admin
 */
router.get('/analytics', auth_1.authenticateToken, betaUserController_1.betaUserController.getBetaAnalytics.bind(betaUserController_1.betaUserController));
/**
 * @route GET /api/beta/feedback/high-priority
 * @desc Get high priority feedback
 * @access Admin/Manager
 */
router.get('/feedback-admin/high-priority', auth_1.authenticateToken, betaUserController_1.betaUserController.getHighPriorityFeedback.bind(betaUserController_1.betaUserController));
/**
 * @route GET /api/beta/feedback/unassigned
 * @desc Get unassigned feedback
 * @access Admin/Manager
 */
router.get('/feedback-admin/unassigned', auth_1.authenticateToken, betaUserController_1.betaUserController.getUnassignedFeedback.bind(betaUserController_1.betaUserController));
// Real-time conversation endpoints
/**
 * @route POST /api/beta/conversations
 * @desc Create a new conversation for feedback
 * @access Admin/Manager
 */
router.post('/conversations', auth_1.authenticateToken, betaUserController_1.betaUserController.createConversation.bind(betaUserController_1.betaUserController));
/**
 * @route GET /api/beta/conversations/:id
 * @desc Get conversation details with messages
 * @access Admin/Manager/BetaUser
 */
router.get('/conversations/:id', auth_1.authenticateToken, betaUserController_1.betaUserController.getConversation.bind(betaUserController_1.betaUserController));
/**
 * @route POST /api/beta/conversations/:id/messages
 * @desc Send a message in conversation
 * @access Admin/Manager/BetaUser
 */
router.post('/conversations/:id/messages', auth_1.authenticateToken, betaUserController_1.betaUserController.sendMessage.bind(betaUserController_1.betaUserController));
/**
 * @route PUT /api/beta/conversations/:id/status
 * @desc Update conversation status
 * @access Admin/Manager
 */
router.put('/conversations/:id/status', auth_1.authenticateToken, betaUserController_1.betaUserController.updateConversationStatus.bind(betaUserController_1.betaUserController));
/**
 * @route GET /api/beta/conversations/user/:betaUserId
 * @desc Get conversations for beta user
 * @access Admin/Manager
 */
router.get('/conversations/user/:betaUserId', auth_1.authenticateToken, betaUserController_1.betaUserController.getUserConversations.bind(betaUserController_1.betaUserController));
// Real-time feedback endpoints
/**
 * @route PUT /api/beta/feedback/:id/start-live-support
 * @desc Start live support for feedback
 * @access Public (Beta User)
 */
router.put('/feedback/:id/start-live-support', betaUserController_1.betaUserController.startLiveSupport.bind(betaUserController_1.betaUserController));
/**
 * @route PUT /api/beta/feedback/:id/mark-viewed
 * @desc Mark feedback as viewed
 * @access Admin/Manager
 */
router.put('/feedback-admin/:id/mark-viewed', auth_1.authenticateToken, betaUserController_1.betaUserController.markFeedbackViewed.bind(betaUserController_1.betaUserController));
/**
 * @route GET /api/beta/realtime/stats
 * @desc Get real-time statistics
 * @access Admin
 */
router.get('/realtime/stats', auth_1.authenticateToken, betaUserController_1.betaUserController.getRealtimeStats.bind(betaUserController_1.betaUserController));
/**
 * @route GET /api/beta/notifications/pending
 * @desc Get pending notifications for admin
 * @access Admin/Manager
 */
router.get('/notifications/pending', auth_1.authenticateToken, betaUserController_1.betaUserController.getPendingNotifications.bind(betaUserController_1.betaUserController));
exports.default = router;
//# sourceMappingURL=beta.js.map
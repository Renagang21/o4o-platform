"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.betaUserController = exports.feedbackSubmissionValidation = exports.betaUserRegistrationValidation = exports.BetaUserController = void 0;
const express_validator_1 = require("express-validator");
const betaUserService_1 = require("../services/betaUserService");
const BetaUser_1 = require("../entities/BetaUser");
const BetaFeedback_1 = require("../entities/BetaFeedback");
const FeedbackConversation_1 = require("../entities/FeedbackConversation");
const connection_1 = require("../database/connection");
class BetaUserController {
    // Beta User Registration (Public endpoint)
    async registerBetaUser(req, res) {
        try {
            const errors = (0, express_validator_1.validationResult)(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({
                    success: false,
                    error: {
                        code: 'VALIDATION_ERROR',
                        message: 'Invalid input data',
                        details: errors.array()
                    }
                });
            }
            const registrationData = {
                email: req.body.email,
                name: req.body.name,
                phone: req.body.phone,
                company: req.body.company,
                jobTitle: req.body.jobTitle,
                type: req.body.type || BetaUser_1.BetaUserType.INDIVIDUAL,
                interestArea: req.body.interestArea || BetaUser_1.InterestArea.OTHER,
                useCase: req.body.useCase,
                expectations: req.body.expectations,
                interestedFeatures: req.body.interestedFeatures,
                referralSource: req.body.referralSource,
                utmSource: req.body.utmSource,
                utmMedium: req.body.utmMedium,
                utmCampaign: req.body.utmCampaign
            };
            // Capture additional metadata
            const metadata = {
                ipAddress: req.ip,
                userAgent: req.get('User-Agent'),
                timestamp: new Date(),
                source: 'web_registration'
            };
            const betaUser = await betaUserService_1.betaUserService.registerBetaUser(registrationData, metadata);
            res.status(201).json({
                success: true,
                message: 'Successfully registered for beta program! We will review your application and contact you soon.',
                data: {
                    id: betaUser.id,
                    email: betaUser.email,
                    name: betaUser.name,
                    status: betaUser.status,
                    type: betaUser.type,
                    interestArea: betaUser.interestArea,
                    createdAt: betaUser.createdAt
                }
            });
        }
        catch (error) {
            // Error log removed
            if (error instanceof Error && error.message.includes('already registered')) {
                return res.status(409).json({
                    success: false,
                    error: {
                        code: 'EMAIL_EXISTS',
                        message: 'This email is already registered for the beta program'
                    }
                });
            }
            res.status(500).json({
                success: false,
                error: {
                    code: 'REGISTRATION_ERROR',
                    message: 'Failed to register for beta program'
                }
            });
        }
    }
    // Check registration status (Public endpoint)
    async checkRegistrationStatus(req, res) {
        try {
            const { email } = req.params;
            if (!email) {
                return res.status(400).json({
                    success: false,
                    error: {
                        code: 'VALIDATION_ERROR',
                        message: 'Email is required'
                    }
                });
            }
            const betaUser = await betaUserService_1.betaUserService.getBetaUserByEmail(email);
            if (!betaUser) {
                return res.status(404).json({
                    success: false,
                    error: {
                        code: 'NOT_FOUND',
                        message: 'Email not found in beta program'
                    }
                });
            }
            res.json({
                success: true,
                data: {
                    status: betaUser.status,
                    registeredAt: betaUser.createdAt,
                    approvedAt: betaUser.approvedAt,
                    canProvideFeedback: betaUser.canProvideFeedback(),
                    feedbackCount: betaUser.feedbackCount
                }
            });
        }
        catch (error) {
            // Error log removed
            res.status(500).json({
                success: false,
                error: {
                    code: 'INTERNAL_ERROR',
                    message: 'Failed to check registration status'
                }
            });
        }
    }
    // Submit feedback (Semi-public: requires beta user email verification)
    async submitFeedback(req, res) {
        try {
            const errors = (0, express_validator_1.validationResult)(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({
                    success: false,
                    error: {
                        code: 'VALIDATION_ERROR',
                        message: 'Invalid input data',
                        details: errors.array()
                    }
                });
            }
            const { betaUserEmail } = req.body;
            // Find beta user by email
            const betaUser = await betaUserService_1.betaUserService.getBetaUserByEmail(betaUserEmail);
            if (!betaUser) {
                return res.status(404).json({
                    success: false,
                    error: {
                        code: 'NOT_FOUND',
                        message: 'Beta user not found. Please register for the beta program first.'
                    }
                });
            }
            if (!betaUser.canProvideFeedback()) {
                return res.status(403).json({
                    success: false,
                    error: {
                        code: 'FORBIDDEN',
                        message: 'You are not eligible to provide feedback in your current status.'
                    }
                });
            }
            const feedbackData = {
                type: req.body.type,
                title: req.body.title,
                description: req.body.description,
                reproductionSteps: req.body.reproductionSteps,
                expectedBehavior: req.body.expectedBehavior,
                actualBehavior: req.body.actualBehavior,
                feature: req.body.feature,
                priority: req.body.priority || BetaFeedback_1.FeedbackPriority.MEDIUM,
                contactEmail: req.body.contactEmail || betaUser.email,
                browserInfo: req.get('User-Agent'),
                deviceType: req.body.deviceType,
                screenResolution: req.body.screenResolution,
                currentUrl: req.body.currentUrl,
                rating: req.body.rating,
                additionalComments: req.body.additionalComments,
                attachments: req.body.attachments,
                screenshots: req.body.screenshots
            };
            const feedback = await betaUserService_1.betaUserService.submitFeedback(betaUser.id, feedbackData);
            res.status(201).json({
                success: true,
                message: 'Feedback submitted successfully! Thank you for helping us improve.',
                data: {
                    id: feedback.id,
                    type: feedback.type,
                    title: feedback.title,
                    status: feedback.status,
                    priority: feedback.priority,
                    createdAt: feedback.createdAt
                }
            });
        }
        catch (error) {
            // Error log removed
            res.status(500).json({
                success: false,
                error: {
                    code: 'SUBMISSION_ERROR',
                    message: 'Failed to submit feedback'
                }
            });
        }
    }
    // Admin endpoints (require authentication)
    async getBetaUsers(req, res) {
        try {
            const user = req.user;
            if (!['admin', 'manager'].includes(user.role)) {
                return res.status(403).json({
                    success: false,
                    error: {
                        code: 'FORBIDDEN',
                        message: 'Admin or manager access required'
                    }
                });
            }
            const searchOptions = {
                query: req.query.search,
                status: req.query.status,
                type: req.query.type,
                interestArea: req.query.interestArea,
                page: parseInt(req.query.page) || 1,
                limit: Math.min(parseInt(req.query.limit) || 20, 100),
                sortBy: req.query.sortBy || 'latest',
                sortOrder: req.query.sortOrder || 'DESC',
                dateFrom: req.query.dateFrom ? new Date(req.query.dateFrom) : undefined,
                dateTo: req.query.dateTo ? new Date(req.query.dateTo) : undefined
            };
            const result = await betaUserService_1.betaUserService.getBetaUsers(searchOptions);
            res.json({
                success: true,
                data: result,
                meta: {
                    searchOptions,
                    generatedAt: new Date()
                }
            });
        }
        catch (error) {
            // Error log removed
            res.status(500).json({
                success: false,
                error: {
                    code: 'INTERNAL_ERROR',
                    message: 'Failed to fetch beta users'
                }
            });
        }
    }
    async getBetaUserById(req, res) {
        try {
            const user = req.user;
            const { id } = req.params;
            if (!['admin', 'manager'].includes(user.role)) {
                return res.status(403).json({
                    success: false,
                    error: {
                        code: 'FORBIDDEN',
                        message: 'Admin or manager access required'
                    }
                });
            }
            const betaUser = await betaUserService_1.betaUserService.getBetaUserById(id);
            if (!betaUser) {
                return res.status(404).json({
                    success: false,
                    error: {
                        code: 'NOT_FOUND',
                        message: 'Beta user not found'
                    }
                });
            }
            res.json({
                success: true,
                data: betaUser
            });
        }
        catch (error) {
            // Error log removed
            res.status(500).json({
                success: false,
                error: {
                    code: 'INTERNAL_ERROR',
                    message: 'Failed to fetch beta user'
                }
            });
        }
    }
    async approveBetaUser(req, res) {
        try {
            const user = req.user;
            const { id } = req.params;
            const { notes } = req.body;
            if (user.role !== 'admin') {
                return res.status(403).json({
                    success: false,
                    error: {
                        code: 'FORBIDDEN',
                        message: 'Admin access required'
                    }
                });
            }
            const betaUser = await betaUserService_1.betaUserService.approveBetaUser(id, user.id, notes);
            res.json({
                success: true,
                message: 'Beta user approved successfully',
                data: betaUser
            });
        }
        catch (error) {
            // Error log removed
            if (error instanceof Error && error.message.includes('not found')) {
                return res.status(404).json({
                    success: false,
                    error: {
                        code: 'NOT_FOUND',
                        message: 'Beta user not found'
                    }
                });
            }
            res.status(500).json({
                success: false,
                error: {
                    code: 'APPROVAL_ERROR',
                    message: 'Failed to approve beta user'
                }
            });
        }
    }
    async updateBetaUserStatus(req, res) {
        try {
            const user = req.user;
            const { id } = req.params;
            const { status } = req.body;
            if (!['admin', 'manager'].includes(user.role)) {
                return res.status(403).json({
                    success: false,
                    error: {
                        code: 'FORBIDDEN',
                        message: 'Admin or manager access required'
                    }
                });
            }
            if (!Object.values(BetaUser_1.BetaUserStatus).includes(status)) {
                return res.status(400).json({
                    success: false,
                    error: {
                        code: 'VALIDATION_ERROR',
                        message: 'Invalid status value'
                    }
                });
            }
            const betaUser = await betaUserService_1.betaUserService.updateBetaUserStatus(id, status);
            res.json({
                success: true,
                message: 'Beta user status updated successfully',
                data: betaUser
            });
        }
        catch (error) {
            // Error log removed
            if (error instanceof Error && error.message.includes('not found')) {
                return res.status(404).json({
                    success: false,
                    error: {
                        code: 'NOT_FOUND',
                        message: 'Beta user not found'
                    }
                });
            }
            res.status(500).json({
                success: false,
                error: {
                    code: 'UPDATE_ERROR',
                    message: 'Failed to update beta user status'
                }
            });
        }
    }
    // Feedback management endpoints
    async getFeedback(req, res) {
        try {
            const user = req.user;
            if (!['admin', 'manager'].includes(user.role)) {
                return res.status(403).json({
                    success: false,
                    error: {
                        code: 'FORBIDDEN',
                        message: 'Admin or manager access required'
                    }
                });
            }
            const searchOptions = {
                query: req.query.search,
                type: req.query.type,
                status: req.query.status,
                priority: req.query.priority,
                feature: req.query.feature,
                betaUserId: req.query.betaUserId,
                assignedTo: req.query.assignedTo,
                page: parseInt(req.query.page) || 1,
                limit: Math.min(parseInt(req.query.limit) || 20, 100),
                sortBy: req.query.sortBy || 'latest',
                sortOrder: req.query.sortOrder || 'DESC',
                dateFrom: req.query.dateFrom ? new Date(req.query.dateFrom) : undefined,
                dateTo: req.query.dateTo ? new Date(req.query.dateTo) : undefined
            };
            const result = await betaUserService_1.betaUserService.getFeedback(searchOptions);
            res.json({
                success: true,
                data: result,
                meta: {
                    searchOptions,
                    generatedAt: new Date()
                }
            });
        }
        catch (error) {
            // Error log removed
            res.status(500).json({
                success: false,
                error: {
                    code: 'INTERNAL_ERROR',
                    message: 'Failed to fetch feedback'
                }
            });
        }
    }
    async getFeedbackById(req, res) {
        try {
            const user = req.user;
            const { id } = req.params;
            if (!['admin', 'manager'].includes(user.role)) {
                return res.status(403).json({
                    success: false,
                    error: {
                        code: 'FORBIDDEN',
                        message: 'Admin or manager access required'
                    }
                });
            }
            const feedback = await betaUserService_1.betaUserService.getFeedbackById(id);
            if (!feedback) {
                return res.status(404).json({
                    success: false,
                    error: {
                        code: 'NOT_FOUND',
                        message: 'Feedback not found'
                    }
                });
            }
            res.json({
                success: true,
                data: feedback
            });
        }
        catch (error) {
            // Error log removed
            res.status(500).json({
                success: false,
                error: {
                    code: 'INTERNAL_ERROR',
                    message: 'Failed to fetch feedback'
                }
            });
        }
    }
    async assignFeedback(req, res) {
        try {
            const user = req.user;
            const { id } = req.params;
            const { assigneeId } = req.body;
            if (!['admin', 'manager'].includes(user.role)) {
                return res.status(403).json({
                    success: false,
                    error: {
                        code: 'FORBIDDEN',
                        message: 'Admin or manager access required'
                    }
                });
            }
            const feedback = await betaUserService_1.betaUserService.assignFeedback(id, assigneeId);
            res.json({
                success: true,
                message: 'Feedback assigned successfully',
                data: feedback
            });
        }
        catch (error) {
            // Error log removed
            if (error instanceof Error && error.message.includes('not found')) {
                return res.status(404).json({
                    success: false,
                    error: {
                        code: 'NOT_FOUND',
                        message: 'Feedback not found'
                    }
                });
            }
            res.status(500).json({
                success: false,
                error: {
                    code: 'ASSIGNMENT_ERROR',
                    message: 'Failed to assign feedback'
                }
            });
        }
    }
    async respondToFeedback(req, res) {
        try {
            const user = req.user;
            const { id } = req.params;
            const { response } = req.body;
            if (!['admin', 'manager'].includes(user.role)) {
                return res.status(403).json({
                    success: false,
                    error: {
                        code: 'FORBIDDEN',
                        message: 'Admin or manager access required'
                    }
                });
            }
            if (!response || response.trim().length === 0) {
                return res.status(400).json({
                    success: false,
                    error: {
                        code: 'VALIDATION_ERROR',
                        message: 'Response is required'
                    }
                });
            }
            const feedback = await betaUserService_1.betaUserService.respondToFeedback(id, response, user.id);
            res.json({
                success: true,
                message: 'Response submitted successfully',
                data: feedback
            });
        }
        catch (error) {
            // Error log removed
            if (error instanceof Error && error.message.includes('not found')) {
                return res.status(404).json({
                    success: false,
                    error: {
                        code: 'NOT_FOUND',
                        message: 'Feedback not found'
                    }
                });
            }
            if (error instanceof Error && error.message.includes('cannot be responded')) {
                return res.status(400).json({
                    success: false,
                    error: {
                        code: 'INVALID_STATUS',
                        message: error.message
                    }
                });
            }
            res.status(500).json({
                success: false,
                error: {
                    code: 'RESPONSE_ERROR',
                    message: 'Failed to submit response'
                }
            });
        }
    }
    async updateFeedbackStatus(req, res) {
        try {
            const user = req.user;
            const { id } = req.params;
            const { status } = req.body;
            if (!['admin', 'manager'].includes(user.role)) {
                return res.status(403).json({
                    success: false,
                    error: {
                        code: 'FORBIDDEN',
                        message: 'Admin or manager access required'
                    }
                });
            }
            if (!Object.values(BetaFeedback_1.FeedbackStatus).includes(status)) {
                return res.status(400).json({
                    success: false,
                    error: {
                        code: 'VALIDATION_ERROR',
                        message: 'Invalid status value'
                    }
                });
            }
            const feedback = await betaUserService_1.betaUserService.updateFeedbackStatus(id, status, user.id);
            res.json({
                success: true,
                message: 'Feedback status updated successfully',
                data: feedback
            });
        }
        catch (error) {
            // Error log removed
            if (error instanceof Error && error.message.includes('not found')) {
                return res.status(404).json({
                    success: false,
                    error: {
                        code: 'NOT_FOUND',
                        message: 'Feedback not found'
                    }
                });
            }
            res.status(500).json({
                success: false,
                error: {
                    code: 'UPDATE_ERROR',
                    message: 'Failed to update feedback status'
                }
            });
        }
    }
    async updateFeedbackPriority(req, res) {
        try {
            const user = req.user;
            const { id } = req.params;
            const { priority } = req.body;
            if (!['admin', 'manager'].includes(user.role)) {
                return res.status(403).json({
                    success: false,
                    error: {
                        code: 'FORBIDDEN',
                        message: 'Admin or manager access required'
                    }
                });
            }
            if (!Object.values(BetaFeedback_1.FeedbackPriority).includes(priority)) {
                return res.status(400).json({
                    success: false,
                    error: {
                        code: 'VALIDATION_ERROR',
                        message: 'Invalid priority value'
                    }
                });
            }
            const feedback = await betaUserService_1.betaUserService.updateFeedbackPriority(id, priority);
            res.json({
                success: true,
                message: 'Feedback priority updated successfully',
                data: feedback
            });
        }
        catch (error) {
            // Error log removed
            if (error instanceof Error && error.message.includes('not found')) {
                return res.status(404).json({
                    success: false,
                    error: {
                        code: 'NOT_FOUND',
                        message: 'Feedback not found'
                    }
                });
            }
            res.status(500).json({
                success: false,
                error: {
                    code: 'UPDATE_ERROR',
                    message: 'Failed to update feedback priority'
                }
            });
        }
    }
    // Analytics endpoints
    async getBetaAnalytics(req, res) {
        try {
            const user = req.user;
            if (user.role !== 'admin') {
                return res.status(403).json({
                    success: false,
                    error: {
                        code: 'FORBIDDEN',
                        message: 'Admin access required'
                    }
                });
            }
            const analytics = await betaUserService_1.betaUserService.getBetaAnalytics();
            res.json({
                success: true,
                data: analytics,
                meta: {
                    generatedAt: new Date(),
                    generatedBy: user.id
                }
            });
        }
        catch (error) {
            // Error log removed
            res.status(500).json({
                success: false,
                error: {
                    code: 'ANALYTICS_ERROR',
                    message: 'Failed to fetch beta analytics'
                }
            });
        }
    }
    async getHighPriorityFeedback(req, res) {
        try {
            const user = req.user;
            if (!['admin', 'manager'].includes(user.role)) {
                return res.status(403).json({
                    success: false,
                    error: {
                        code: 'FORBIDDEN',
                        message: 'Admin or manager access required'
                    }
                });
            }
            const feedback = await betaUserService_1.betaUserService.getHighPriorityFeedback();
            res.json({
                success: true,
                data: { feedback },
                meta: {
                    count: feedback.length,
                    generatedAt: new Date()
                }
            });
        }
        catch (error) {
            // Error log removed
            res.status(500).json({
                success: false,
                error: {
                    code: 'INTERNAL_ERROR',
                    message: 'Failed to fetch high priority feedback'
                }
            });
        }
    }
    async getUnassignedFeedback(req, res) {
        try {
            const user = req.user;
            if (!['admin', 'manager'].includes(user.role)) {
                return res.status(403).json({
                    success: false,
                    error: {
                        code: 'FORBIDDEN',
                        message: 'Admin or manager access required'
                    }
                });
            }
            const feedback = await betaUserService_1.betaUserService.getUnassignedFeedback();
            res.json({
                success: true,
                data: { feedback },
                meta: {
                    count: feedback.length,
                    generatedAt: new Date()
                }
            });
        }
        catch (error) {
            // Error log removed
            res.status(500).json({
                success: false,
                error: {
                    code: 'INTERNAL_ERROR',
                    message: 'Failed to fetch unassigned feedback'
                }
            });
        }
    }
    // Real-time conversation methods
    async createConversation(req, res) {
        try {
            const user = req.user;
            if (!['admin', 'manager'].includes(user.role)) {
                return res.status(403).json({
                    success: false,
                    error: {
                        code: 'FORBIDDEN',
                        message: 'Admin or manager access required'
                    }
                });
            }
            const { feedbackId, betaUserId, title } = req.body;
            const conversationRepo = connection_1.AppDataSource.getRepository(FeedbackConversation_1.FeedbackConversation);
            const conversation = conversationRepo.create({
                feedbackId,
                betaUserId,
                title,
                status: FeedbackConversation_1.ConversationStatus.ACTIVE,
                assignedTo: user.id
            });
            await conversationRepo.save(conversation);
            res.status(201).json({
                success: true,
                data: { conversation }
            });
        }
        catch (error) {
            // Error log removed
            res.status(500).json({
                success: false,
                error: {
                    code: 'INTERNAL_ERROR',
                    message: 'Failed to create conversation'
                }
            });
        }
    }
    async getConversation(req, res) {
        try {
            const { id } = req.params;
            const user = req.user;
            const conversationRepo = connection_1.AppDataSource.getRepository(FeedbackConversation_1.FeedbackConversation);
            const conversation = await conversationRepo.findOne({
                where: { id },
                relations: ['feedback', 'betaUser', 'messages', 'assignee']
            });
            if (!conversation) {
                return res.status(404).json({
                    success: false,
                    error: {
                        code: 'NOT_FOUND',
                        message: 'Conversation not found'
                    }
                });
            }
            // Check access permissions
            const hasAccess = ['admin', 'manager'].includes(user.role) ||
                conversation.assignedTo === user.id;
            if (!hasAccess) {
                return res.status(403).json({
                    success: false,
                    error: {
                        code: 'FORBIDDEN',
                        message: 'Access denied'
                    }
                });
            }
            res.json({
                success: true,
                data: { conversation }
            });
        }
        catch (error) {
            // Error log removed
            res.status(500).json({
                success: false,
                error: {
                    code: 'INTERNAL_ERROR',
                    message: 'Failed to fetch conversation'
                }
            });
        }
    }
    async sendMessage(req, res) {
        try {
            const { id: conversationId } = req.params;
            const { content, messageType = FeedbackConversation_1.MessageType.TEXT } = req.body;
            const user = req.user;
            const conversationRepo = connection_1.AppDataSource.getRepository(FeedbackConversation_1.FeedbackConversation);
            const messageRepo = connection_1.AppDataSource.getRepository(FeedbackConversation_1.ConversationMessage);
            const conversation = await conversationRepo.findOne({
                where: { id: conversationId },
                relations: ['feedback', 'betaUser']
            });
            if (!conversation) {
                return res.status(404).json({
                    success: false,
                    error: {
                        code: 'NOT_FOUND',
                        message: 'Conversation not found'
                    }
                });
            }
            // Create message
            const message = messageRepo.create({
                conversationId,
                senderId: user.id,
                senderRole: FeedbackConversation_1.ParticipantRole.ADMIN,
                senderName: user.name,
                messageType,
                content,
                metadata: {
                    delivered: true,
                    deliveredAt: new Date(),
                    ipAddress: req.ip,
                    userAgent: req.get('User-Agent')
                }
            });
            await messageRepo.save(message);
            // Update conversation
            conversation.updateLastAdminResponse();
            await conversationRepo.save(conversation);
            res.status(201).json({
                success: true,
                data: { message }
            });
        }
        catch (error) {
            // Error log removed
            res.status(500).json({
                success: false,
                error: {
                    code: 'INTERNAL_ERROR',
                    message: 'Failed to send message'
                }
            });
        }
    }
    async updateConversationStatus(req, res) {
        try {
            const { id } = req.params;
            const { status } = req.body;
            const user = req.user;
            if (!['admin', 'manager'].includes(user.role)) {
                return res.status(403).json({
                    success: false,
                    error: {
                        code: 'FORBIDDEN',
                        message: 'Admin or manager access required'
                    }
                });
            }
            const conversationRepo = connection_1.AppDataSource.getRepository(FeedbackConversation_1.FeedbackConversation);
            const conversation = await conversationRepo.findOne({ where: { id } });
            if (!conversation) {
                return res.status(404).json({
                    success: false,
                    error: {
                        code: 'NOT_FOUND',
                        message: 'Conversation not found'
                    }
                });
            }
            conversation.status = status;
            await conversationRepo.save(conversation);
            res.json({
                success: true,
                data: { conversation }
            });
        }
        catch (error) {
            // Error log removed
            res.status(500).json({
                success: false,
                error: {
                    code: 'INTERNAL_ERROR',
                    message: 'Failed to update conversation status'
                }
            });
        }
    }
    async getUserConversations(req, res) {
        try {
            const { betaUserId } = req.params;
            const user = req.user;
            if (!['admin', 'manager'].includes(user.role)) {
                return res.status(403).json({
                    success: false,
                    error: {
                        code: 'FORBIDDEN',
                        message: 'Admin or manager access required'
                    }
                });
            }
            const conversationRepo = connection_1.AppDataSource.getRepository(FeedbackConversation_1.FeedbackConversation);
            const conversations = await conversationRepo.find({
                where: { betaUserId },
                relations: ['feedback', 'betaUser'],
                order: { createdAt: 'DESC' }
            });
            res.json({
                success: true,
                data: { conversations },
                meta: {
                    count: conversations.length
                }
            });
        }
        catch (error) {
            // Error log removed
            res.status(500).json({
                success: false,
                error: {
                    code: 'INTERNAL_ERROR',
                    message: 'Failed to fetch user conversations'
                }
            });
        }
    }
    // Real-time feedback methods
    async startLiveSupport(req, res) {
        var _a;
        try {
            const { id: feedbackId } = req.params;
            const { betaUserEmail } = req.body;
            const feedbackRepo = connection_1.AppDataSource.getRepository(BetaFeedback_1.BetaFeedback);
            const feedback = await feedbackRepo.findOne({
                where: { id: feedbackId },
                relations: ['betaUser']
            });
            if (!feedback) {
                return res.status(404).json({
                    success: false,
                    error: {
                        code: 'NOT_FOUND',
                        message: 'Feedback not found'
                    }
                });
            }
            // Verify beta user email
            if (((_a = feedback.betaUser) === null || _a === void 0 ? void 0 : _a.email) !== betaUserEmail) {
                return res.status(403).json({
                    success: false,
                    error: {
                        code: 'FORBIDDEN',
                        message: 'Email does not match feedback submitter'
                    }
                });
            }
            feedback.startLiveSupport();
            await feedbackRepo.save(feedback);
            // Notify admins via WebSocket
            // Note: RealtimeFeedbackService instance should be injected or accessed differently
            // For now, commenting out to fix the build error
            // await realtimeFeedbackService.notifyNewFeedback(feedback);
            res.json({
                success: true,
                data: { feedback },
                message: 'Live support started'
            });
        }
        catch (error) {
            // Error log removed
            res.status(500).json({
                success: false,
                error: {
                    code: 'INTERNAL_ERROR',
                    message: 'Failed to start live support'
                }
            });
        }
    }
    async markFeedbackViewed(req, res) {
        try {
            const { id } = req.params;
            const user = req.user;
            if (!['admin', 'manager'].includes(user.role)) {
                return res.status(403).json({
                    success: false,
                    error: {
                        code: 'FORBIDDEN',
                        message: 'Admin or manager access required'
                    }
                });
            }
            const feedbackRepo = connection_1.AppDataSource.getRepository(BetaFeedback_1.BetaFeedback);
            const feedback = await feedbackRepo.findOne({ where: { id } });
            if (!feedback) {
                return res.status(404).json({
                    success: false,
                    error: {
                        code: 'NOT_FOUND',
                        message: 'Feedback not found'
                    }
                });
            }
            feedback.markAsViewed(user.id);
            await feedbackRepo.save(feedback);
            res.json({
                success: true,
                data: { feedback }
            });
        }
        catch (error) {
            // Error log removed
            res.status(500).json({
                success: false,
                error: {
                    code: 'INTERNAL_ERROR',
                    message: 'Failed to mark feedback as viewed'
                }
            });
        }
    }
    async getRealtimeStats(req, res) {
        try {
            const user = req.user;
            if (user.role !== 'admin') {
                return res.status(403).json({
                    success: false,
                    error: {
                        code: 'FORBIDDEN',
                        message: 'Admin access required'
                    }
                });
            }
            const feedbackRepo = connection_1.AppDataSource.getRepository(BetaFeedback_1.BetaFeedback);
            const conversationRepo = connection_1.AppDataSource.getRepository(FeedbackConversation_1.FeedbackConversation);
            const [totalFeedback, pendingFeedback, activeFeedback, criticalFeedback, activeConversations, needsAttentionFeedback] = await Promise.all([
                feedbackRepo.count(),
                feedbackRepo.count({ where: { status: BetaFeedback_1.FeedbackStatus.PENDING } }),
                feedbackRepo.count({ where: { isLive: true } }),
                feedbackRepo.count({ where: { priority: BetaFeedback_1.FeedbackPriority.CRITICAL } }),
                conversationRepo.count({ where: { status: FeedbackConversation_1.ConversationStatus.ACTIVE } }),
                feedbackRepo.count({ where: { needsImmediateAttention: true } })
            ]);
            const stats = {
                totalFeedback,
                pendingFeedback,
                activeFeedback,
                criticalFeedback,
                activeConversations,
                needsAttentionFeedback,
                connectedAdmins: 0, // realtimeFeedbackService.getConnectedAdmins().length,
                connectedUsers: 0, // realtimeFeedbackService.getConnectedUsers().length,
                timestamp: new Date().toISOString()
            };
            res.json({
                success: true,
                data: { stats }
            });
        }
        catch (error) {
            // Error log removed
            res.status(500).json({
                success: false,
                error: {
                    code: 'INTERNAL_ERROR',
                    message: 'Failed to fetch realtime stats'
                }
            });
        }
    }
    async getPendingNotifications(req, res) {
        try {
            const user = req.user;
            if (!['admin', 'manager'].includes(user.role)) {
                return res.status(403).json({
                    success: false,
                    error: {
                        code: 'FORBIDDEN',
                        message: 'Admin or manager access required'
                    }
                });
            }
            // Get recent high-priority feedback that needs attention
            const feedbackRepo = connection_1.AppDataSource.getRepository(BetaFeedback_1.BetaFeedback);
            const recentFeedback = await feedbackRepo.find({
                where: [
                    { needsImmediateAttention: true },
                    { priority: BetaFeedback_1.FeedbackPriority.CRITICAL },
                    { isLive: true }
                ],
                relations: ['betaUser'],
                order: { createdAt: 'DESC' },
                take: 50
            });
            const notifications = recentFeedback.map((feedback) => {
                var _a;
                return ({
                    id: `feedback_${feedback.id}`,
                    type: feedback.isLive ? 'urgent_feedback' : 'new_feedback',
                    title: feedback.isLive ? 'Live Support Request' : 'High Priority Feedback',
                    message: `${feedback.type.replace('_', ' ')} from ${((_a = feedback.betaUser) === null || _a === void 0 ? void 0 : _a.name) || 'Unknown User'}: ${feedback.title}`,
                    data: { feedbackId: feedback.id },
                    timestamp: feedback.createdAt.toISOString(),
                    priority: feedback.priority === BetaFeedback_1.FeedbackPriority.CRITICAL ? 'critical' : 'high',
                    feedbackId: feedback.id
                });
            });
            res.json({
                success: true,
                data: { notifications },
                meta: {
                    count: notifications.length
                }
            });
        }
        catch (error) {
            // Error log removed
            res.status(500).json({
                success: false,
                error: {
                    code: 'INTERNAL_ERROR',
                    message: 'Failed to fetch pending notifications'
                }
            });
        }
    }
}
exports.BetaUserController = BetaUserController;
// Validation middleware
exports.betaUserRegistrationValidation = [
    (0, express_validator_1.body)('email').isEmail().withMessage('Valid email is required'),
    (0, express_validator_1.body)('name').isLength({ min: 2, max: 100 }).withMessage('Name must be 2-100 characters'),
    (0, express_validator_1.body)('type').optional().isIn(Object.values(BetaUser_1.BetaUserType)).withMessage('Invalid user type'),
    (0, express_validator_1.body)('interestArea').optional().isIn(Object.values(BetaUser_1.InterestArea)).withMessage('Invalid interest area'),
    (0, express_validator_1.body)('phone').optional().isLength({ max: 20 }).withMessage('Phone number too long'),
    (0, express_validator_1.body)('company').optional().isLength({ max: 100 }).withMessage('Company name too long'),
    (0, express_validator_1.body)('jobTitle').optional().isLength({ max: 100 }).withMessage('Job title too long'),
    (0, express_validator_1.body)('useCase').optional().isLength({ max: 1000 }).withMessage('Use case too long'),
    (0, express_validator_1.body)('expectations').optional().isLength({ max: 1000 }).withMessage('Expectations too long')
];
exports.feedbackSubmissionValidation = [
    (0, express_validator_1.body)('betaUserEmail').isEmail().withMessage('Valid beta user email is required'),
    (0, express_validator_1.body)('type').isIn(Object.values(BetaFeedback_1.FeedbackType)).withMessage('Invalid feedback type'),
    (0, express_validator_1.body)('title').isLength({ min: 5, max: 200 }).withMessage('Title must be 5-200 characters'),
    (0, express_validator_1.body)('description').isLength({ min: 10, max: 5000 }).withMessage('Description must be 10-5000 characters'),
    (0, express_validator_1.body)('priority').optional().isIn(Object.values(BetaFeedback_1.FeedbackPriority)).withMessage('Invalid priority'),
    (0, express_validator_1.body)('feature').optional().isIn(Object.values(BetaFeedback_1.SignageFeature)).withMessage('Invalid feature'),
    (0, express_validator_1.body)('rating').optional().isInt({ min: 1, max: 5 }).withMessage('Rating must be 1-5'),
    (0, express_validator_1.body)('reproductionSteps').optional().isLength({ max: 2000 }).withMessage('Reproduction steps too long'),
    (0, express_validator_1.body)('expectedBehavior').optional().isLength({ max: 1000 }).withMessage('Expected behavior too long'),
    (0, express_validator_1.body)('actualBehavior').optional().isLength({ max: 1000 }).withMessage('Actual behavior too long'),
    (0, express_validator_1.body)('additionalComments').optional().isLength({ max: 1000 }).withMessage('Additional comments too long')
];
exports.betaUserController = new BetaUserController();
//# sourceMappingURL=betaUserController.js.map
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RealtimeFeedbackService = void 0;
const connection_1 = require("../database/connection");
const BetaFeedback_1 = require("../entities/BetaFeedback");
const FeedbackConversation_1 = require("../entities/FeedbackConversation");
const BetaUser_1 = require("../entities/BetaUser");
const User_1 = require("../entities/User");
class RealtimeFeedbackService {
    constructor(io) {
        this.adminRooms = new Map();
        this.userRooms = new Map();
        this.conversationRooms = new Map();
        this.io = io;
        this.setupSocketHandlers();
    }
    setupSocketHandlers() {
        this.io.on('connection', (socket) => {
            // Admin join handler
            socket.on('admin:join', async (data) => {
                try {
                    if (data.userRole === 'admin' || data.userRole === 'manager') {
                        await this.handleAdminJoin(socket, data.userId);
                    }
                }
                catch (error) {
                    // Error log removed
                    socket.emit('error', { message: 'Failed to join admin room' });
                }
            });
            // Beta user join handler
            socket.on('user:join', async (data) => {
                try {
                    await this.handleUserJoin(socket, data.betaUserId, data.email);
                }
                catch (error) {
                    // Error log removed
                    socket.emit('error', { message: 'Failed to join user room' });
                }
            });
            // Join conversation room
            socket.on('conversation:join', async (data) => {
                try {
                    await this.handleConversationJoin(socket, data.conversationId);
                }
                catch (error) {
                    // Error log removed
                    socket.emit('error', { message: 'Failed to join conversation' });
                }
            });
            // Send message
            socket.on('message:send', async (data) => {
                try {
                    await this.handleSendMessage(socket, data);
                }
                catch (error) {
                    // Error log removed
                    socket.emit('error', { message: 'Failed to send message' });
                }
            });
            // Mark message as read
            socket.on('message:read', async (data) => {
                try {
                    await this.handleMarkMessageRead(data.messageId);
                }
                catch (error) {
                    // Error log removed
                }
            });
            // Feedback viewed
            socket.on('feedback:viewed', async (data) => {
                try {
                    await this.handleFeedbackViewed(data.feedbackId, data.viewedBy);
                }
                catch (error) {
                    // Error log removed
                }
            });
            // Start live support
            socket.on('feedback:start_live_support', async (data) => {
                try {
                    await this.handleStartLiveSupport(data.feedbackId);
                }
                catch (error) {
                    // Error log removed
                    socket.emit('error', { message: 'Failed to start live support' });
                }
            });
            // Disconnect handler
            socket.on('disconnect', () => {
                this.handleDisconnect(socket);
            });
        });
    }
    async handleAdminJoin(socket, userId) {
        const adminRoom = {
            socketId: socket.id,
            userId,
            joinedAt: new Date(),
            isActive: true
        };
        this.adminRooms.set(socket.id, adminRoom);
        socket.join('admin_notifications');
        socket.join(`admin_${userId}`);
        // Send current stats
        const stats = await this.getRealtimeStats();
        socket.emit('admin:stats', stats);
        // Send pending notifications
        const pendingNotifications = await this.getPendingNotifications(userId);
        socket.emit('admin:pending_notifications', pendingNotifications);
    }
    async handleUserJoin(socket, betaUserId, email) {
        // Verify beta user
        const betaUserRepo = connection_1.AppDataSource.getRepository(BetaUser_1.BetaUser);
        const betaUser = await betaUserRepo.findOne({
            where: { id: betaUserId, email }
        });
        if (!betaUser) {
            socket.emit('error', { message: 'Invalid beta user' });
            return;
        }
        const userRoom = {
            socketId: socket.id,
            betaUserId,
            joinedAt: new Date(),
            isActive: true
        };
        this.userRooms.set(socket.id, userRoom);
        socket.join(`user_${betaUserId}`);
        // Send user's active conversations
        const conversations = await this.getUserConversations(betaUserId);
        socket.emit('user:conversations', conversations);
    }
    async handleConversationJoin(socket, conversationId) {
        const conversationRepo = connection_1.AppDataSource.getRepository(FeedbackConversation_1.FeedbackConversation);
        const conversation = await conversationRepo.findOne({
            where: { id: conversationId },
            relations: ['feedback', 'betaUser', 'messages']
        });
        if (!conversation) {
            socket.emit('error', { message: 'Conversation not found' });
            return;
        }
        socket.join(`conversation_${conversationId}`);
        if (!this.conversationRooms.has(conversationId)) {
            this.conversationRooms.set(conversationId, new Set());
        }
        this.conversationRooms.get(conversationId).add(socket.id);
        // Send conversation history
        const messages = await this.getConversationMessages(conversationId);
        socket.emit('conversation:history', messages);
    }
    async handleSendMessage(socket, data) {
        const messageRepo = connection_1.AppDataSource.getRepository(FeedbackConversation_1.ConversationMessage);
        const conversationRepo = connection_1.AppDataSource.getRepository(FeedbackConversation_1.FeedbackConversation);
        const conversation = await conversationRepo.findOne({
            where: { id: data.conversationId },
            relations: ['feedback', 'betaUser']
        });
        if (!conversation) {
            socket.emit('error', { message: 'Conversation not found' });
            return;
        }
        // Create message
        const message = messageRepo.create({
            conversationId: data.conversationId,
            senderId: data.senderId,
            senderRole: data.senderRole,
            messageType: data.messageType || FeedbackConversation_1.MessageType.TEXT,
            content: data.content,
            metadata: {
                delivered: true,
                deliveredAt: new Date(),
                ipAddress: socket.handshake.address
            }
        });
        await messageRepo.save(message);
        // Update conversation
        if (data.senderRole === FeedbackConversation_1.ParticipantRole.ADMIN) {
            conversation.updateLastAdminResponse();
        }
        else if (data.senderRole === FeedbackConversation_1.ParticipantRole.BETA_USER) {
            conversation.updateLastUserMessage();
        }
        await conversationRepo.save(conversation);
        // Broadcast to conversation room
        this.io.to(`conversation_${data.conversationId}`).emit('message:new', {
            ...message,
            senderName: await this.getSenderName(data.senderId, data.senderRole)
        });
        // Send notification to admins if user message
        if (data.senderRole === FeedbackConversation_1.ParticipantRole.BETA_USER) {
            await this.notifyAdmins({
                id: `message_${message.id}`,
                type: 'new_message',
                title: 'New Message',
                message: `New message from ${conversation.betaUser.name}`,
                data: { conversationId: data.conversationId, messageId: message.id },
                timestamp: new Date().toISOString(),
                priority: conversation.isUrgent ? 'high' : 'medium',
                conversationId: data.conversationId
            });
        }
    }
    async handleMarkMessageRead(messageId) {
        const messageRepo = connection_1.AppDataSource.getRepository(FeedbackConversation_1.ConversationMessage);
        const message = await messageRepo.findOne({ where: { id: messageId } });
        if (message) {
            message.markAsRead();
            await messageRepo.save(message);
        }
    }
    async handleFeedbackViewed(feedbackId, viewedBy) {
        const feedbackRepo = connection_1.AppDataSource.getRepository(BetaFeedback_1.BetaFeedback);
        const feedback = await feedbackRepo.findOne({ where: { id: feedbackId } });
        if (feedback) {
            feedback.markAsViewed(viewedBy);
            await feedbackRepo.save(feedback);
            // Broadcast to admins
            this.io.to('admin_notifications').emit('feedback:viewed', {
                feedbackId,
                viewedBy,
                viewedAt: feedback.lastViewedAt
            });
        }
    }
    async handleStartLiveSupport(feedbackId) {
        var _a;
        const feedbackRepo = connection_1.AppDataSource.getRepository(BetaFeedback_1.BetaFeedback);
        const conversationRepo = connection_1.AppDataSource.getRepository(FeedbackConversation_1.FeedbackConversation);
        const feedback = await feedbackRepo.findOne({
            where: { id: feedbackId },
            relations: ['betaUser']
        });
        if (!feedback) {
            return;
        }
        feedback.startLiveSupport();
        await feedbackRepo.save(feedback);
        // Create or find active conversation
        let conversation = await conversationRepo.findOne({
            where: {
                feedbackId,
                status: FeedbackConversation_1.ConversationStatus.ACTIVE
            }
        });
        if (!conversation) {
            conversation = conversationRepo.create({
                feedbackId,
                betaUserId: feedback.betaUserId,
                status: FeedbackConversation_1.ConversationStatus.ACTIVE,
                isUrgent: feedback.priority === BetaFeedback_1.FeedbackPriority.CRITICAL || feedback.priority === BetaFeedback_1.FeedbackPriority.HIGH
            });
            await conversationRepo.save(conversation);
        }
        // Notify admins
        await this.notifyAdmins({
            id: `live_support_${feedbackId}`,
            type: 'urgent_feedback',
            title: 'Live Support Request',
            message: `${((_a = feedback.betaUser) === null || _a === void 0 ? void 0 : _a.name) || 'Unknown User'} requests live support for: ${feedback.title}`,
            data: { feedbackId, conversationId: conversation.id },
            timestamp: new Date().toISOString(),
            priority: 'critical',
            feedbackId
        });
        // Notify user
        this.io.to(`user_${feedback.betaUserId}`).emit('feedback:live_support_started', {
            feedbackId,
            conversationId: conversation.id
        });
    }
    handleDisconnect(socket) {
        // Remove from admin rooms
        this.adminRooms.delete(socket.id);
        // Remove from user rooms
        this.userRooms.delete(socket.id);
        // Remove from conversation rooms
        this.conversationRooms.forEach((sockets, conversationId) => {
            sockets.delete(socket.id);
            if (sockets.size === 0) {
                this.conversationRooms.delete(conversationId);
            }
        });
    }
    // Public methods for external use
    async notifyNewFeedback(feedback) {
        var _a;
        const notification = {
            id: `feedback_${feedback.id}`,
            type: 'new_feedback',
            title: 'New Feedback Received',
            message: `${feedback.type.replace('_', ' ')} from ${((_a = feedback.betaUser) === null || _a === void 0 ? void 0 : _a.name) || 'Unknown User'}`,
            data: { feedbackId: feedback.id },
            timestamp: new Date().toISOString(),
            priority: this.mapPriorityToNotificationPriority(feedback.priority),
            feedbackId: feedback.id
        };
        await this.notifyAdmins(notification);
    }
    async notifyFeedbackUpdate(feedback, updateType) {
        const notification = {
            id: `feedback_update_${feedback.id}`,
            type: 'feedback_update',
            title: 'Feedback Updated',
            message: `Feedback ${updateType}: ${feedback.title}`,
            data: { feedbackId: feedback.id, updateType },
            timestamp: new Date().toISOString(),
            priority: this.mapPriorityToNotificationPriority(feedback.priority),
            feedbackId: feedback.id
        };
        await this.notifyAdmins(notification);
    }
    async notifyAdmins(notification) {
        this.io.to('admin_notifications').emit('notification:new', notification);
    }
    async getRealtimeStats() {
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
        return {
            totalFeedback,
            pendingFeedback,
            activeFeedback,
            criticalFeedback,
            activeConversations,
            needsAttentionFeedback,
            connectedAdmins: this.adminRooms.size,
            connectedUsers: this.userRooms.size,
            timestamp: new Date().toISOString()
        };
    }
    async getPendingNotifications(userId) {
        // This would fetch from a notification storage if implemented
        // For now, return empty array
        return [];
    }
    async getUserConversations(betaUserId) {
        const conversationRepo = connection_1.AppDataSource.getRepository(FeedbackConversation_1.FeedbackConversation);
        return await conversationRepo.find({
            where: { betaUserId },
            relations: ['feedback'],
            order: { createdAt: 'DESC' }
        });
    }
    async getConversationMessages(conversationId) {
        const messageRepo = connection_1.AppDataSource.getRepository(FeedbackConversation_1.ConversationMessage);
        return await messageRepo.find({
            where: { conversationId },
            order: { createdAt: 'ASC' }
        });
    }
    async getSenderName(senderId, senderRole) {
        if (!senderId)
            return 'System';
        if (senderRole === FeedbackConversation_1.ParticipantRole.ADMIN) {
            const userRepo = connection_1.AppDataSource.getRepository(User_1.User);
            const user = await userRepo.findOne({ where: { id: senderId } });
            return (user === null || user === void 0 ? void 0 : user.name) || 'Admin';
        }
        else if (senderRole === FeedbackConversation_1.ParticipantRole.BETA_USER) {
            const betaUserRepo = connection_1.AppDataSource.getRepository(BetaUser_1.BetaUser);
            const betaUser = await betaUserRepo.findOne({ where: { id: senderId } });
            return (betaUser === null || betaUser === void 0 ? void 0 : betaUser.name) || 'Beta User';
        }
        return 'Unknown';
    }
    mapPriorityToNotificationPriority(priority) {
        switch (priority) {
            case BetaFeedback_1.FeedbackPriority.LOW: return 'low';
            case BetaFeedback_1.FeedbackPriority.MEDIUM: return 'medium';
            case BetaFeedback_1.FeedbackPriority.HIGH: return 'high';
            case BetaFeedback_1.FeedbackPriority.CRITICAL: return 'critical';
            default: return 'medium';
        }
    }
    // Utility methods
    getConnectedAdmins() {
        return Array.from(this.adminRooms.values());
    }
    getConnectedUsers() {
        return Array.from(this.userRooms.values());
    }
    getActiveConversations() {
        return Array.from(this.conversationRooms.keys());
    }
}
exports.RealtimeFeedbackService = RealtimeFeedbackService;
//# sourceMappingURL=realtimeFeedbackService.js.map
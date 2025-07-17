import { Server, Socket } from 'socket.io';
import { AppDataSource } from '../database/connection';
import { BetaFeedback, FeedbackStatus, FeedbackPriority } from '../entities/BetaFeedback';
import { FeedbackConversation, ConversationMessage, ConversationStatus, MessageType, ParticipantRole } from '../entities/FeedbackConversation';
import { BetaUser } from '../entities/BetaUser';
import { User } from '../entities/User';

export interface NotificationData {
  feedbackId?: string;
  conversationId?: string;
  messageId?: string;
  updateType?: string;
  [key: string]: unknown;
}

export interface NotificationPayload {
  id: string;
  type: 'new_feedback' | 'feedback_update' | 'new_message' | 'conversation_status' | 'urgent_feedback';
  title: string;
  message: string;
  data?: NotificationData;
  timestamp: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  userId?: string;
  feedbackId?: string;
  conversationId?: string;
}

export interface AdminRoom {
  socketId: string;
  userId: string;
  joinedAt: Date;
  isActive: boolean;
}

export interface UserRoom {
  socketId: string;
  betaUserId: string;
  joinedAt: Date;
  isActive: boolean;
}

export class RealtimeFeedbackService {
  private io: Server;
  private adminRooms: Map<string, AdminRoom> = new Map();
  private userRooms: Map<string, UserRoom> = new Map();
  private conversationRooms: Map<string, Set<string>> = new Map();

  constructor(io: Server) {
    this.io = io;
    this.setupSocketHandlers();
  }

  private setupSocketHandlers() {
    this.io.on('connection', (socket: Socket) => {
      console.log('Client connected:', socket.id);

      // Admin join handler
      socket.on('admin:join', async (data: { userId: string, userRole: string }) => {
        try {
          if (data.userRole === 'admin' || data.userRole === 'manager') {
            await this.handleAdminJoin(socket, data.userId);
          }
        } catch (error) {
          console.error('Error handling admin join:', error);
          socket.emit('error', { message: 'Failed to join admin room' });
        }
      });

      // Beta user join handler
      socket.on('user:join', async (data: { betaUserId: string, email: string }) => {
        try {
          await this.handleUserJoin(socket, data.betaUserId, data.email);
        } catch (error) {
          console.error('Error handling user join:', error);
          socket.emit('error', { message: 'Failed to join user room' });
        }
      });

      // Join conversation room
      socket.on('conversation:join', async (data: { conversationId: string }) => {
        try {
          await this.handleConversationJoin(socket, data.conversationId);
        } catch (error) {
          console.error('Error joining conversation:', error);
          socket.emit('error', { message: 'Failed to join conversation' });
        }
      });

      // Send message
      socket.on('message:send', async (data: { 
        conversationId: string, 
        content: string, 
        messageType?: MessageType,
        senderId?: string,
        senderRole: ParticipantRole
      }) => {
        try {
          await this.handleSendMessage(socket, data);
        } catch (error) {
          console.error('Error sending message:', error);
          socket.emit('error', { message: 'Failed to send message' });
        }
      });

      // Mark message as read
      socket.on('message:read', async (data: { messageId: string }) => {
        try {
          await this.handleMarkMessageRead(data.messageId);
        } catch (error) {
          console.error('Error marking message as read:', error);
        }
      });

      // Feedback viewed
      socket.on('feedback:viewed', async (data: { feedbackId: string, viewedBy: string }) => {
        try {
          await this.handleFeedbackViewed(data.feedbackId, data.viewedBy);
        } catch (error) {
          console.error('Error marking feedback as viewed:', error);
        }
      });

      // Start live support
      socket.on('feedback:start_live_support', async (data: { feedbackId: string }) => {
        try {
          await this.handleStartLiveSupport(data.feedbackId);
        } catch (error) {
          console.error('Error starting live support:', error);
          socket.emit('error', { message: 'Failed to start live support' });
        }
      });

      // Disconnect handler
      socket.on('disconnect', () => {
        console.log('Client disconnected:', socket.id);
        this.handleDisconnect(socket);
      });
    });
  }

  private async handleAdminJoin(socket: Socket, userId: string) {
    const adminRoom: AdminRoom = {
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

    console.log(`Admin ${userId} joined with socket ${socket.id}`);
  }

  private async handleUserJoin(socket: Socket, betaUserId: string, email: string) {
    // Verify beta user
    const betaUserRepo = AppDataSource.getRepository(BetaUser);
    const betaUser = await betaUserRepo.findOne({
      where: { id: betaUserId, email }
    });

    if (!betaUser) {
      socket.emit('error', { message: 'Invalid beta user' });
      return;
    }

    const userRoom: UserRoom = {
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

    console.log(`Beta user ${betaUserId} joined with socket ${socket.id}`);
  }

  private async handleConversationJoin(socket: Socket, conversationId: string) {
    const conversationRepo = AppDataSource.getRepository(FeedbackConversation);
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
    this.conversationRooms.get(conversationId)!.add(socket.id);

    // Send conversation history
    const messages = await this.getConversationMessages(conversationId);
    socket.emit('conversation:history', messages);

    console.log(`Socket ${socket.id} joined conversation ${conversationId}`);
  }

  private async handleSendMessage(socket: Socket, data: {
    conversationId: string;
    content: string;
    messageType?: MessageType;
    senderId?: string;
    senderRole: ParticipantRole;
  }) {
    const messageRepo = AppDataSource.getRepository(ConversationMessage);
    const conversationRepo = AppDataSource.getRepository(FeedbackConversation);

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
      messageType: data.messageType || MessageType.TEXT,
      content: data.content,
      metadata: {
        delivered: true,
        deliveredAt: new Date(),
        ipAddress: socket.handshake.address
      }
    });

    await messageRepo.save(message);

    // Update conversation
    if (data.senderRole === ParticipantRole.ADMIN) {
      conversation.updateLastAdminResponse();
    } else if (data.senderRole === ParticipantRole.BETA_USER) {
      conversation.updateLastUserMessage();
    }

    await conversationRepo.save(conversation);

    // Broadcast to conversation room
    this.io.to(`conversation_${data.conversationId}`).emit('message:new', {
      ...message,
      senderName: await this.getSenderName(data.senderId, data.senderRole)
    });

    // Send notification to admins if user message
    if (data.senderRole === ParticipantRole.BETA_USER) {
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

    console.log(`Message sent in conversation ${data.conversationId}`);
  }

  private async handleMarkMessageRead(messageId: string) {
    const messageRepo = AppDataSource.getRepository(ConversationMessage);
    const message = await messageRepo.findOne({ where: { id: messageId } });

    if (message) {
      message.markAsRead();
      await messageRepo.save(message);
    }
  }

  private async handleFeedbackViewed(feedbackId: string, viewedBy: string) {
    const feedbackRepo = AppDataSource.getRepository(BetaFeedback);
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

  private async handleStartLiveSupport(feedbackId: string) {
    const feedbackRepo = AppDataSource.getRepository(BetaFeedback);
    const conversationRepo = AppDataSource.getRepository(FeedbackConversation);

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
        status: ConversationStatus.ACTIVE 
      }
    });

    if (!conversation) {
      conversation = conversationRepo.create({
        feedbackId,
        betaUserId: feedback.betaUserId,
        status: ConversationStatus.ACTIVE,
        isUrgent: feedback.priority === FeedbackPriority.CRITICAL || feedback.priority === FeedbackPriority.HIGH
      });
      await conversationRepo.save(conversation);
    }

    // Notify admins
    await this.notifyAdmins({
      id: `live_support_${feedbackId}`,
      type: 'urgent_feedback',
      title: 'Live Support Request',
      message: `${feedback.betaUser?.name || 'Unknown User'} requests live support for: ${feedback.title}`,
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

  private handleDisconnect(socket: Socket) {
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
  public async notifyNewFeedback(feedback: BetaFeedback) {
    const notification: NotificationPayload = {
      id: `feedback_${feedback.id}`,
      type: 'new_feedback',
      title: 'New Feedback Received',
      message: `${feedback.type.replace('_', ' ')} from ${feedback.betaUser?.name || 'Unknown User'}`,
      data: { feedbackId: feedback.id },
      timestamp: new Date().toISOString(),
      priority: this.mapPriorityToNotificationPriority(feedback.priority),
      feedbackId: feedback.id
    };

    await this.notifyAdmins(notification);
  }

  public async notifyFeedbackUpdate(feedback: BetaFeedback, updateType: string) {
    const notification: NotificationPayload = {
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

  private async notifyAdmins(notification: NotificationPayload) {
    this.io.to('admin_notifications').emit('notification:new', notification);
  }

  private async getRealtimeStats() {
    const feedbackRepo = AppDataSource.getRepository(BetaFeedback);
    const conversationRepo = AppDataSource.getRepository(FeedbackConversation);

    const [
      totalFeedback,
      pendingFeedback,
      activeFeedback,
      criticalFeedback,
      activeConversations,
      needsAttentionFeedback
    ] = await Promise.all([
      feedbackRepo.count(),
      feedbackRepo.count({ where: { status: FeedbackStatus.PENDING } }),
      feedbackRepo.count({ where: { isLive: true } }),
      feedbackRepo.count({ where: { priority: FeedbackPriority.CRITICAL } }),
      conversationRepo.count({ where: { status: ConversationStatus.ACTIVE } }),
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

  private async getPendingNotifications(userId: string): Promise<NotificationPayload[]> {
    // This would fetch from a notification storage if implemented
    // For now, return empty array
    return [];
  }

  private async getUserConversations(betaUserId: string) {
    const conversationRepo = AppDataSource.getRepository(FeedbackConversation);
    return await conversationRepo.find({
      where: { betaUserId },
      relations: ['feedback'],
      order: { createdAt: 'DESC' }
    });
  }

  private async getConversationMessages(conversationId: string) {
    const messageRepo = AppDataSource.getRepository(ConversationMessage);
    return await messageRepo.find({
      where: { conversationId },
      order: { createdAt: 'ASC' }
    });
  }

  private async getSenderName(senderId: string | undefined, senderRole: ParticipantRole): Promise<string> {
    if (!senderId) return 'System';

    if (senderRole === ParticipantRole.ADMIN) {
      const userRepo = AppDataSource.getRepository(User);
      const user = await userRepo.findOne({ where: { id: senderId } });
      return user?.name || 'Admin';
    } else if (senderRole === ParticipantRole.BETA_USER) {
      const betaUserRepo = AppDataSource.getRepository(BetaUser);
      const betaUser = await betaUserRepo.findOne({ where: { id: senderId } });
      return betaUser?.name || 'Beta User';
    }

    return 'Unknown';
  }

  private mapPriorityToNotificationPriority(priority: FeedbackPriority): 'low' | 'medium' | 'high' | 'critical' {
    switch (priority) {
      case FeedbackPriority.LOW: return 'low';
      case FeedbackPriority.MEDIUM: return 'medium';
      case FeedbackPriority.HIGH: return 'high';
      case FeedbackPriority.CRITICAL: return 'critical';
      default: return 'medium';
    }
  }

  // Utility methods
  public getConnectedAdmins(): AdminRoom[] {
    return Array.from(this.adminRooms.values());
  }

  public getConnectedUsers(): UserRoom[] {
    return Array.from(this.userRooms.values());
  }

  public getActiveConversations(): string[] {
    return Array.from(this.conversationRooms.keys());
  }
}
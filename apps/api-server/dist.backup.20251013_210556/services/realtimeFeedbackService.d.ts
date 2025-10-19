import { Server } from 'socket.io';
import { BetaFeedback } from '../entities/BetaFeedback';
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
export declare class RealtimeFeedbackService {
    private io;
    private adminRooms;
    private userRooms;
    private conversationRooms;
    constructor(io: Server);
    private setupSocketHandlers;
    private handleAdminJoin;
    private handleUserJoin;
    private handleConversationJoin;
    private handleSendMessage;
    private handleMarkMessageRead;
    private handleFeedbackViewed;
    private handleStartLiveSupport;
    private handleDisconnect;
    notifyNewFeedback(feedback: BetaFeedback): Promise<void>;
    notifyFeedbackUpdate(feedback: BetaFeedback, updateType: string): Promise<void>;
    private notifyAdmins;
    private getRealtimeStats;
    private getPendingNotifications;
    private getUserConversations;
    private getConversationMessages;
    private getSenderName;
    private mapPriorityToNotificationPriority;
    getConnectedAdmins(): AdminRoom[];
    getConnectedUsers(): UserRoom[];
    getActiveConversations(): string[];
}
//# sourceMappingURL=realtimeFeedbackService.d.ts.map
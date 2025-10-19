import { BetaFeedback } from './BetaFeedback';
import { BetaUser } from './BetaUser';
import { User } from './User';
export declare enum ConversationStatus {
    ACTIVE = "active",
    PAUSED = "paused",
    CLOSED = "closed",
    ARCHIVED = "archived"
}
export declare enum MessageType {
    TEXT = "text",
    IMAGE = "image",
    FILE = "file",
    SYSTEM = "system",
    QUICK_RESPONSE = "quick_response"
}
export declare enum ParticipantRole {
    BETA_USER = "beta_user",
    ADMIN = "admin",
    SYSTEM = "system"
}
export declare class FeedbackConversation {
    id: string;
    title?: string;
    status: ConversationStatus;
    feedbackId: string;
    betaUserId: string;
    assignedTo?: string;
    isUrgent: boolean;
    lastMessageAt?: Date;
    lastAdminResponseAt?: Date;
    lastUserMessageAt?: Date;
    summary?: string;
    tags?: string[];
    metadata?: {
        participantCount?: number;
        messageCount?: number;
        avgResponseTime?: number;
        satisfactionRating?: number;
        escalationLevel?: number;
        [key: string]: number | undefined;
    };
    createdAt: Date;
    updatedAt: Date;
    feedback: BetaFeedback;
    betaUser: BetaUser;
    assignee?: User;
    messages: ConversationMessage[];
    isActive(): boolean;
    canReceiveMessages(): boolean;
    assignTo(userId: string): void;
    markAsUrgent(): void;
    updateLastMessageTime(): void;
    updateLastAdminResponse(): void;
    updateLastUserMessage(): void;
    close(): void;
    reopen(): void;
    pause(): void;
    archive(): void;
    getResponseTime(): number | null;
    needsAdminResponse(): boolean;
    addTag(tag: string): void;
    removeTag(tag: string): void;
}
export declare class ConversationMessage {
    id: string;
    conversationId: string;
    senderId?: string;
    senderRole: ParticipantRole;
    senderName?: string;
    messageType: MessageType;
    content: string;
    attachments?: string[];
    isEdited: boolean;
    editedAt?: Date;
    isRead: boolean;
    readAt?: Date;
    replyToId?: string;
    metadata?: {
        delivered?: boolean;
        deliveredAt?: Date;
        ipAddress?: string;
        userAgent?: string;
        [key: string]: boolean | Date | string | undefined;
    };
    createdAt: Date;
    updatedAt: Date;
    conversation: FeedbackConversation;
    sender?: User;
    replyTo?: ConversationMessage;
    markAsRead(): void;
    edit(newContent: string): void;
    isFromAdmin(): boolean;
    isFromUser(): boolean;
    isSystemMessage(): boolean;
    getAgeInMinutes(): number;
}
//# sourceMappingURL=FeedbackConversation.d.ts.map
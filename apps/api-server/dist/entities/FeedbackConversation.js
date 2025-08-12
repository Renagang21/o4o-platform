"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ConversationMessage = exports.FeedbackConversation = exports.ParticipantRole = exports.MessageType = exports.ConversationStatus = void 0;
const typeorm_1 = require("typeorm");
const BetaFeedback_1 = require("./BetaFeedback");
const BetaUser_1 = require("./BetaUser");
const User_1 = require("./User");
var ConversationStatus;
(function (ConversationStatus) {
    ConversationStatus["ACTIVE"] = "active";
    ConversationStatus["PAUSED"] = "paused";
    ConversationStatus["CLOSED"] = "closed";
    ConversationStatus["ARCHIVED"] = "archived";
})(ConversationStatus || (exports.ConversationStatus = ConversationStatus = {}));
var MessageType;
(function (MessageType) {
    MessageType["TEXT"] = "text";
    MessageType["IMAGE"] = "image";
    MessageType["FILE"] = "file";
    MessageType["SYSTEM"] = "system";
    MessageType["QUICK_RESPONSE"] = "quick_response";
})(MessageType || (exports.MessageType = MessageType = {}));
var ParticipantRole;
(function (ParticipantRole) {
    ParticipantRole["BETA_USER"] = "beta_user";
    ParticipantRole["ADMIN"] = "admin";
    ParticipantRole["SYSTEM"] = "system";
})(ParticipantRole || (exports.ParticipantRole = ParticipantRole = {}));
let FeedbackConversation = class FeedbackConversation {
    // Methods
    isActive() {
        return this.status === ConversationStatus.ACTIVE;
    }
    canReceiveMessages() {
        return [ConversationStatus.ACTIVE, ConversationStatus.PAUSED].includes(this.status);
    }
    assignTo(userId) {
        this.assignedTo = userId;
    }
    markAsUrgent() {
        this.isUrgent = true;
    }
    updateLastMessageTime() {
        this.lastMessageAt = new Date();
    }
    updateLastAdminResponse() {
        this.lastAdminResponseAt = new Date();
        this.updateLastMessageTime();
    }
    updateLastUserMessage() {
        this.lastUserMessageAt = new Date();
        this.updateLastMessageTime();
    }
    close() {
        this.status = ConversationStatus.CLOSED;
    }
    reopen() {
        this.status = ConversationStatus.ACTIVE;
    }
    pause() {
        this.status = ConversationStatus.PAUSED;
    }
    archive() {
        this.status = ConversationStatus.ARCHIVED;
    }
    getResponseTime() {
        if (!this.lastUserMessageAt || !this.lastAdminResponseAt) {
            return null;
        }
        if (this.lastUserMessageAt > this.lastAdminResponseAt) {
            return Date.now() - this.lastUserMessageAt.getTime();
        }
        return null;
    }
    needsAdminResponse() {
        return this.isActive() &&
            this.lastUserMessageAt !== undefined &&
            (this.lastAdminResponseAt === undefined ||
                this.lastUserMessageAt > this.lastAdminResponseAt);
    }
    addTag(tag) {
        if (!this.tags)
            this.tags = [];
        if (!this.tags.includes(tag)) {
            this.tags.push(tag);
        }
    }
    removeTag(tag) {
        if (this.tags) {
            this.tags = this.tags.filter((t) => t !== tag);
        }
    }
};
exports.FeedbackConversation = FeedbackConversation;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], FeedbackConversation.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 200, nullable: true }),
    __metadata("design:type", String)
], FeedbackConversation.prototype, "title", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'enum', enum: ConversationStatus, default: ConversationStatus.ACTIVE }),
    __metadata("design:type", String)
], FeedbackConversation.prototype, "status", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'uuid' }),
    __metadata("design:type", String)
], FeedbackConversation.prototype, "feedbackId", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'uuid' }),
    __metadata("design:type", String)
], FeedbackConversation.prototype, "betaUserId", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'uuid', nullable: true }),
    __metadata("design:type", String)
], FeedbackConversation.prototype, "assignedTo", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'boolean', default: false }),
    __metadata("design:type", Boolean)
], FeedbackConversation.prototype, "isUrgent", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'timestamp', nullable: true }),
    __metadata("design:type", Date)
], FeedbackConversation.prototype, "lastMessageAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'timestamp', nullable: true }),
    __metadata("design:type", Date)
], FeedbackConversation.prototype, "lastAdminResponseAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'timestamp', nullable: true }),
    __metadata("design:type", Date)
], FeedbackConversation.prototype, "lastUserMessageAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text', nullable: true }),
    __metadata("design:type", String)
], FeedbackConversation.prototype, "summary", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'simple-array', nullable: true }),
    __metadata("design:type", Array)
], FeedbackConversation.prototype, "tags", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'json', nullable: true }),
    __metadata("design:type", Object)
], FeedbackConversation.prototype, "metadata", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)(),
    __metadata("design:type", Date)
], FeedbackConversation.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)(),
    __metadata("design:type", Date)
], FeedbackConversation.prototype, "updatedAt", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => BetaFeedback_1.BetaFeedback, feedback => feedback.conversations),
    (0, typeorm_1.JoinColumn)({ name: 'feedbackId' }),
    __metadata("design:type", BetaFeedback_1.BetaFeedback)
], FeedbackConversation.prototype, "feedback", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => BetaUser_1.BetaUser, betaUser => betaUser.conversations),
    (0, typeorm_1.JoinColumn)({ name: 'betaUserId' }),
    __metadata("design:type", BetaUser_1.BetaUser)
], FeedbackConversation.prototype, "betaUser", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => User_1.User, { nullable: true }),
    (0, typeorm_1.JoinColumn)({ name: 'assignedTo' }),
    __metadata("design:type", User_1.User)
], FeedbackConversation.prototype, "assignee", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => ConversationMessage, message => message.conversation),
    __metadata("design:type", Array)
], FeedbackConversation.prototype, "messages", void 0);
exports.FeedbackConversation = FeedbackConversation = __decorate([
    (0, typeorm_1.Entity)('feedback_conversations'),
    (0, typeorm_1.Index)(['feedbackId', 'status']),
    (0, typeorm_1.Index)(['betaUserId', 'status']),
    (0, typeorm_1.Index)(['status', 'createdAt']),
    (0, typeorm_1.Index)(['assignedTo', 'status'])
], FeedbackConversation);
let ConversationMessage = class ConversationMessage {
    // Methods
    markAsRead() {
        this.isRead = true;
        this.readAt = new Date();
    }
    edit(newContent) {
        this.content = newContent;
        this.isEdited = true;
        this.editedAt = new Date();
    }
    isFromAdmin() {
        return this.senderRole === ParticipantRole.ADMIN;
    }
    isFromUser() {
        return this.senderRole === ParticipantRole.BETA_USER;
    }
    isSystemMessage() {
        return this.senderRole === ParticipantRole.SYSTEM;
    }
    getAgeInMinutes() {
        return Math.floor((Date.now() - this.createdAt.getTime()) / (1000 * 60));
    }
};
exports.ConversationMessage = ConversationMessage;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], ConversationMessage.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'uuid' }),
    __metadata("design:type", String)
], ConversationMessage.prototype, "conversationId", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'uuid', nullable: true }),
    __metadata("design:type", String)
], ConversationMessage.prototype, "senderId", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'enum', enum: ParticipantRole }),
    __metadata("design:type", String)
], ConversationMessage.prototype, "senderRole", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 100, nullable: true }),
    __metadata("design:type", String)
], ConversationMessage.prototype, "senderName", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'enum', enum: MessageType, default: MessageType.TEXT }),
    __metadata("design:type", String)
], ConversationMessage.prototype, "messageType", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text' }),
    __metadata("design:type", String)
], ConversationMessage.prototype, "content", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'simple-array', nullable: true }),
    __metadata("design:type", Array)
], ConversationMessage.prototype, "attachments", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'boolean', default: false }),
    __metadata("design:type", Boolean)
], ConversationMessage.prototype, "isEdited", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'timestamp', nullable: true }),
    __metadata("design:type", Date)
], ConversationMessage.prototype, "editedAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'boolean', default: false }),
    __metadata("design:type", Boolean)
], ConversationMessage.prototype, "isRead", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'timestamp', nullable: true }),
    __metadata("design:type", Date)
], ConversationMessage.prototype, "readAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'uuid', nullable: true }),
    __metadata("design:type", String)
], ConversationMessage.prototype, "replyToId", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'json', nullable: true }),
    __metadata("design:type", Object)
], ConversationMessage.prototype, "metadata", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)(),
    __metadata("design:type", Date)
], ConversationMessage.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)(),
    __metadata("design:type", Date)
], ConversationMessage.prototype, "updatedAt", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => FeedbackConversation, conversation => conversation.messages),
    (0, typeorm_1.JoinColumn)({ name: 'conversationId' }),
    __metadata("design:type", FeedbackConversation)
], ConversationMessage.prototype, "conversation", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => User_1.User, { nullable: true }),
    (0, typeorm_1.JoinColumn)({ name: 'senderId' }),
    __metadata("design:type", User_1.User)
], ConversationMessage.prototype, "sender", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => ConversationMessage, { nullable: true }),
    (0, typeorm_1.JoinColumn)({ name: 'replyToId' }),
    __metadata("design:type", ConversationMessage)
], ConversationMessage.prototype, "replyTo", void 0);
exports.ConversationMessage = ConversationMessage = __decorate([
    (0, typeorm_1.Entity)('conversation_messages'),
    (0, typeorm_1.Index)(['conversationId', 'createdAt']),
    (0, typeorm_1.Index)(['senderId', 'createdAt']),
    (0, typeorm_1.Index)(['messageType', 'createdAt'])
], ConversationMessage);
//# sourceMappingURL=FeedbackConversation.js.map
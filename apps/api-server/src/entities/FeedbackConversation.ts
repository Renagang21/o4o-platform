import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
  Index
} from 'typeorm';
import { BetaFeedback } from './BetaFeedback';
import { BetaUser } from './BetaUser';
import { User } from './User';

export enum ConversationStatus {
  ACTIVE = 'active',
  PAUSED = 'paused',
  CLOSED = 'closed',
  ARCHIVED = 'archived'
}

export enum MessageType {
  TEXT = 'text',
  IMAGE = 'image',
  FILE = 'file',
  SYSTEM = 'system',
  QUICK_RESPONSE = 'quick_response'
}

export enum ParticipantRole {
  BETA_USER = 'beta_user',
  ADMIN = 'admin',
  SYSTEM = 'system'
}

@Entity('feedback_conversations')
@Index(['feedbackId', 'status'])
@Index(['betaUserId', 'status'])
@Index(['status', 'createdAt'])
@Index(['assignedTo', 'status'])
export class FeedbackConversation {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 200, nullable: true })
  title?: string;

  @Column({ type: 'enum', enum: ConversationStatus, default: ConversationStatus.ACTIVE })
  status!: ConversationStatus;

  @Column({ type: 'uuid' })
  feedbackId!: string;

  @Column({ type: 'uuid' })
  betaUserId!: string;

  @Column({ type: 'uuid', nullable: true })
  assignedTo?: string; // 담당 관리자

  @Column({ type: 'boolean', default: false })
  isUrgent!: boolean;

  @Column({ type: 'timestamp', nullable: true })
  lastMessageAt?: Date;

  @Column({ type: 'timestamp', nullable: true })
  lastAdminResponseAt?: Date;

  @Column({ type: 'timestamp', nullable: true })
  lastUserMessageAt?: Date;

  @Column({ type: 'text', nullable: true })
  summary?: string; // 대화 요약

  @Column({ type: 'simple-array', nullable: true })
  tags?: string[];

  @Column({ type: 'json', nullable: true })
  metadata?: {
    participantCount?: number;
    messageCount?: number;
    avgResponseTime?: number;
    satisfactionRating?: number;
    escalationLevel?: number;
    [key: string]: number | undefined;
  };

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  // Relations
  @ManyToOne(() => BetaFeedback, feedback => feedback.conversations)
  @JoinColumn({ name: 'feedbackId' })
  feedback!: BetaFeedback;

  @ManyToOne(() => BetaUser, betaUser => betaUser.conversations)
  @JoinColumn({ name: 'betaUserId' })
  betaUser!: BetaUser;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'assignedTo' })
  assignee?: User;

  @OneToMany(() => ConversationMessage, message => message.conversation)
  messages!: ConversationMessage[];

  // Methods
  isActive(): boolean {
    return this.status === ConversationStatus.ACTIVE;
  }

  canReceiveMessages(): boolean {
    return [ConversationStatus.ACTIVE, ConversationStatus.PAUSED].includes(this.status);
  }

  assignTo(userId: string): void {
    this.assignedTo = userId;
  }

  markAsUrgent(): void {
    this.isUrgent = true;
  }

  updateLastMessageTime(): void {
    this.lastMessageAt = new Date();
  }

  updateLastAdminResponse(): void {
    this.lastAdminResponseAt = new Date();
    this.updateLastMessageTime();
  }

  updateLastUserMessage(): void {
    this.lastUserMessageAt = new Date();
    this.updateLastMessageTime();
  }

  close(): void {
    this.status = ConversationStatus.CLOSED;
  }

  reopen(): void {
    this.status = ConversationStatus.ACTIVE;
  }

  pause(): void {
    this.status = ConversationStatus.PAUSED;
  }

  archive(): void {
    this.status = ConversationStatus.ARCHIVED;
  }

  getResponseTime(): number | null {
    if (!this.lastUserMessageAt || !this.lastAdminResponseAt) {
      return null;
    }
    
    if (this.lastUserMessageAt > this.lastAdminResponseAt) {
      return Date.now() - this.lastUserMessageAt.getTime();
    }
    
    return null;
  }

  needsAdminResponse(): boolean {
    return this.isActive() && 
           this.lastUserMessageAt !== undefined &&
           (this.lastAdminResponseAt === undefined || 
            this.lastUserMessageAt > this.lastAdminResponseAt);
  }

  addTag(tag: string): void {
    if (!this.tags) this.tags = [];
    if (!this.tags.includes(tag)) {
      this.tags.push(tag);
    }
  }

  removeTag(tag: string): void {
    if (this.tags) {
      this.tags = this.tags.filter(t => t !== tag);
    }
  }
}

@Entity('conversation_messages')
@Index(['conversationId', 'createdAt'])
@Index(['senderId', 'createdAt'])
@Index(['messageType', 'createdAt'])
export class ConversationMessage {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  conversationId!: string;

  @Column({ type: 'uuid', nullable: true })
  senderId?: string; // null for system messages

  @Column({ type: 'enum', enum: ParticipantRole })
  senderRole!: ParticipantRole;

  @Column({ type: 'varchar', length: 100, nullable: true })
  senderName?: string;

  @Column({ type: 'enum', enum: MessageType, default: MessageType.TEXT })
  messageType!: MessageType;

  @Column({ type: 'text' })
  content!: string;

  @Column({ type: 'simple-array', nullable: true })
  attachments?: string[]; // 첨부파일 URLs

  @Column({ type: 'boolean', default: false })
  isEdited!: boolean;

  @Column({ type: 'timestamp', nullable: true })
  editedAt?: Date;

  @Column({ type: 'boolean', default: false })
  isRead!: boolean;

  @Column({ type: 'timestamp', nullable: true })
  readAt?: Date;

  @Column({ type: 'uuid', nullable: true })
  replyToId?: string; // 답장 대상 메시지

  @Column({ type: 'json', nullable: true })
  metadata?: {
    delivered?: boolean;
    deliveredAt?: Date;
    ipAddress?: string;
    userAgent?: string;
    [key: string]: boolean | Date | string | undefined;
  };

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  // Relations
  @ManyToOne(() => FeedbackConversation, conversation => conversation.messages)
  @JoinColumn({ name: 'conversationId' })
  conversation!: FeedbackConversation;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'senderId' })
  sender?: User;

  @ManyToOne(() => ConversationMessage, { nullable: true })
  @JoinColumn({ name: 'replyToId' })
  replyTo?: ConversationMessage;

  // Methods
  markAsRead(): void {
    this.isRead = true;
    this.readAt = new Date();
  }

  edit(newContent: string): void {
    this.content = newContent;
    this.isEdited = true;
    this.editedAt = new Date();
  }

  isFromAdmin(): boolean {
    return this.senderRole === ParticipantRole.ADMIN;
  }

  isFromUser(): boolean {
    return this.senderRole === ParticipantRole.BETA_USER;
  }

  isSystemMessage(): boolean {
    return this.senderRole === ParticipantRole.SYSTEM;
  }

  getAgeInMinutes(): number {
    return Math.floor((Date.now() - this.createdAt.getTime()) / (1000 * 60));
  }
}
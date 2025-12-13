import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import type { CoachingSession } from './CoachingSession.entity.js';

export type MessageSender = 'patient' | 'pharmacist' | 'system';
export type MessageType = 'text' | 'image' | 'file' | 'glucose_data' | 'recommendation' | 'alert';

/**
 * CoachingMessage Entity
 * 코칭 세션 메시지 (비동기 커뮤니케이션)
 */
@Entity('diabetes_coaching_messages')
@Index(['sessionId', 'createdAt'])
@Index(['userId', 'createdAt'])
export class CoachingMessage {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  @Index()
  sessionId!: string;

  @Column({ type: 'uuid' })
  @Index()
  userId!: string;

  @Column({ type: 'varchar', length: 20 })
  sender!: MessageSender;

  @Column({ type: 'uuid', nullable: true })
  senderId?: string; // pharmacistId or null for system

  @Column({ type: 'varchar', length: 20, default: 'text' })
  messageType!: MessageType;

  @Column({ type: 'text' })
  content!: string;

  // 첨부 파일
  @Column({ type: 'jsonb', nullable: true })
  attachments?: Array<{
    type: 'image' | 'pdf' | 'data';
    url: string;
    name?: string;
  }>;

  // 혈당 데이터 참조 (messageType = 'glucose_data')
  @Column({ type: 'jsonb', nullable: true })
  glucoseReference?: {
    date: string;
    metrics?: Record<string, number>;
    eventIds?: string[];
  };

  // 권장사항 (messageType = 'recommendation')
  @Column({ type: 'jsonb', nullable: true })
  recommendation?: {
    category: 'diet' | 'exercise' | 'medication' | 'monitoring' | 'lifestyle';
    priority: 'low' | 'medium' | 'high';
    actionable: boolean;
  };

  @Column({ type: 'boolean', default: false })
  isRead!: boolean;

  @Column({ type: 'timestamp', nullable: true })
  readAt?: Date;

  @CreateDateColumn()
  createdAt!: Date;

  // Relations
  @ManyToOne('CoachingSession', 'messages')
  @JoinColumn({ name: 'sessionId' })
  session?: CoachingSession;

  // Helper methods
  isFromPharmacist(): boolean {
    return this.sender === 'pharmacist';
  }

  isFromPatient(): boolean {
    return this.sender === 'patient';
  }

  isSystemMessage(): boolean {
    return this.sender === 'system';
  }
}

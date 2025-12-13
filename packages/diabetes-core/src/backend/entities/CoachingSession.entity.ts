import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  Index,
} from 'typeorm';
import type { CoachingMessage } from './CoachingMessage.entity.js';

export type SessionType = 'initial' | 'followup' | 'urgent' | 'routine' | 'report_review';
export type SessionStatus = 'scheduled' | 'in_progress' | 'completed' | 'cancelled' | 'no_show';
export type SessionMode = 'in_person' | 'phone' | 'video' | 'chat' | 'async';

/**
 * CoachingSession Entity
 * 약국 코칭 세션
 */
@Entity('diabetes_coaching_sessions')
@Index(['userId', 'scheduledAt'])
@Index(['pharmacyId', 'scheduledAt'])
@Index(['status'])
export class CoachingSession {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  @Index()
  userId!: string;

  @Column({ type: 'uuid' })
  @Index()
  pharmacyId!: string;

  @Column({ type: 'uuid', nullable: true })
  pharmacistId?: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  pharmacistName?: string;

  @Column({ type: 'varchar', length: 20 })
  sessionType!: SessionType;

  @Column({ type: 'varchar', length: 20, default: 'scheduled' })
  status!: SessionStatus;

  @Column({ type: 'varchar', length: 20, default: 'in_person' })
  mode!: SessionMode;

  @Column({ type: 'timestamp' })
  scheduledAt!: Date;

  @Column({ type: 'timestamp', nullable: true })
  startedAt?: Date;

  @Column({ type: 'timestamp', nullable: true })
  endedAt?: Date;

  @Column({ type: 'int', nullable: true })
  durationMinutes?: number;

  @Column({ type: 'text', nullable: true })
  agenda?: string;

  @Column({ type: 'text', nullable: true })
  notes?: string;

  @Column({ type: 'text', nullable: true })
  summary?: string;

  // 세션 중 논의된 주제
  @Column({ type: 'jsonb', nullable: true })
  topicsDiscussed?: Array<{
    topic: string;
    notes?: string;
  }>;

  // 환자 데이터 스냅샷 (세션 당시 데이터)
  @Column({ type: 'jsonb', nullable: true })
  patientDataSnapshot?: {
    avgGlucose7d?: number;
    tir7d?: number;
    hypoEvents7d?: number;
    recentPatterns?: string[];
  };

  // 액션 아이템
  @Column({ type: 'jsonb', nullable: true })
  actionItems?: Array<{
    description: string;
    assignedTo: 'patient' | 'pharmacist';
    dueDate?: string;
    completed?: boolean;
  }>;

  // 다음 세션 예약
  @Column({ type: 'timestamp', nullable: true })
  nextSessionScheduled?: Date;

  @Column({ type: 'uuid', nullable: true })
  relatedReportId?: string;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  // Relations
  @OneToMany('CoachingMessage', 'session')
  messages?: CoachingMessage[];

  // Helper methods
  isCompleted(): boolean {
    return this.status === 'completed';
  }

  isUpcoming(): boolean {
    return this.status === 'scheduled' && new Date(this.scheduledAt) > new Date();
  }
}

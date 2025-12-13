import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import type { CGMSession } from './CGMSession.entity.js';

export type EventType =
  | 'hypoglycemia'           // 저혈당
  | 'severe_hypoglycemia'    // 심한 저혈당 (<54 mg/dL)
  | 'hyperglycemia'          // 고혈당
  | 'severe_hyperglycemia'   // 심한 고혈당 (>250 mg/dL)
  | 'rapid_rise'             // 급격한 상승
  | 'rapid_fall'             // 급격한 하락
  | 'meal_response'          // 식후 반응
  | 'nocturnal_hypo'         // 야간 저혈당
  | 'dawn_phenomenon';       // 새벽 현상

export type EventSeverity = 'low' | 'medium' | 'high' | 'critical';

/**
 * CGMEvent Entity
 * 혈당 이벤트 (고혈당/저혈당 등)
 */
@Entity('diabetes_cgm_events')
@Index(['userId', 'startTime'])
@Index(['eventType', 'startTime'])
@Index(['severity'])
export class CGMEvent {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  @Index()
  sessionId!: string;

  @Column({ type: 'uuid' })
  @Index()
  userId!: string;

  @Column({ type: 'varchar', length: 50 })
  eventType!: EventType;

  @Column({ type: 'varchar', length: 20 })
  severity!: EventSeverity;

  @Column({ type: 'timestamp' })
  startTime!: Date;

  @Column({ type: 'timestamp', nullable: true })
  endTime?: Date;

  @Column({ type: 'int', nullable: true })
  durationMinutes?: number;

  @Column({ type: 'decimal', precision: 6, scale: 2 })
  peakValue!: number; // 최고/최저값 (mg/dL)

  @Column({ type: 'decimal', precision: 6, scale: 2, nullable: true })
  startValue?: number;

  @Column({ type: 'decimal', precision: 6, scale: 2, nullable: true })
  endValue?: number;

  @Column({ type: 'decimal', precision: 6, scale: 2, nullable: true })
  auc?: number; // Area Under Curve (이벤트 심각도 측정)

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column({ type: 'jsonb', nullable: true })
  relatedReadingIds?: string[];

  @Column({ type: 'jsonb', nullable: true })
  possibleCauses?: string[];

  @Column({ type: 'boolean', default: false })
  acknowledged!: boolean;

  @Column({ type: 'timestamp', nullable: true })
  acknowledgedAt?: Date;

  @Column({ type: 'uuid', nullable: true })
  acknowledgedBy?: string;

  @CreateDateColumn()
  createdAt!: Date;

  // Relations
  @ManyToOne('CGMSession', 'events')
  @JoinColumn({ name: 'sessionId' })
  session?: CGMSession;

  // Helper methods
  isCritical(): boolean {
    return this.severity === 'critical';
  }

  isOngoing(): boolean {
    return !this.endTime;
  }
}

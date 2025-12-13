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

export type ReadingQuality = 'good' | 'acceptable' | 'poor' | 'invalid';

/**
 * CGMReading Entity
 * 개별 CGM 측정값 (보통 5분 간격)
 */
@Entity('diabetes_cgm_readings')
@Index(['sessionId', 'timestamp'])
@Index(['userId', 'timestamp'])
@Index(['timestamp'])
export class CGMReading {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  @Index()
  sessionId!: string;

  @Column({ type: 'uuid' })
  @Index()
  userId!: string;

  @Column({ type: 'timestamp' })
  timestamp!: Date;

  @Column({ type: 'decimal', precision: 6, scale: 2 })
  glucoseValue!: number; // mg/dL

  @Column({ type: 'decimal', precision: 6, scale: 2, nullable: true })
  glucoseMmol?: number; // mmol/L (자동 계산)

  @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true })
  trend?: number; // 변화율 (mg/dL per minute)

  @Column({ type: 'varchar', length: 20, nullable: true })
  trendDirection?: 'rising_fast' | 'rising' | 'stable' | 'falling' | 'falling_fast';

  @Column({ type: 'varchar', length: 20, default: 'good' })
  quality!: ReadingQuality;

  @Column({ type: 'boolean', default: false })
  isCalibration!: boolean;

  @Column({ type: 'jsonb', nullable: true })
  rawData?: Record<string, unknown>;

  @CreateDateColumn()
  createdAt!: Date;

  // Relations
  @ManyToOne('CGMSession', 'readings')
  @JoinColumn({ name: 'sessionId' })
  session?: CGMSession;

  // Helper methods
  isInRange(low: number = 70, high: number = 180): boolean {
    return this.glucoseValue >= low && this.glucoseValue <= high;
  }

  isHypo(threshold: number = 70): boolean {
    return this.glucoseValue < threshold;
  }

  isHyper(threshold: number = 180): boolean {
    return this.glucoseValue > threshold;
  }

  isSevereHypo(threshold: number = 54): boolean {
    return this.glucoseValue < threshold;
  }

  toMmol(): number {
    return this.glucoseValue / 18.0182;
  }
}

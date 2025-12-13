import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';

export type PatternType =
  | 'recurring_hypo'           // 반복적 저혈당
  | 'recurring_hyper'          // 반복적 고혈당
  | 'post_meal_spike'          // 식후 급등
  | 'nocturnal_hypo'           // 야간 저혈당
  | 'dawn_phenomenon'          // 새벽 현상 (morning rise)
  | 'exercise_drop'            // 운동 후 하락
  | 'weekend_pattern'          // 주말 패턴 차이
  | 'time_of_day_pattern'      // 특정 시간대 패턴
  | 'meal_response_pattern'    // 식사 반응 패턴
  | 'high_variability';        // 높은 변동성 패턴

export type PatternConfidence = 'low' | 'medium' | 'high';

/**
 * PatternAnalysis Entity
 * 혈당 패턴 분석 결과
 */
@Entity('diabetes_pattern_analysis')
@Index(['userId', 'analyzedAt'])
@Index(['patternType'])
export class PatternAnalysis {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  @Index()
  userId!: string;

  @Column({ type: 'varchar', length: 50 })
  patternType!: PatternType;

  @Column({ type: 'varchar', length: 20 })
  confidence!: PatternConfidence;

  @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true })
  confidenceScore?: number; // 0-100

  @Column({ type: 'timestamp' })
  analyzedAt!: Date;

  @Column({ type: 'date' })
  periodStart!: Date;

  @Column({ type: 'date' })
  periodEnd!: Date;

  @Column({ type: 'int', default: 0 })
  occurrenceCount!: number; // 발생 횟수

  @Column({ type: 'text' })
  description!: string;

  @Column({ type: 'text', nullable: true })
  detailedAnalysis?: string;

  // 패턴 특성
  @Column({ type: 'jsonb', nullable: true })
  timeOfDay?: {
    startHour: number;
    endHour: number;
    label?: string; // "morning", "afternoon", "evening", "night"
  };

  @Column({ type: 'jsonb', nullable: true })
  daysOfWeek?: number[]; // 0=Sunday, 1=Monday, ...

  @Column({ type: 'jsonb', nullable: true })
  triggerFactors?: Array<{
    factor: string;
    correlation: number; // -1 to 1
  }>;

  // 통계 데이터
  @Column({ type: 'decimal', precision: 6, scale: 2, nullable: true })
  avgGlucoseInPattern?: number;

  @Column({ type: 'decimal', precision: 6, scale: 2, nullable: true })
  avgDuration?: number; // 평균 지속 시간 (분)

  // 관련 이벤트 ID들
  @Column({ type: 'jsonb', nullable: true })
  relatedEventIds?: string[];

  // 권장사항
  @Column({ type: 'jsonb', nullable: true })
  recommendations?: Array<{
    type: 'lifestyle' | 'medication' | 'monitoring' | 'consultation';
    priority: 'low' | 'medium' | 'high';
    text: string;
  }>;

  @Column({ type: 'boolean', default: false })
  isActive!: boolean;

  @Column({ type: 'boolean', default: false })
  acknowledged!: boolean;

  @Column({ type: 'timestamp', nullable: true })
  acknowledgedAt?: Date;

  @CreateDateColumn()
  createdAt!: Date;

  // Helper methods
  isHighConfidence(): boolean {
    return this.confidence === 'high' || (this.confidenceScore ?? 0) >= 80;
  }

  needsAttention(): boolean {
    return (
      this.isActive &&
      !this.acknowledged &&
      ['recurring_hypo', 'nocturnal_hypo', 'dawn_phenomenon'].includes(this.patternType)
    );
  }
}

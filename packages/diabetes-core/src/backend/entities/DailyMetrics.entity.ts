import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  Unique,
} from 'typeorm';

/**
 * DailyMetrics Entity
 * 일일 혈당 메트릭스 (TIR, GV, MAGE 등)
 */
@Entity('diabetes_daily_metrics')
@Unique(['userId', 'date'])
@Index(['userId', 'date'])
export class DailyMetrics {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  @Index()
  userId!: string;

  @Column({ type: 'date' })
  date!: Date;

  // === 기본 통계 ===
  @Column({ type: 'int', default: 0 })
  totalReadings!: number;

  @Column({ type: 'decimal', precision: 6, scale: 2, nullable: true })
  meanGlucose?: number; // 평균 혈당

  @Column({ type: 'decimal', precision: 6, scale: 2, nullable: true })
  medianGlucose?: number; // 중앙값

  @Column({ type: 'decimal', precision: 6, scale: 2, nullable: true })
  minGlucose?: number; // 최저값

  @Column({ type: 'decimal', precision: 6, scale: 2, nullable: true })
  maxGlucose?: number; // 최고값

  @Column({ type: 'decimal', precision: 6, scale: 2, nullable: true })
  stdDev?: number; // 표준편차

  // === TIR (Time in Range) ===
  @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true })
  tirPercent?: number; // 목표 범위 내 시간 비율

  @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true })
  tirBelowPercent?: number; // 저혈당 시간 비율 (<70)

  @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true })
  tirAbovePercent?: number; // 고혈당 시간 비율 (>180)

  @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true })
  tirSevereBelowPercent?: number; // 심한 저혈당 시간 비율 (<54)

  @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true })
  tirSevereAbovePercent?: number; // 심한 고혈당 시간 비율 (>250)

  // === 변동성 지표 ===
  @Column({ type: 'decimal', precision: 6, scale: 2, nullable: true })
  cv?: number; // Coefficient of Variation (CV%)

  @Column({ type: 'decimal', precision: 6, scale: 2, nullable: true })
  mage?: number; // Mean Amplitude of Glycemic Excursions

  @Column({ type: 'decimal', precision: 6, scale: 2, nullable: true })
  gmi?: number; // Glucose Management Indicator (추정 HbA1c)

  // === 이벤트 통계 ===
  @Column({ type: 'int', default: 0 })
  hypoEvents!: number; // 저혈당 이벤트 수

  @Column({ type: 'int', default: 0 })
  hyperEvents!: number; // 고혈당 이벤트 수

  @Column({ type: 'int', nullable: true })
  hypoMinutes?: number; // 저혈당 총 시간 (분)

  @Column({ type: 'int', nullable: true })
  hyperMinutes?: number; // 고혈당 총 시간 (분)

  // === 시간대별 평균 ===
  @Column({ type: 'jsonb', nullable: true })
  hourlyMeans?: Record<string, number>; // { "00": 120, "01": 115, ... }

  // === 식사 반응 ===
  @Column({ type: 'decimal', precision: 6, scale: 2, nullable: true })
  avgPostMealPeak?: number; // 평균 식후 최고치

  @Column({ type: 'int', nullable: true })
  avgTimeToPostMealPeak?: number; // 식후 최고치까지 평균 시간 (분)

  // === 데이터 품질 ===
  @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true })
  dataCompleteness?: number; // 데이터 완성도 (%)

  @Column({ type: 'int', nullable: true })
  gapMinutes?: number; // 데이터 누락 총 시간

  @Column({ type: 'jsonb', nullable: true })
  metadata?: Record<string, unknown>;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  // Helper methods
  isGoodControl(): boolean {
    return (this.tirPercent ?? 0) >= 70 && (this.tirBelowPercent ?? 100) < 4;
  }

  hasHighVariability(): boolean {
    return (this.cv ?? 0) > 36;
  }

  getRiskLevel(): 'low' | 'medium' | 'high' {
    if ((this.tirBelowPercent ?? 0) > 4 || (this.hypoEvents ?? 0) > 2) {
      return 'high';
    }
    if ((this.tirPercent ?? 0) < 50 || (this.cv ?? 0) > 36) {
      return 'medium';
    }
    return 'low';
  }
}

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

export type ReportType = 'weekly' | 'biweekly' | 'monthly' | 'quarterly' | 'custom';
export type ReportStatus = 'generating' | 'ready' | 'sent' | 'viewed' | 'archived';

/**
 * DiabetesReport Entity
 * 혈당 관리 리포트
 */
@Entity('diabetes_reports')
@Index(['userId', 'createdAt'])
@Index(['pharmacyId', 'createdAt'])
@Index(['status'])
export class DiabetesReport {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  @Index()
  userId!: string;

  @Column({ type: 'uuid', nullable: true })
  pharmacyId?: string;

  @Column({ type: 'varchar', length: 20 })
  reportType!: ReportType;

  @Column({ type: 'varchar', length: 20, default: 'generating' })
  status!: ReportStatus;

  @Column({ type: 'date' })
  periodStart!: Date;

  @Column({ type: 'date' })
  periodEnd!: Date;

  @Column({ type: 'varchar', length: 200, nullable: true })
  title?: string;

  // === 요약 메트릭스 ===
  @Column({ type: 'jsonb', nullable: true })
  summaryMetrics?: {
    totalReadings: number;
    avgGlucose: number;
    medianGlucose: number;
    stdDev: number;
    cv: number;
    gmi: number;
    tirPercent: number;
    tirBelowPercent: number;
    tirAbovePercent: number;
    hypoEvents: number;
    hyperEvents: number;
    dataCompleteness: number;
  };

  // === 비교 데이터 (이전 기간 대비) ===
  @Column({ type: 'jsonb', nullable: true })
  comparison?: {
    avgGlucoseChange: number;
    tirChange: number;
    cvChange: number;
    hypoEventsChange: number;
    trend: 'improving' | 'stable' | 'worsening';
  };

  // === 일별 데이터 ===
  @Column({ type: 'jsonb', nullable: true })
  dailyData?: Array<{
    date: string;
    avgGlucose: number;
    tir: number;
    hypoEvents: number;
    hyperEvents: number;
  }>;

  // === 시간대별 평균 ===
  @Column({ type: 'jsonb', nullable: true })
  hourlyAverages?: Record<string, number>;

  // === 패턴 요약 ===
  @Column({ type: 'jsonb', nullable: true })
  patternsSummary?: Array<{
    patternType: string;
    occurrences: number;
    description: string;
  }>;

  // === 주요 이벤트 ===
  @Column({ type: 'jsonb', nullable: true })
  significantEvents?: Array<{
    date: string;
    type: string;
    description: string;
    severity: string;
  }>;

  // === 권장사항 ===
  @Column({ type: 'jsonb', nullable: true })
  recommendations?: Array<{
    category: 'diet' | 'exercise' | 'medication' | 'monitoring' | 'consultation';
    priority: 'low' | 'medium' | 'high';
    title: string;
    description: string;
  }>;

  // === 목표 달성도 ===
  @Column({ type: 'jsonb', nullable: true })
  goalAchievement?: {
    tirGoal?: number;
    tirActual?: number;
    tirMet: boolean;
    hypoGoal?: number;
    hypoActual?: number;
    hypoMet: boolean;
    customGoals?: Array<{
      name: string;
      target: number;
      actual: number;
      met: boolean;
    }>;
  };

  // === 약사 코멘트 ===
  @Column({ type: 'text', nullable: true })
  pharmacistComment?: string;

  @Column({ type: 'uuid', nullable: true })
  commentedBy?: string;

  @Column({ type: 'timestamp', nullable: true })
  commentedAt?: Date;

  // === PDF 생성 ===
  @Column({ type: 'varchar', length: 500, nullable: true })
  pdfUrl?: string;

  @Column({ type: 'timestamp', nullable: true })
  sentAt?: Date;

  @Column({ type: 'timestamp', nullable: true })
  viewedAt?: Date;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  // Helper methods
  isReady(): boolean {
    return this.status === 'ready' || this.status === 'sent' || this.status === 'viewed';
  }

  getPeriodDays(): number {
    const diffMs = new Date(this.periodEnd).getTime() - new Date(this.periodStart).getTime();
    return Math.ceil(diffMs / (1000 * 60 * 60 * 24)) + 1;
  }

  getOverallAssessment(): 'excellent' | 'good' | 'fair' | 'needs_improvement' {
    const tir = this.summaryMetrics?.tirPercent ?? 0;
    const hypo = this.summaryMetrics?.tirBelowPercent ?? 0;

    if (tir >= 70 && hypo < 4) return 'excellent';
    if (tir >= 50 && hypo < 4) return 'good';
    if (tir >= 40 && hypo < 8) return 'fair';
    return 'needs_improvement';
  }
}

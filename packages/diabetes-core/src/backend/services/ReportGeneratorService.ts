import { DataSource, Repository, Between } from 'typeorm';
import {
  DailyMetrics,
  PatternAnalysis,
  CGMEvent,
  DiabetesReport,
} from '../entities/index.js';
import type { ReportType } from '../entities/index.js';
import { MetricsCalculatorService } from './MetricsCalculatorService.js';
import { PatternDetectorService } from './PatternDetectorService.js';

export interface ReportOptions {
  userId: string;
  reportType: ReportType;
  startDate: Date;
  endDate: Date;
  pharmacyId?: string;
  includePatternAnalysis?: boolean;
  includeRecommendations?: boolean;
}

/**
 * ReportGeneratorService
 * 혈당 관리 리포트 생성 서비스
 */
export class ReportGeneratorService {
  private reportRepo: Repository<DiabetesReport>;
  private metricsRepo: Repository<DailyMetrics>;
  private eventRepo: Repository<CGMEvent>;
  private patternRepo: Repository<PatternAnalysis>;
  private metricsCalculator: MetricsCalculatorService;
  private patternDetector: PatternDetectorService;

  constructor(private dataSource: DataSource) {
    this.reportRepo = dataSource.getRepository(DiabetesReport);
    this.metricsRepo = dataSource.getRepository(DailyMetrics);
    this.eventRepo = dataSource.getRepository(CGMEvent);
    this.patternRepo = dataSource.getRepository(PatternAnalysis);
    this.metricsCalculator = new MetricsCalculatorService(dataSource);
    this.patternDetector = new PatternDetectorService(dataSource);
  }

  /**
   * 리포트 생성
   */
  async generateReport(options: ReportOptions): Promise<DiabetesReport> {
    const {
      userId,
      reportType,
      startDate,
      endDate,
      pharmacyId,
      includePatternAnalysis = true,
      includeRecommendations = true,
    } = options;

    // 리포트 생성 시작
    let report = this.reportRepo.create({
      userId,
      pharmacyId,
      reportType,
      periodStart: startDate,
      periodEnd: endDate,
      status: 'generating',
      title: this.generateTitle(reportType, startDate, endDate),
    });
    report = await this.reportRepo.save(report);

    try {
      // 집계 메트릭스 계산
      const aggregatedMetrics = await this.metricsCalculator.getAggregatedMetrics(
        userId,
        startDate,
        endDate
      );

      // 일별 메트릭스 조회
      const dailyMetrics = await this.metricsRepo.find({
        where: { userId, date: Between(startDate, endDate) },
        order: { date: 'ASC' },
      });

      // 이벤트 조회
      const events = await this.eventRepo.find({
        where: { userId, startTime: Between(startDate, endDate) },
        order: { startTime: 'DESC' },
      });

      // 요약 메트릭스 설정
      report.summaryMetrics = {
        totalReadings: aggregatedMetrics.totalReadings,
        avgGlucose: aggregatedMetrics.meanGlucose,
        medianGlucose: aggregatedMetrics.medianGlucose,
        stdDev: aggregatedMetrics.stdDev,
        cv: aggregatedMetrics.cv,
        gmi: aggregatedMetrics.gmi,
        tirPercent: aggregatedMetrics.tirPercent,
        tirBelowPercent: aggregatedMetrics.tirBelowPercent,
        tirAbovePercent: aggregatedMetrics.tirAbovePercent,
        hypoEvents: aggregatedMetrics.hypoEvents,
        hyperEvents: aggregatedMetrics.hyperEvents,
        dataCompleteness: aggregatedMetrics.dataCompleteness,
      };

      // 시간대별 평균
      report.hourlyAverages = aggregatedMetrics.hourlyMeans;

      // 일별 데이터
      report.dailyData = dailyMetrics.map((m) => ({
        date: m.date.toISOString().split('T')[0],
        avgGlucose: Number(m.meanGlucose ?? 0),
        tir: Number(m.tirPercent ?? 0),
        hypoEvents: m.hypoEvents ?? 0,
        hyperEvents: m.hyperEvents ?? 0,
      }));

      // 주요 이벤트
      report.significantEvents = events
        .filter((e) => e.severity === 'high' || e.severity === 'critical')
        .slice(0, 10)
        .map((e) => ({
          date: e.startTime.toISOString(),
          type: e.eventType,
          description: e.description || this.getEventDescription(e),
          severity: e.severity,
        }));

      // 패턴 분석
      if (includePatternAnalysis) {
        const patterns = await this.patternRepo.find({
          where: {
            userId,
            isActive: true,
            periodStart: Between(startDate, endDate),
          },
        });

        report.patternsSummary = patterns.map((p) => ({
          patternType: p.patternType,
          occurrences: p.occurrenceCount,
          description: p.description,
        }));
      }

      // 권장사항 생성
      if (includeRecommendations) {
        report.recommendations = this.generateRecommendations(
          aggregatedMetrics,
          events
        );
      }

      // 이전 기간과 비교 (같은 기간 길이)
      report.comparison = await this.generateComparison(
        userId,
        startDate,
        endDate,
        aggregatedMetrics
      );

      // 목표 달성도
      report.goalAchievement = this.calculateGoalAchievement(aggregatedMetrics);

      // 완료 처리
      report.status = 'ready';
      return this.reportRepo.save(report);
    } catch (error) {
      report.status = 'generating'; // 에러 시 상태 유지
      await this.reportRepo.save(report);
      throw error;
    }
  }

  /**
   * 리포트 제목 생성
   */
  private generateTitle(type: ReportType, start: Date, end: Date): string {
    const startStr = start.toISOString().split('T')[0];
    const endStr = end.toISOString().split('T')[0];

    const typeLabels: Record<ReportType, string> = {
      weekly: '주간',
      biweekly: '2주',
      monthly: '월간',
      quarterly: '분기',
      custom: '',
    };

    return `${typeLabels[type]} 혈당 관리 리포트 (${startStr} ~ ${endStr})`;
  }

  /**
   * 이벤트 설명 생성
   */
  private getEventDescription(event: CGMEvent): string {
    const descriptions: Record<string, string> = {
      hypoglycemia: `저혈당 (최저 ${event.peakValue} mg/dL)`,
      severe_hypoglycemia: `심한 저혈당 (최저 ${event.peakValue} mg/dL)`,
      hyperglycemia: `고혈당 (최고 ${event.peakValue} mg/dL)`,
      severe_hyperglycemia: `심한 고혈당 (최고 ${event.peakValue} mg/dL)`,
    };
    return descriptions[event.eventType] || event.eventType;
  }

  /**
   * 권장사항 생성
   */
  private generateRecommendations(
    metrics: ReturnType<MetricsCalculatorService['calculateMetrics']>,
    events: CGMEvent[]
  ): DiabetesReport['recommendations'] {
    const recommendations: DiabetesReport['recommendations'] = [];

    // TIR 기반 권장사항
    if (metrics.tirPercent < 50) {
      recommendations.push({
        category: 'consultation',
        priority: 'high',
        title: '혈당 관리 상담 권장',
        description: 'TIR이 50% 미만입니다. 담당 의사와 치료 계획을 재검토하세요.',
      });
    } else if (metrics.tirPercent < 70) {
      recommendations.push({
        category: 'monitoring',
        priority: 'medium',
        title: '혈당 모니터링 강화',
        description: 'TIR 70% 목표를 위해 지속적인 모니터링이 필요합니다.',
      });
    }

    // 저혈당 기반 권장사항
    if (metrics.tirBelowPercent > 4) {
      recommendations.push({
        category: 'consultation',
        priority: 'high',
        title: '저혈당 관리 필요',
        description: '저혈당 시간이 4%를 초과합니다. 약물 조정이 필요할 수 있습니다.',
      });
    }

    // 변동성 기반 권장사항
    if (metrics.cv > 36) {
      recommendations.push({
        category: 'exercise',
        priority: 'medium',
        title: '혈당 변동성 관리',
        description: '혈당 변동성이 높습니다. 규칙적인 식사와 활동 패턴을 유지하세요.',
      });
    }

    // 고혈당 이벤트 기반
    if (metrics.hyperEvents > 7) {
      recommendations.push({
        category: 'diet',
        priority: 'medium',
        title: '식이 조절 권장',
        description: '고혈당 이벤트가 많습니다. 탄수화물 섭취를 점검해보세요.',
      });
    }

    return recommendations;
  }

  /**
   * 이전 기간과 비교
   */
  private async generateComparison(
    userId: string,
    startDate: Date,
    endDate: Date,
    currentMetrics: ReturnType<MetricsCalculatorService['calculateMetrics']>
  ): Promise<DiabetesReport['comparison']> {
    const periodLength = endDate.getTime() - startDate.getTime();
    const prevEndDate = new Date(startDate.getTime() - 1);
    const prevStartDate = new Date(prevEndDate.getTime() - periodLength);

    try {
      const prevMetrics = await this.metricsCalculator.getAggregatedMetrics(
        userId,
        prevStartDate,
        prevEndDate
      );

      if (prevMetrics.totalReadings === 0) {
        return undefined;
      }

      const avgGlucoseChange = currentMetrics.meanGlucose - prevMetrics.meanGlucose;
      const tirChange = currentMetrics.tirPercent - prevMetrics.tirPercent;
      const cvChange = currentMetrics.cv - prevMetrics.cv;
      const hypoEventsChange = currentMetrics.hypoEvents - prevMetrics.hypoEvents;

      let trend: 'improving' | 'stable' | 'worsening';
      if (tirChange > 5 && avgGlucoseChange < -10) {
        trend = 'improving';
      } else if (tirChange < -5 || avgGlucoseChange > 10) {
        trend = 'worsening';
      } else {
        trend = 'stable';
      }

      return {
        avgGlucoseChange,
        tirChange,
        cvChange,
        hypoEventsChange,
        trend,
      };
    } catch {
      return undefined;
    }
  }

  /**
   * 목표 달성도 계산
   */
  private calculateGoalAchievement(
    metrics: ReturnType<MetricsCalculatorService['calculateMetrics']>
  ): DiabetesReport['goalAchievement'] {
    return {
      tirGoal: 70,
      tirActual: metrics.tirPercent,
      tirMet: metrics.tirPercent >= 70,
      hypoGoal: 4,
      hypoActual: metrics.tirBelowPercent,
      hypoMet: metrics.tirBelowPercent <= 4,
    };
  }

  /**
   * 리포트 조회
   */
  async getReport(reportId: string): Promise<DiabetesReport | null> {
    return this.reportRepo.findOne({ where: { id: reportId } });
  }

  /**
   * 사용자 리포트 목록 조회
   */
  async getUserReports(
    userId: string,
    options?: { limit?: number; offset?: number }
  ): Promise<DiabetesReport[]> {
    return this.reportRepo.find({
      where: { userId },
      order: { createdAt: 'DESC' },
      take: options?.limit ?? 10,
      skip: options?.offset ?? 0,
    });
  }

  /**
   * 리포트 약사 코멘트 추가
   */
  async addPharmacistComment(
    reportId: string,
    comment: string,
    pharmacistId: string
  ): Promise<DiabetesReport> {
    const report = await this.reportRepo.findOneOrFail({ where: { id: reportId } });
    report.pharmacistComment = comment;
    report.commentedBy = pharmacistId;
    report.commentedAt = new Date();
    return this.reportRepo.save(report);
  }

  /**
   * 리포트 전송 처리
   */
  async markAsSent(reportId: string): Promise<DiabetesReport> {
    const report = await this.reportRepo.findOneOrFail({ where: { id: reportId } });
    report.status = 'sent';
    report.sentAt = new Date();
    return this.reportRepo.save(report);
  }

  /**
   * 리포트 조회 처리
   */
  async markAsViewed(reportId: string): Promise<DiabetesReport> {
    const report = await this.reportRepo.findOneOrFail({ where: { id: reportId } });
    if (report.status !== 'viewed') {
      report.status = 'viewed';
      report.viewedAt = new Date();
      return this.reportRepo.save(report);
    }
    return report;
  }
}

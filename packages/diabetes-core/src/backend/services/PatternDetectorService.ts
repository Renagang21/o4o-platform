import { DataSource, Repository, Between, In } from 'typeorm';
import {
  CGMReading,
  CGMEvent,
  DailyMetrics,
  PatternAnalysis,
  UserNote,
} from '../entities/index.js';
import type { PatternType, PatternConfidence } from '../entities/index.js';

export interface DetectedPattern {
  patternType: PatternType;
  confidence: PatternConfidence;
  confidenceScore: number;
  occurrenceCount: number;
  description: string;
  timeOfDay?: { startHour: number; endHour: number; label?: string };
  daysOfWeek?: number[];
  triggerFactors?: Array<{ factor: string; correlation: number }>;
  recommendations?: Array<{
    type: 'lifestyle' | 'medication' | 'monitoring' | 'consultation';
    priority: 'low' | 'medium' | 'high';
    text: string;
  }>;
}

/**
 * PatternDetectorService
 * 혈당 패턴 탐지 서비스
 */
export class PatternDetectorService {
  private readingRepo: Repository<CGMReading>;
  private eventRepo: Repository<CGMEvent>;
  private metricsRepo: Repository<DailyMetrics>;
  private patternRepo: Repository<PatternAnalysis>;
  private noteRepo: Repository<UserNote>;

  private config = {
    minOccurrences: 3, // 패턴 인식 최소 발생 횟수
    analysisWindowDays: 14, // 분석 기간
    timeWindowMinutes: 60, // 시간대 그룹핑 윈도우
  };

  constructor(private dataSource: DataSource) {
    this.readingRepo = dataSource.getRepository(CGMReading);
    this.eventRepo = dataSource.getRepository(CGMEvent);
    this.metricsRepo = dataSource.getRepository(DailyMetrics);
    this.patternRepo = dataSource.getRepository(PatternAnalysis);
    this.noteRepo = dataSource.getRepository(UserNote);
  }

  /**
   * 패턴 분석 실행
   */
  async analyzePatterns(
    userId: string,
    startDate: Date,
    endDate: Date
  ): Promise<PatternAnalysis[]> {
    const patterns: DetectedPattern[] = [];

    // 데이터 로드
    const events = await this.eventRepo.find({
      where: { userId, startTime: Between(startDate, endDate) },
      order: { startTime: 'ASC' },
    });

    const metrics = await this.metricsRepo.find({
      where: { userId, date: Between(startDate, endDate) },
      order: { date: 'ASC' },
    });

    const notes = await this.noteRepo.find({
      where: { userId, timestamp: Between(startDate, endDate) },
    });

    // 각 패턴 유형 탐지
    patterns.push(...this.detectRecurringHypo(events));
    patterns.push(...this.detectRecurringHyper(events));
    patterns.push(...this.detectNocturnalHypo(events));
    patterns.push(...this.detectDawnPhenomenon(events, metrics));
    patterns.push(...this.detectPostMealSpike(events, notes));
    patterns.push(...this.detectHighVariability(metrics));
    patterns.push(...this.detectTimeOfDayPattern(events));

    // 패턴 저장
    const savedPatterns: PatternAnalysis[] = [];
    for (const pattern of patterns) {
      const patternEntity = this.patternRepo.create({
        userId,
        patternType: pattern.patternType,
        confidence: pattern.confidence,
        confidenceScore: pattern.confidenceScore,
        analyzedAt: new Date(),
        periodStart: startDate,
        periodEnd: endDate,
        occurrenceCount: pattern.occurrenceCount,
        description: pattern.description,
        timeOfDay: pattern.timeOfDay,
        daysOfWeek: pattern.daysOfWeek,
        triggerFactors: pattern.triggerFactors,
        recommendations: pattern.recommendations,
        isActive: true,
      });

      savedPatterns.push(await this.patternRepo.save(patternEntity));
    }

    return savedPatterns;
  }

  /**
   * 반복적 저혈당 패턴 탐지
   */
  private detectRecurringHypo(events: CGMEvent[]): DetectedPattern[] {
    const hypoEvents = events.filter(
      (e) => e.eventType === 'hypoglycemia' || e.eventType === 'severe_hypoglycemia'
    );

    if (hypoEvents.length < this.config.minOccurrences) return [];

    // 시간대별 그룹핑
    const timeGroups = this.groupEventsByTimeOfDay(hypoEvents);
    const patterns: DetectedPattern[] = [];

    for (const [timeLabel, groupEvents] of Object.entries(timeGroups)) {
      if (groupEvents.length >= this.config.minOccurrences) {
        const confidence = this.calculateConfidence(groupEvents.length, hypoEvents.length);
        patterns.push({
          patternType: 'recurring_hypo',
          confidence: confidence.level,
          confidenceScore: confidence.score,
          occurrenceCount: groupEvents.length,
          description: `${timeLabel} 시간대에 반복적인 저혈당이 ${groupEvents.length}회 발생했습니다.`,
          timeOfDay: this.getTimeRange(timeLabel),
          recommendations: [
            {
              type: 'consultation',
              priority: 'high',
              text: '반복적인 저혈당은 약물 용량 조정이 필요할 수 있습니다. 담당 의사와 상담하세요.',
            },
            {
              type: 'monitoring',
              priority: 'medium',
              text: `${timeLabel} 시간대에 혈당 모니터링을 강화하세요.`,
            },
          ],
        });
      }
    }

    return patterns;
  }

  /**
   * 반복적 고혈당 패턴 탐지
   */
  private detectRecurringHyper(events: CGMEvent[]): DetectedPattern[] {
    const hyperEvents = events.filter(
      (e) => e.eventType === 'hyperglycemia' || e.eventType === 'severe_hyperglycemia'
    );

    if (hyperEvents.length < this.config.minOccurrences) return [];

    const timeGroups = this.groupEventsByTimeOfDay(hyperEvents);
    const patterns: DetectedPattern[] = [];

    for (const [timeLabel, groupEvents] of Object.entries(timeGroups)) {
      if (groupEvents.length >= this.config.minOccurrences) {
        const confidence = this.calculateConfidence(groupEvents.length, hyperEvents.length);
        patterns.push({
          patternType: 'recurring_hyper',
          confidence: confidence.level,
          confidenceScore: confidence.score,
          occurrenceCount: groupEvents.length,
          description: `${timeLabel} 시간대에 반복적인 고혈당이 ${groupEvents.length}회 발생했습니다.`,
          timeOfDay: this.getTimeRange(timeLabel),
          recommendations: [
            {
              type: 'lifestyle',
              priority: 'medium',
              text: '해당 시간대의 탄수화물 섭취량을 점검해보세요.',
            },
          ],
        });
      }
    }

    return patterns;
  }

  /**
   * 야간 저혈당 패턴 탐지
   */
  private detectNocturnalHypo(events: CGMEvent[]): DetectedPattern[] {
    const nocturnalHypo = events.filter((e) => {
      if (e.eventType !== 'hypoglycemia' && e.eventType !== 'severe_hypoglycemia') {
        return false;
      }
      const hour = new Date(e.startTime).getHours();
      return hour >= 0 && hour < 6; // 자정~오전 6시
    });

    if (nocturnalHypo.length < 2) return []; // 야간 저혈당은 2회부터 주의

    const confidence = this.calculateConfidence(nocturnalHypo.length, 5);
    return [
      {
        patternType: 'nocturnal_hypo',
        confidence: confidence.level,
        confidenceScore: confidence.score,
        occurrenceCount: nocturnalHypo.length,
        description: `야간(자정~오전 6시)에 저혈당이 ${nocturnalHypo.length}회 발생했습니다.`,
        timeOfDay: { startHour: 0, endHour: 6, label: '야간' },
        recommendations: [
          {
            type: 'consultation',
            priority: 'high',
            text: '야간 저혈당은 위험할 수 있습니다. 담당 의사와 상담하세요.',
          },
          {
            type: 'lifestyle',
            priority: 'medium',
            text: '취침 전 간식 섭취를 고려해보세요.',
          },
        ],
      },
    ];
  }

  /**
   * 새벽 현상 (Dawn Phenomenon) 탐지
   */
  private detectDawnPhenomenon(events: CGMEvent[], metrics: DailyMetrics[]): DetectedPattern[] {
    // 새벽 4-8시 사이 혈당 상승 패턴 탐지
    const dawnEvents = events.filter((e) => {
      if (e.eventType !== 'hyperglycemia') return false;
      const hour = new Date(e.startTime).getHours();
      return hour >= 4 && hour < 8;
    });

    if (dawnEvents.length < this.config.minOccurrences) return [];

    const confidence = this.calculateConfidence(dawnEvents.length, 7);
    return [
      {
        patternType: 'dawn_phenomenon',
        confidence: confidence.level,
        confidenceScore: confidence.score,
        occurrenceCount: dawnEvents.length,
        description: `새벽(4~8시)에 혈당 상승이 ${dawnEvents.length}회 관찰되었습니다 (새벽 현상 가능성).`,
        timeOfDay: { startHour: 4, endHour: 8, label: '새벽' },
        recommendations: [
          {
            type: 'consultation',
            priority: 'medium',
            text: '새벽 현상에 대해 담당 의사와 상담하세요.',
          },
          {
            type: 'medication',
            priority: 'low',
            text: '기저 인슐린 용량이나 투여 시간 조정이 도움될 수 있습니다.',
          },
        ],
      },
    ];
  }

  /**
   * 식후 혈당 급등 패턴 탐지
   */
  private detectPostMealSpike(events: CGMEvent[], notes: UserNote[]): DetectedPattern[] {
    const mealNotes = notes.filter((n) => n.noteType === 'meal');
    if (mealNotes.length < this.config.minOccurrences) return [];

    let spikeCount = 0;
    const mealTypes: Record<string, number> = {};

    for (const meal of mealNotes) {
      // 식사 후 2시간 내 고혈당 이벤트 찾기
      const mealTime = new Date(meal.timestamp).getTime();
      const postMealHyper = events.find((e) => {
        if (e.eventType !== 'hyperglycemia') return false;
        const eventTime = new Date(e.startTime).getTime();
        const diffMinutes = (eventTime - mealTime) / 60000;
        return diffMinutes > 0 && diffMinutes <= 120;
      });

      if (postMealHyper) {
        spikeCount++;
        if (meal.mealType) {
          mealTypes[meal.mealType] = (mealTypes[meal.mealType] || 0) + 1;
        }
      }
    }

    if (spikeCount < this.config.minOccurrences) return [];

    const mostProblematic = Object.entries(mealTypes).sort((a, b) => b[1] - a[1])[0];
    const confidence = this.calculateConfidence(spikeCount, mealNotes.length);

    return [
      {
        patternType: 'post_meal_spike',
        confidence: confidence.level,
        confidenceScore: confidence.score,
        occurrenceCount: spikeCount,
        description: `식후 혈당 급등이 ${spikeCount}회 발생했습니다.${
          mostProblematic ? ` 특히 ${this.getMealTypeLabel(mostProblematic[0])}에 많이 발생합니다.` : ''
        }`,
        triggerFactors: mostProblematic
          ? [{ factor: this.getMealTypeLabel(mostProblematic[0]), correlation: 0.7 }]
          : undefined,
        recommendations: [
          {
            type: 'lifestyle',
            priority: 'high',
            text: '식사의 탄수화물 양을 줄이거나 저GI 식품을 선택해보세요.',
          },
          {
            type: 'lifestyle',
            priority: 'medium',
            text: '식후 가벼운 산책이 혈당 조절에 도움됩니다.',
          },
        ],
      },
    ];
  }

  /**
   * 높은 혈당 변동성 패턴 탐지
   */
  private detectHighVariability(metrics: DailyMetrics[]): DetectedPattern[] {
    const highCVDays = metrics.filter((m) => (m.cv ?? 0) > 36);

    if (highCVDays.length < this.config.minOccurrences) return [];

    const avgCV = metrics.reduce((sum, m) => sum + (m.cv ?? 0), 0) / metrics.length;
    const confidence = this.calculateConfidence(highCVDays.length, metrics.length);

    return [
      {
        patternType: 'high_variability',
        confidence: confidence.level,
        confidenceScore: confidence.score,
        occurrenceCount: highCVDays.length,
        description: `혈당 변동성이 높은 날이 ${highCVDays.length}일 있습니다 (평균 CV: ${avgCV.toFixed(1)}%).`,
        recommendations: [
          {
            type: 'lifestyle',
            priority: 'medium',
            text: '규칙적인 식사와 활동 패턴을 유지해보세요.',
          },
          {
            type: 'consultation',
            priority: 'low',
            text: '높은 변동성이 지속되면 담당 의사와 상담하세요.',
          },
        ],
      },
    ];
  }

  /**
   * 특정 시간대 패턴 탐지
   */
  private detectTimeOfDayPattern(events: CGMEvent[]): DetectedPattern[] {
    // 이미 다른 메서드에서 처리된 패턴과 중복 방지
    // 여기서는 추가적인 시간대 패턴만 탐지
    return [];
  }

  /**
   * 이벤트를 시간대별로 그룹핑
   */
  private groupEventsByTimeOfDay(events: CGMEvent[]): Record<string, CGMEvent[]> {
    const groups: Record<string, CGMEvent[]> = {
      '아침(6-9시)': [],
      '오전(9-12시)': [],
      '점심(12-14시)': [],
      '오후(14-18시)': [],
      '저녁(18-21시)': [],
      '야간(21-6시)': [],
    };

    for (const event of events) {
      const hour = new Date(event.startTime).getHours();

      if (hour >= 6 && hour < 9) groups['아침(6-9시)'].push(event);
      else if (hour >= 9 && hour < 12) groups['오전(9-12시)'].push(event);
      else if (hour >= 12 && hour < 14) groups['점심(12-14시)'].push(event);
      else if (hour >= 14 && hour < 18) groups['오후(14-18시)'].push(event);
      else if (hour >= 18 && hour < 21) groups['저녁(18-21시)'].push(event);
      else groups['야간(21-6시)'].push(event);
    }

    return groups;
  }

  /**
   * 시간 범위 반환
   */
  private getTimeRange(label: string): { startHour: number; endHour: number; label: string } {
    const ranges: Record<string, { startHour: number; endHour: number }> = {
      '아침(6-9시)': { startHour: 6, endHour: 9 },
      '오전(9-12시)': { startHour: 9, endHour: 12 },
      '점심(12-14시)': { startHour: 12, endHour: 14 },
      '오후(14-18시)': { startHour: 14, endHour: 18 },
      '저녁(18-21시)': { startHour: 18, endHour: 21 },
      '야간(21-6시)': { startHour: 21, endHour: 6 },
    };
    return { ...ranges[label], label };
  }

  /**
   * 신뢰도 계산
   */
  private calculateConfidence(
    occurrences: number,
    total: number
  ): { level: PatternConfidence; score: number } {
    const ratio = occurrences / Math.max(total, 1);
    const score = Math.min(ratio * 100 + occurrences * 5, 100);

    if (score >= 80 || occurrences >= 7) return { level: 'high', score };
    if (score >= 50 || occurrences >= 4) return { level: 'medium', score };
    return { level: 'low', score };
  }

  /**
   * 식사 유형 라벨
   */
  private getMealTypeLabel(type: string): string {
    const labels: Record<string, string> = {
      breakfast: '아침 식사',
      lunch: '점심 식사',
      dinner: '저녁 식사',
      snack: '간식',
    };
    return labels[type] || type;
  }

  /**
   * 사용자 패턴 조회
   */
  async getPatterns(userId: string, activeOnly: boolean = true): Promise<PatternAnalysis[]> {
    return this.patternRepo.find({
      where: {
        userId,
        ...(activeOnly ? { isActive: true } : {}),
      },
      order: { analyzedAt: 'DESC' },
    });
  }

  /**
   * 패턴 확인 처리
   */
  async acknowledgePattern(patternId: string): Promise<PatternAnalysis> {
    const pattern = await this.patternRepo.findOneOrFail({ where: { id: patternId } });
    pattern.acknowledged = true;
    pattern.acknowledgedAt = new Date();
    return this.patternRepo.save(pattern);
  }
}

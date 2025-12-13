import { DataSource, Repository, Between } from 'typeorm';
import { CGMReading, CGMEvent, DailyMetrics } from '../entities/index.js';

export interface MetricsConfig {
  tirLowThreshold: number;      // 70 mg/dL
  tirHighThreshold: number;     // 180 mg/dL
  severeLowThreshold: number;   // 54 mg/dL
  severeHighThreshold: number;  // 250 mg/dL
  readingIntervalMinutes: number; // 5분
}

export interface CalculatedMetrics {
  totalReadings: number;
  meanGlucose: number;
  medianGlucose: number;
  minGlucose: number;
  maxGlucose: number;
  stdDev: number;
  cv: number;
  gmi: number;
  tirPercent: number;
  tirBelowPercent: number;
  tirAbovePercent: number;
  tirSevereBelowPercent: number;
  tirSevereAbovePercent: number;
  mage: number;
  hourlyMeans: Record<string, number>;
  hypoEvents: number;
  hyperEvents: number;
  hypoMinutes: number;
  hyperMinutes: number;
  dataCompleteness: number;
}

/**
 * MetricsCalculatorService
 * 혈당 메트릭스 계산 서비스 (TIR, GV, MAGE, GMI 등)
 */
export class MetricsCalculatorService {
  private readingRepo: Repository<CGMReading>;
  private eventRepo: Repository<CGMEvent>;
  private metricsRepo: Repository<DailyMetrics>;

  private config: MetricsConfig = {
    tirLowThreshold: 70,
    tirHighThreshold: 180,
    severeLowThreshold: 54,
    severeHighThreshold: 250,
    readingIntervalMinutes: 5,
  };

  constructor(private dataSource: DataSource) {
    this.readingRepo = dataSource.getRepository(CGMReading);
    this.eventRepo = dataSource.getRepository(CGMEvent);
    this.metricsRepo = dataSource.getRepository(DailyMetrics);
  }

  /**
   * 일일 메트릭스 계산 및 저장
   */
  async calculateAndSaveDailyMetrics(userId: string, date: Date): Promise<DailyMetrics> {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    const readings = await this.readingRepo.find({
      where: {
        userId,
        timestamp: Between(startOfDay, endOfDay),
        quality: 'good',
      },
      order: { timestamp: 'ASC' },
    });

    const events = await this.eventRepo.find({
      where: {
        userId,
        startTime: Between(startOfDay, endOfDay),
      },
    });

    const metrics = this.calculateMetrics(readings, events);

    // 기존 레코드 찾기 또는 새로 생성
    let dailyMetrics = await this.metricsRepo.findOne({
      where: { userId, date: startOfDay },
    });

    if (!dailyMetrics) {
      dailyMetrics = this.metricsRepo.create({ userId, date: startOfDay });
    }

    // 메트릭스 업데이트
    Object.assign(dailyMetrics, {
      totalReadings: metrics.totalReadings,
      meanGlucose: metrics.meanGlucose,
      medianGlucose: metrics.medianGlucose,
      minGlucose: metrics.minGlucose,
      maxGlucose: metrics.maxGlucose,
      stdDev: metrics.stdDev,
      cv: metrics.cv,
      gmi: metrics.gmi,
      tirPercent: metrics.tirPercent,
      tirBelowPercent: metrics.tirBelowPercent,
      tirAbovePercent: metrics.tirAbovePercent,
      tirSevereBelowPercent: metrics.tirSevereBelowPercent,
      tirSevereAbovePercent: metrics.tirSevereAbovePercent,
      mage: metrics.mage,
      hourlyMeans: metrics.hourlyMeans,
      hypoEvents: metrics.hypoEvents,
      hyperEvents: metrics.hyperEvents,
      hypoMinutes: metrics.hypoMinutes,
      hyperMinutes: metrics.hyperMinutes,
      dataCompleteness: metrics.dataCompleteness,
    });

    return this.metricsRepo.save(dailyMetrics);
  }

  /**
   * 메트릭스 계산
   */
  calculateMetrics(readings: CGMReading[], events: CGMEvent[]): CalculatedMetrics {
    if (readings.length === 0) {
      return this.getEmptyMetrics();
    }

    const values = readings.map((r) => Number(r.glucoseValue));
    const sorted = [...values].sort((a, b) => a - b);

    // 기본 통계
    const totalReadings = values.length;
    const sum = values.reduce((a, b) => a + b, 0);
    const meanGlucose = sum / totalReadings;
    const medianGlucose = this.calculateMedian(sorted);
    const minGlucose = sorted[0];
    const maxGlucose = sorted[sorted.length - 1];
    const stdDev = this.calculateStdDev(values, meanGlucose);
    const cv = (stdDev / meanGlucose) * 100;

    // GMI (Glucose Management Indicator)
    // GMI(%) = 3.31 + 0.02392 × mean glucose (mg/dL)
    const gmi = 3.31 + 0.02392 * meanGlucose;

    // TIR 계산
    const tirCounts = this.calculateTIRCounts(values);
    const tirPercent = (tirCounts.inRange / totalReadings) * 100;
    const tirBelowPercent = (tirCounts.below / totalReadings) * 100;
    const tirAbovePercent = (tirCounts.above / totalReadings) * 100;
    const tirSevereBelowPercent = (tirCounts.severeBelow / totalReadings) * 100;
    const tirSevereAbovePercent = (tirCounts.severeAbove / totalReadings) * 100;

    // MAGE 계산
    const mage = this.calculateMAGE(values);

    // 시간대별 평균
    const hourlyMeans = this.calculateHourlyMeans(readings);

    // 이벤트 통계
    const hypoEvents = events.filter(
      (e) => e.eventType === 'hypoglycemia' || e.eventType === 'severe_hypoglycemia'
    ).length;
    const hyperEvents = events.filter(
      (e) => e.eventType === 'hyperglycemia' || e.eventType === 'severe_hyperglycemia'
    ).length;

    const hypoMinutes = events
      .filter((e) => e.eventType === 'hypoglycemia' || e.eventType === 'severe_hypoglycemia')
      .reduce((sum, e) => sum + (e.durationMinutes ?? 0), 0);
    const hyperMinutes = events
      .filter((e) => e.eventType === 'hyperglycemia' || e.eventType === 'severe_hyperglycemia')
      .reduce((sum, e) => sum + (e.durationMinutes ?? 0), 0);

    // 데이터 완성도 (하루 288개 기준 - 5분 간격)
    const expectedReadings = 288;
    const dataCompleteness = Math.min((totalReadings / expectedReadings) * 100, 100);

    return {
      totalReadings,
      meanGlucose,
      medianGlucose,
      minGlucose,
      maxGlucose,
      stdDev,
      cv,
      gmi,
      tirPercent,
      tirBelowPercent,
      tirAbovePercent,
      tirSevereBelowPercent,
      tirSevereAbovePercent,
      mage,
      hourlyMeans,
      hypoEvents,
      hyperEvents,
      hypoMinutes,
      hyperMinutes,
      dataCompleteness,
    };
  }

  /**
   * 빈 메트릭스 반환
   */
  private getEmptyMetrics(): CalculatedMetrics {
    return {
      totalReadings: 0,
      meanGlucose: 0,
      medianGlucose: 0,
      minGlucose: 0,
      maxGlucose: 0,
      stdDev: 0,
      cv: 0,
      gmi: 0,
      tirPercent: 0,
      tirBelowPercent: 0,
      tirAbovePercent: 0,
      tirSevereBelowPercent: 0,
      tirSevereAbovePercent: 0,
      mage: 0,
      hourlyMeans: {},
      hypoEvents: 0,
      hyperEvents: 0,
      hypoMinutes: 0,
      hyperMinutes: 0,
      dataCompleteness: 0,
    };
  }

  /**
   * 중앙값 계산
   */
  private calculateMedian(sorted: number[]): number {
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 !== 0
      ? sorted[mid]
      : (sorted[mid - 1] + sorted[mid]) / 2;
  }

  /**
   * 표준편차 계산
   */
  private calculateStdDev(values: number[], mean: number): number {
    const squareDiffs = values.map((value) => Math.pow(value - mean, 2));
    const avgSquareDiff = squareDiffs.reduce((a, b) => a + b, 0) / values.length;
    return Math.sqrt(avgSquareDiff);
  }

  /**
   * TIR 카운트 계산
   */
  private calculateTIRCounts(values: number[]): {
    inRange: number;
    below: number;
    above: number;
    severeBelow: number;
    severeAbove: number;
  } {
    let inRange = 0;
    let below = 0;
    let above = 0;
    let severeBelow = 0;
    let severeAbove = 0;

    for (const value of values) {
      if (value < this.config.severeLowThreshold) {
        severeBelow++;
        below++;
      } else if (value < this.config.tirLowThreshold) {
        below++;
      } else if (value > this.config.severeHighThreshold) {
        severeAbove++;
        above++;
      } else if (value > this.config.tirHighThreshold) {
        above++;
      } else {
        inRange++;
      }
    }

    return { inRange, below, above, severeBelow, severeAbove };
  }

  /**
   * MAGE (Mean Amplitude of Glycemic Excursions) 계산
   */
  private calculateMAGE(values: number[]): number {
    if (values.length < 3) return 0;

    // 표준편차 계산
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const stdDev = this.calculateStdDev(values, mean);

    // Excursions 찾기 (표준편차보다 큰 변동)
    const excursions: number[] = [];
    let lastPeak = values[0];
    let lastValley = values[0];
    let isRising = true;

    for (let i = 1; i < values.length; i++) {
      if (isRising) {
        if (values[i] > lastPeak) {
          lastPeak = values[i];
        } else if (lastPeak - values[i] > stdDev) {
          excursions.push(lastPeak - lastValley);
          lastValley = values[i];
          isRising = false;
        }
      } else {
        if (values[i] < lastValley) {
          lastValley = values[i];
        } else if (values[i] - lastValley > stdDev) {
          excursions.push(lastPeak - lastValley);
          lastPeak = values[i];
          isRising = true;
        }
      }
    }

    if (excursions.length === 0) return 0;
    return excursions.reduce((a, b) => a + b, 0) / excursions.length;
  }

  /**
   * 시간대별 평균 계산
   */
  private calculateHourlyMeans(readings: CGMReading[]): Record<string, number> {
    const hourlyData: Record<string, number[]> = {};

    for (const reading of readings) {
      const hour = new Date(reading.timestamp).getHours().toString().padStart(2, '0');
      if (!hourlyData[hour]) {
        hourlyData[hour] = [];
      }
      hourlyData[hour].push(Number(reading.glucoseValue));
    }

    const hourlyMeans: Record<string, number> = {};
    for (const [hour, values] of Object.entries(hourlyData)) {
      hourlyMeans[hour] = values.reduce((a, b) => a + b, 0) / values.length;
    }

    return hourlyMeans;
  }

  /**
   * 기간별 메트릭스 조회
   */
  async getMetricsForPeriod(
    userId: string,
    startDate: Date,
    endDate: Date
  ): Promise<DailyMetrics[]> {
    return this.metricsRepo.find({
      where: {
        userId,
        date: Between(startDate, endDate),
      },
      order: { date: 'ASC' },
    });
  }

  /**
   * 기간별 집계 메트릭스 계산
   */
  async getAggregatedMetrics(
    userId: string,
    startDate: Date,
    endDate: Date
  ): Promise<CalculatedMetrics> {
    const readings = await this.readingRepo.find({
      where: {
        userId,
        timestamp: Between(startDate, endDate),
        quality: 'good',
      },
      order: { timestamp: 'ASC' },
    });

    const events = await this.eventRepo.find({
      where: {
        userId,
        startTime: Between(startDate, endDate),
      },
    });

    return this.calculateMetrics(readings, events);
  }
}

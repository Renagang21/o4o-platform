import { DataSource, Repository, Between, LessThanOrEqual, MoreThanOrEqual } from 'typeorm';
import { CGMSession, CGMReading, CGMEvent } from '../entities/index.js';
import type { CGMDeviceType, EventType, EventSeverity } from '../entities/index.js';

export interface CGMIngestData {
  userId: string;
  deviceType: CGMDeviceType;
  deviceSerial?: string;
  sensorId?: string;
  readings: Array<{
    timestamp: Date | string;
    glucoseValue: number;
    trend?: number;
    quality?: 'good' | 'acceptable' | 'poor' | 'invalid';
    rawData?: Record<string, unknown>;
  }>;
  pharmacyId?: string;
}

export interface IngestResult {
  sessionId: string;
  readingsCreated: number;
  readingsSkipped: number;
  eventsDetected: number;
}

/**
 * CGMIngestService
 * CGM 데이터 수집 및 처리 서비스
 */
export class CGMIngestService {
  private sessionRepo: Repository<CGMSession>;
  private readingRepo: Repository<CGMReading>;
  private eventRepo: Repository<CGMEvent>;

  // 설정값 (manifest.settings.defaults에서 가져올 수 있음)
  private config = {
    hyperglycemiaThreshold: 180,
    hypoglycemiaThreshold: 70,
    severeHypoThreshold: 54,
    severeHyperThreshold: 250,
    rapidChangeThreshold: 2, // mg/dL per minute
  };

  constructor(private dataSource: DataSource) {
    this.sessionRepo = dataSource.getRepository(CGMSession);
    this.readingRepo = dataSource.getRepository(CGMReading);
    this.eventRepo = dataSource.getRepository(CGMEvent);
  }

  /**
   * CGM 데이터 수집 처리
   */
  async ingest(data: CGMIngestData): Promise<IngestResult> {
    const { userId, deviceType, readings } = data;

    if (!readings || readings.length === 0) {
      throw new Error('No readings provided');
    }

    // 세션 찾기 또는 생성
    let session = await this.findOrCreateSession(data);

    let readingsCreated = 0;
    let readingsSkipped = 0;
    const newReadings: CGMReading[] = [];

    // 읽기 데이터 처리
    for (const reading of readings) {
      const timestamp = new Date(reading.timestamp);

      // 중복 체크
      const exists = await this.readingRepo.findOne({
        where: {
          sessionId: session.id,
          timestamp,
        },
      });

      if (exists) {
        readingsSkipped++;
        continue;
      }

      const newReading = this.readingRepo.create({
        sessionId: session.id,
        userId,
        timestamp,
        glucoseValue: reading.glucoseValue,
        glucoseMmol: reading.glucoseValue / 18.0182,
        trend: reading.trend,
        trendDirection: this.calculateTrendDirection(reading.trend),
        quality: reading.quality || 'good',
        rawData: reading.rawData,
      });

      newReadings.push(newReading);
      readingsCreated++;
    }

    // 일괄 저장
    if (newReadings.length > 0) {
      await this.readingRepo.save(newReadings);

      // 세션 통계 업데이트
      session.totalReadings += newReadings.length;
      await this.sessionRepo.save(session);
    }

    // 이벤트 탐지
    const eventsDetected = await this.detectEvents(session.id, newReadings);

    return {
      sessionId: session.id,
      readingsCreated,
      readingsSkipped,
      eventsDetected,
    };
  }

  /**
   * 세션 찾기 또는 생성
   */
  private async findOrCreateSession(data: CGMIngestData): Promise<CGMSession> {
    const { userId, deviceType, deviceSerial, sensorId, pharmacyId } = data;

    // 활성 세션 찾기
    let session = await this.sessionRepo.findOne({
      where: {
        userId,
        deviceType,
        status: 'active',
      },
      order: { startDate: 'DESC' },
    });

    // 새 센서라면 새 세션 생성
    if (session && sensorId && session.sensorId !== sensorId) {
      // 이전 세션 종료
      session.status = 'completed';
      session.endDate = new Date();
      await this.sessionRepo.save(session);
      session = null;
    }

    if (!session) {
      const timestamps = data.readings.map((r) => new Date(r.timestamp));
      const startDate = new Date(Math.min(...timestamps.map((t) => t.getTime())));

      session = this.sessionRepo.create({
        userId,
        pharmacyId,
        deviceType,
        deviceSerial,
        sensorId,
        startDate,
        status: 'active',
        totalReadings: 0,
      });
      await this.sessionRepo.save(session);
    }

    return session;
  }

  /**
   * 트렌드 방향 계산
   */
  private calculateTrendDirection(
    trend?: number
  ): 'rising_fast' | 'rising' | 'stable' | 'falling' | 'falling_fast' | undefined {
    if (trend === undefined || trend === null) return undefined;

    if (trend > 2) return 'rising_fast';
    if (trend > 1) return 'rising';
    if (trend < -2) return 'falling_fast';
    if (trend < -1) return 'falling';
    return 'stable';
  }

  /**
   * 이벤트 탐지
   */
  private async detectEvents(sessionId: string, readings: CGMReading[]): Promise<number> {
    if (readings.length === 0) return 0;

    const events: CGMEvent[] = [];
    let currentEvent: Partial<CGMEvent> | null = null;

    const sortedReadings = [...readings].sort(
      (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );

    for (let i = 0; i < sortedReadings.length; i++) {
      const reading = sortedReadings[i];
      const { eventType, severity } = this.classifyReading(reading);

      if (eventType) {
        if (!currentEvent || currentEvent.eventType !== eventType) {
          // 이전 이벤트 종료
          if (currentEvent && currentEvent.startTime) {
            currentEvent.endTime = sortedReadings[i - 1]?.timestamp;
            currentEvent.durationMinutes = this.calculateDuration(
              currentEvent.startTime,
              currentEvent.endTime
            );
            events.push(this.eventRepo.create(currentEvent as CGMEvent));
          }

          // 새 이벤트 시작
          currentEvent = {
            sessionId,
            userId: reading.userId,
            eventType,
            severity,
            startTime: reading.timestamp,
            startValue: reading.glucoseValue,
            peakValue: reading.glucoseValue,
            relatedReadingIds: [reading.id],
          };
        } else {
          // 기존 이벤트 계속
          currentEvent.relatedReadingIds = [
            ...(currentEvent.relatedReadingIds || []),
            reading.id,
          ];

          // peak 업데이트
          if (eventType.includes('hypo')) {
            if (reading.glucoseValue < (currentEvent.peakValue ?? Infinity)) {
              currentEvent.peakValue = reading.glucoseValue;
            }
          } else {
            if (reading.glucoseValue > (currentEvent.peakValue ?? 0)) {
              currentEvent.peakValue = reading.glucoseValue;
            }
          }
        }
      } else if (currentEvent) {
        // 이벤트 종료
        currentEvent.endTime = reading.timestamp;
        currentEvent.endValue = reading.glucoseValue;
        currentEvent.durationMinutes = this.calculateDuration(
          currentEvent.startTime!,
          currentEvent.endTime
        );
        events.push(this.eventRepo.create(currentEvent as CGMEvent));
        currentEvent = null;
      }
    }

    // 마지막 이벤트 처리
    if (currentEvent && currentEvent.startTime) {
      const lastReading = sortedReadings[sortedReadings.length - 1];
      currentEvent.endTime = lastReading.timestamp;
      currentEvent.durationMinutes = this.calculateDuration(
        currentEvent.startTime,
        currentEvent.endTime
      );
      events.push(this.eventRepo.create(currentEvent as CGMEvent));
    }

    // 이벤트 저장
    if (events.length > 0) {
      await this.eventRepo.save(events);
    }

    return events.length;
  }

  /**
   * 읽기값 분류
   */
  private classifyReading(
    reading: CGMReading
  ): { eventType: EventType | null; severity: EventSeverity } {
    const { glucoseValue } = reading;

    if (glucoseValue < this.config.severeHypoThreshold) {
      return { eventType: 'severe_hypoglycemia', severity: 'critical' };
    }
    if (glucoseValue < this.config.hypoglycemiaThreshold) {
      return { eventType: 'hypoglycemia', severity: 'high' };
    }
    if (glucoseValue > this.config.severeHyperThreshold) {
      return { eventType: 'severe_hyperglycemia', severity: 'high' };
    }
    if (glucoseValue > this.config.hyperglycemiaThreshold) {
      return { eventType: 'hyperglycemia', severity: 'medium' };
    }

    return { eventType: null, severity: 'low' };
  }

  /**
   * 기간 계산 (분)
   */
  private calculateDuration(start: Date, end?: Date): number {
    if (!end) return 0;
    return Math.round((new Date(end).getTime() - new Date(start).getTime()) / 60000);
  }

  /**
   * 세션 조회
   */
  async getSession(sessionId: string): Promise<CGMSession | null> {
    return this.sessionRepo.findOne({
      where: { id: sessionId },
    });
  }

  /**
   * 사용자의 활성 세션 조회
   */
  async getActiveSession(userId: string): Promise<CGMSession | null> {
    return this.sessionRepo.findOne({
      where: { userId, status: 'active' },
      order: { startDate: 'DESC' },
    });
  }

  /**
   * 기간별 readings 조회
   */
  async getReadings(
    userId: string,
    startDate: Date,
    endDate: Date
  ): Promise<CGMReading[]> {
    return this.readingRepo.find({
      where: {
        userId,
        timestamp: Between(startDate, endDate),
      },
      order: { timestamp: 'ASC' },
    });
  }

  /**
   * 기간별 이벤트 조회
   */
  async getEvents(
    userId: string,
    startDate: Date,
    endDate: Date
  ): Promise<CGMEvent[]> {
    return this.eventRepo.find({
      where: {
        userId,
        startTime: Between(startDate, endDate),
      },
      order: { startTime: 'DESC' },
    });
  }
}

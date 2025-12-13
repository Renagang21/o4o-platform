import { DataSource, Repository, Between, In, LessThanOrEqual, MoreThanOrEqual } from 'typeorm';
import { CoachingSession, CoachingMessage, DailyMetrics, PatternAnalysis } from '../entities/index.js';
import type {
  CoachingSessionType,
  CoachingSessionStatus,
  SessionMode,
  MessageSender,
  MessageType,
} from '../entities/index.js';

export interface CreateSessionDto {
  userId: string;
  pharmacyId: string;
  pharmacistId?: string;
  pharmacistName?: string;
  sessionType: CoachingSessionType;
  mode: SessionMode;
  scheduledAt: Date;
  agenda?: string;
  relatedReportId?: string;
}

export interface CreateMessageDto {
  sessionId: string;
  userId: string;
  sender: MessageSender;
  senderId?: string;
  messageType: MessageType;
  content: string;
  attachments?: Array<{ type: 'image' | 'pdf' | 'data'; url: string; name?: string }>;
  glucoseReference?: { date: string; metrics?: Record<string, number>; eventIds?: string[] };
  recommendation?: {
    category: 'diet' | 'exercise' | 'medication' | 'monitoring' | 'lifestyle';
    priority: 'low' | 'medium' | 'high';
    actionable: boolean;
  };
}

/**
 * CoachingService
 * 약국 코칭 세션 관리 서비스
 */
export class CoachingService {
  private sessionRepo: Repository<CoachingSession>;
  private messageRepo: Repository<CoachingMessage>;
  private metricsRepo: Repository<DailyMetrics>;
  private patternRepo: Repository<PatternAnalysis>;

  constructor(private dataSource: DataSource) {
    this.sessionRepo = dataSource.getRepository(CoachingSession);
    this.messageRepo = dataSource.getRepository(CoachingMessage);
    this.metricsRepo = dataSource.getRepository(DailyMetrics);
    this.patternRepo = dataSource.getRepository(PatternAnalysis);
  }

  /**
   * 코칭 세션 생성
   */
  async createSession(dto: CreateSessionDto): Promise<CoachingSession> {
    // 환자 데이터 스냅샷 생성
    const dataSnapshot = await this.createPatientDataSnapshot(dto.userId);

    const session = this.sessionRepo.create({
      ...dto,
      status: 'scheduled',
      patientDataSnapshot: dataSnapshot,
    });

    return this.sessionRepo.save(session);
  }

  /**
   * 환자 데이터 스냅샷 생성
   */
  private async createPatientDataSnapshot(
    userId: string
  ): Promise<CoachingSession['patientDataSnapshot']> {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 7);

    const metrics = await this.metricsRepo.find({
      where: { userId, date: Between(startDate, endDate) },
    });

    const patterns = await this.patternRepo.find({
      where: { userId, isActive: true },
      order: { analyzedAt: 'DESC' },
      take: 5,
    });

    if (metrics.length === 0) {
      return undefined;
    }

    const avgGlucose =
      metrics.reduce((sum, m) => sum + Number(m.meanGlucose ?? 0), 0) / metrics.length;
    const avgTir = metrics.reduce((sum, m) => sum + Number(m.tirPercent ?? 0), 0) / metrics.length;
    const totalHypo = metrics.reduce((sum, m) => sum + (m.hypoEvents ?? 0), 0);

    return {
      avgGlucose7d: avgGlucose,
      tir7d: avgTir,
      hypoEvents7d: totalHypo,
      recentPatterns: patterns.map((p) => p.patternType),
    };
  }

  /**
   * 세션 시작
   */
  async startSession(sessionId: string): Promise<CoachingSession> {
    const session = await this.sessionRepo.findOneOrFail({ where: { id: sessionId } });

    if (session.status !== 'scheduled') {
      throw new Error(`Cannot start session with status "${session.status}"`);
    }

    session.status = 'in_progress';
    session.startedAt = new Date();

    return this.sessionRepo.save(session);
  }

  /**
   * 세션 완료
   */
  async completeSession(
    sessionId: string,
    summary?: string,
    actionItems?: CoachingSession['actionItems']
  ): Promise<CoachingSession> {
    const session = await this.sessionRepo.findOneOrFail({ where: { id: sessionId } });

    if (session.status !== 'in_progress') {
      throw new Error(`Cannot complete session with status "${session.status}"`);
    }

    session.status = 'completed';
    session.endedAt = new Date();
    session.durationMinutes = Math.round(
      (session.endedAt.getTime() - (session.startedAt?.getTime() ?? 0)) / 60000
    );

    if (summary) {
      session.summary = summary;
    }

    if (actionItems) {
      session.actionItems = actionItems;
    }

    return this.sessionRepo.save(session);
  }

  /**
   * 세션 취소
   */
  async cancelSession(sessionId: string): Promise<CoachingSession> {
    const session = await this.sessionRepo.findOneOrFail({ where: { id: sessionId } });

    if (session.status === 'completed') {
      throw new Error('Cannot cancel completed session');
    }

    session.status = 'cancelled';
    return this.sessionRepo.save(session);
  }

  /**
   * 메시지 전송
   */
  async sendMessage(dto: CreateMessageDto): Promise<CoachingMessage> {
    const message = this.messageRepo.create(dto);
    return this.messageRepo.save(message);
  }

  /**
   * 메시지 읽음 처리
   */
  async markMessageAsRead(messageId: string): Promise<CoachingMessage> {
    const message = await this.messageRepo.findOneOrFail({ where: { id: messageId } });

    if (!message.isRead) {
      message.isRead = true;
      message.readAt = new Date();
      return this.messageRepo.save(message);
    }

    return message;
  }

  /**
   * 세션 메시지 조회
   */
  async getSessionMessages(sessionId: string): Promise<CoachingMessage[]> {
    return this.messageRepo.find({
      where: { sessionId },
      order: { createdAt: 'ASC' },
    });
  }

  /**
   * 세션 조회
   */
  async getSession(sessionId: string): Promise<CoachingSession | null> {
    return this.sessionRepo.findOne({
      where: { id: sessionId },
    });
  }

  /**
   * 사용자 세션 목록 조회
   */
  async getUserSessions(
    userId: string,
    options?: { status?: CoachingSessionStatus | CoachingSessionStatus[]; limit?: number }
  ): Promise<CoachingSession[]> {
    const where: Record<string, unknown> = { userId };

    if (options?.status) {
      where.status = Array.isArray(options.status) ? In(options.status) : options.status;
    }

    return this.sessionRepo.find({
      where,
      order: { scheduledAt: 'DESC' },
      take: options?.limit ?? 20,
    });
  }

  /**
   * 약국 세션 목록 조회
   */
  async getPharmacySessions(
    pharmacyId: string,
    options?: {
      status?: CoachingSessionStatus | CoachingSessionStatus[];
      startDate?: Date;
      endDate?: Date;
    }
  ): Promise<CoachingSession[]> {
    const where: Record<string, unknown> = { pharmacyId };

    if (options?.status) {
      where.status = Array.isArray(options.status) ? In(options.status) : options.status;
    }

    if (options?.startDate && options?.endDate) {
      where.scheduledAt = Between(options.startDate, options.endDate);
    }

    return this.sessionRepo.find({
      where,
      order: { scheduledAt: 'ASC' },
    });
  }

  /**
   * 예정된 세션 조회 (알림용)
   */
  async getUpcomingSessions(pharmacyId: string, withinHours: number = 24): Promise<CoachingSession[]> {
    const now = new Date();
    const futureDate = new Date(now.getTime() + withinHours * 60 * 60 * 1000);

    return this.sessionRepo.find({
      where: {
        pharmacyId,
        status: 'scheduled',
        scheduledAt: Between(now, futureDate),
      },
      order: { scheduledAt: 'ASC' },
    });
  }

  /**
   * 다음 세션 예약
   */
  async scheduleNextSession(
    currentSessionId: string,
    scheduledAt: Date
  ): Promise<CoachingSession> {
    const currentSession = await this.sessionRepo.findOneOrFail({
      where: { id: currentSessionId },
    });

    // 현재 세션 업데이트
    currentSession.nextSessionScheduled = scheduledAt;
    await this.sessionRepo.save(currentSession);

    // 새 세션 생성
    return this.createSession({
      userId: currentSession.userId,
      pharmacyId: currentSession.pharmacyId,
      pharmacistId: currentSession.pharmacistId,
      pharmacistName: currentSession.pharmacistName,
      sessionType: 'followup',
      mode: currentSession.mode,
      scheduledAt,
    });
  }

  /**
   * 세션 노트 업데이트
   */
  async updateSessionNotes(sessionId: string, notes: string): Promise<CoachingSession> {
    const session = await this.sessionRepo.findOneOrFail({ where: { id: sessionId } });
    session.notes = notes;
    return this.sessionRepo.save(session);
  }

  /**
   * 논의 주제 추가
   */
  async addTopicDiscussed(
    sessionId: string,
    topic: string,
    notes?: string
  ): Promise<CoachingSession> {
    const session = await this.sessionRepo.findOneOrFail({ where: { id: sessionId } });

    if (!session.topicsDiscussed) {
      session.topicsDiscussed = [];
    }

    session.topicsDiscussed.push({ topic, notes });
    return this.sessionRepo.save(session);
  }

  /**
   * 위험 환자 조회 (약국용)
   */
  async getHighRiskPatients(pharmacyId: string): Promise<
    Array<{
      userId: string;
      lastSession?: CoachingSession;
      riskIndicators: string[];
    }>
  > {
    // 최근 세션이 있는 환자들 조회
    const recentSessions = await this.sessionRepo
      .createQueryBuilder('session')
      .where('session.pharmacyId = :pharmacyId', { pharmacyId })
      .andWhere('session.status = :status', { status: 'completed' })
      .orderBy('session.endedAt', 'DESC')
      .getMany();

    // 환자별 마지막 세션 그룹핑
    const userSessionMap = new Map<string, CoachingSession>();
    for (const session of recentSessions) {
      if (!userSessionMap.has(session.userId)) {
        userSessionMap.set(session.userId, session);
      }
    }

    const highRiskPatients: Array<{
      userId: string;
      lastSession?: CoachingSession;
      riskIndicators: string[];
    }> = [];

    for (const [userId, lastSession] of userSessionMap) {
      const riskIndicators: string[] = [];

      // 스냅샷 기반 위험 지표 확인
      const snapshot = lastSession.patientDataSnapshot;
      if (snapshot) {
        if ((snapshot.tir7d ?? 100) < 50) {
          riskIndicators.push('낮은 TIR');
        }
        if ((snapshot.hypoEvents7d ?? 0) > 3) {
          riskIndicators.push('반복 저혈당');
        }
        if (snapshot.recentPatterns?.includes('nocturnal_hypo')) {
          riskIndicators.push('야간 저혈당');
        }
      }

      if (riskIndicators.length > 0) {
        highRiskPatients.push({
          userId,
          lastSession,
          riskIndicators,
        });
      }
    }

    return highRiskPatients;
  }
}

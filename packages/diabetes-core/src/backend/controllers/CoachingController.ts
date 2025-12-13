import { Request, Response, Router } from 'express';
import type { DataSource } from 'typeorm';
import { CoachingService } from '../services/CoachingService.js';
import type {
  CoachingSessionCreateDto,
  CoachingMessageCreateDto,
  CoachingSessionResponseDto,
} from '../dto/index.js';

/**
 * CoachingController
 * 코칭 API 컨트롤러
 */
export class CoachingController {
  private coachingService: CoachingService;

  constructor(private dataSource: DataSource) {
    this.coachingService = new CoachingService(dataSource);
  }

  /**
   * 코칭 세션 생성
   * POST /diabetes/coaching/:userId
   */
  async createSession(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.params.userId || (req as any).user?.id;
      if (!userId) {
        res.status(400).json({ error: 'User ID is required' });
        return;
      }

      const body = req.body as CoachingSessionCreateDto;

      if (!body.pharmacyId || !body.sessionType || !body.scheduledAt) {
        res.status(400).json({ error: 'pharmacyId, sessionType, and scheduledAt are required' });
        return;
      }

      const session = await this.coachingService.createSession({
        userId,
        pharmacyId: body.pharmacyId,
        pharmacistId: body.pharmacistId,
        pharmacistName: body.pharmacistName,
        sessionType: body.sessionType,
        mode: body.mode || 'in_person',
        scheduledAt: new Date(body.scheduledAt),
        agenda: body.agenda,
        relatedReportId: body.relatedReportId,
      });

      res.status(201).json({
        success: true,
        session: this.formatSessionResponse(session),
      });
    } catch (error) {
      console.error('[CoachingController] CreateSession error:', error);
      res.status(500).json({ error: 'Failed to create session' });
    }
  }

  /**
   * 세션 시작
   * POST /diabetes/coaching/session/:sessionId/start
   */
  async startSession(req: Request, res: Response): Promise<void> {
    try {
      const { sessionId } = req.params;

      const session = await this.coachingService.startSession(sessionId);

      res.json({
        success: true,
        session: this.formatSessionResponse(session),
      });
    } catch (error) {
      console.error('[CoachingController] StartSession error:', error);
      res.status(500).json({ error: 'Failed to start session' });
    }
  }

  /**
   * 세션 완료
   * POST /diabetes/coaching/session/:sessionId/complete
   */
  async completeSession(req: Request, res: Response): Promise<void> {
    try {
      const { sessionId } = req.params;
      const { summary, actionItems } = req.body;

      const session = await this.coachingService.completeSession(sessionId, summary, actionItems);

      res.json({
        success: true,
        session: this.formatSessionResponse(session),
      });
    } catch (error) {
      console.error('[CoachingController] CompleteSession error:', error);
      res.status(500).json({ error: 'Failed to complete session' });
    }
  }

  /**
   * 세션 취소
   * POST /diabetes/coaching/session/:sessionId/cancel
   */
  async cancelSession(req: Request, res: Response): Promise<void> {
    try {
      const { sessionId } = req.params;

      const session = await this.coachingService.cancelSession(sessionId);

      res.json({
        success: true,
        session: this.formatSessionResponse(session),
      });
    } catch (error) {
      console.error('[CoachingController] CancelSession error:', error);
      res.status(500).json({ error: 'Failed to cancel session' });
    }
  }

  /**
   * 세션 조회
   * GET /diabetes/coaching/session/:sessionId
   */
  async getSession(req: Request, res: Response): Promise<void> {
    try {
      const { sessionId } = req.params;

      const session = await this.coachingService.getSession(sessionId);

      if (!session) {
        res.status(404).json({ error: 'Session not found' });
        return;
      }

      res.json(this.formatSessionResponse(session));
    } catch (error) {
      console.error('[CoachingController] GetSession error:', error);
      res.status(500).json({ error: 'Failed to get session' });
    }
  }

  /**
   * 사용자 세션 목록 조회
   * GET /diabetes/coaching/:userId
   */
  async getUserSessions(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.params.userId || (req as any).user?.id;
      if (!userId) {
        res.status(400).json({ error: 'User ID is required' });
        return;
      }

      const status = req.query.status as string | undefined;
      const limit = parseInt(req.query.limit as string) || 20;

      const sessions = await this.coachingService.getUserSessions(userId, {
        status: status as any,
        limit,
      });

      res.json({
        count: sessions.length,
        sessions: sessions.map((s) => this.formatSessionResponse(s)),
      });
    } catch (error) {
      console.error('[CoachingController] GetUserSessions error:', error);
      res.status(500).json({ error: 'Failed to get user sessions' });
    }
  }

  /**
   * 메시지 전송
   * POST /diabetes/coaching/session/:sessionId/message
   */
  async sendMessage(req: Request, res: Response): Promise<void> {
    try {
      const { sessionId } = req.params;
      const body = req.body as CoachingMessageCreateDto;
      const userId = (req as any).user?.id;

      if (!body.content || !body.sender) {
        res.status(400).json({ error: 'content and sender are required' });
        return;
      }

      const message = await this.coachingService.sendMessage({
        sessionId,
        userId,
        sender: body.sender,
        senderId: body.sender === 'pharmacist' ? (req as any).user?.id : undefined,
        messageType: body.messageType || 'text',
        content: body.content,
        attachments: body.attachments,
      });

      res.status(201).json({
        success: true,
        message: {
          id: message.id,
          sender: message.sender,
          messageType: message.messageType,
          content: message.content,
          createdAt: message.createdAt.toISOString(),
        },
      });
    } catch (error) {
      console.error('[CoachingController] SendMessage error:', error);
      res.status(500).json({ error: 'Failed to send message' });
    }
  }

  /**
   * 세션 메시지 조회
   * GET /diabetes/coaching/session/:sessionId/messages
   */
  async getSessionMessages(req: Request, res: Response): Promise<void> {
    try {
      const { sessionId } = req.params;

      const messages = await this.coachingService.getSessionMessages(sessionId);

      res.json({
        count: messages.length,
        messages: messages.map((m) => ({
          id: m.id,
          sender: m.sender,
          messageType: m.messageType,
          content: m.content,
          attachments: m.attachments,
          isRead: m.isRead,
          createdAt: m.createdAt.toISOString(),
        })),
      });
    } catch (error) {
      console.error('[CoachingController] GetSessionMessages error:', error);
      res.status(500).json({ error: 'Failed to get messages' });
    }
  }

  /**
   * 약국 세션 조회
   * GET /diabetes/coaching/pharmacy/:pharmacyId
   */
  async getPharmacySessions(req: Request, res: Response): Promise<void> {
    try {
      const { pharmacyId } = req.params;
      const { status, startDate, endDate } = req.query;

      const sessions = await this.coachingService.getPharmacySessions(pharmacyId, {
        status: status as any,
        startDate: startDate ? new Date(startDate as string) : undefined,
        endDate: endDate ? new Date(endDate as string) : undefined,
      });

      res.json({
        count: sessions.length,
        sessions: sessions.map((s) => this.formatSessionResponse(s)),
      });
    } catch (error) {
      console.error('[CoachingController] GetPharmacySessions error:', error);
      res.status(500).json({ error: 'Failed to get pharmacy sessions' });
    }
  }

  /**
   * 위험 환자 조회 (약국용)
   * GET /diabetes/coaching/pharmacy/:pharmacyId/high-risk
   */
  async getHighRiskPatients(req: Request, res: Response): Promise<void> {
    try {
      const { pharmacyId } = req.params;

      const patients = await this.coachingService.getHighRiskPatients(pharmacyId);

      res.json({
        count: patients.length,
        patients,
      });
    } catch (error) {
      console.error('[CoachingController] GetHighRiskPatients error:', error);
      res.status(500).json({ error: 'Failed to get high-risk patients' });
    }
  }

  /**
   * 세션 응답 포맷팅
   */
  private formatSessionResponse(session: any): CoachingSessionResponseDto {
    return {
      id: session.id,
      userId: session.userId,
      pharmacyId: session.pharmacyId,
      pharmacistName: session.pharmacistName,
      sessionType: session.sessionType,
      status: session.status,
      mode: session.mode,
      scheduledAt: session.scheduledAt?.toISOString?.() || session.scheduledAt,
      startedAt: session.startedAt?.toISOString?.(),
      endedAt: session.endedAt?.toISOString?.(),
      durationMinutes: session.durationMinutes,
      summary: session.summary,
      patientDataSnapshot: session.patientDataSnapshot,
      nextSessionScheduled: session.nextSessionScheduled?.toISOString?.(),
    };
  }

  /**
   * 라우터 생성
   */
  createRouter(): Router {
    const router = Router();

    // User sessions
    router.post('/:userId', this.createSession.bind(this));
    router.get('/:userId', this.getUserSessions.bind(this));

    // Session operations
    router.get('/session/:sessionId', this.getSession.bind(this));
    router.post('/session/:sessionId/start', this.startSession.bind(this));
    router.post('/session/:sessionId/complete', this.completeSession.bind(this));
    router.post('/session/:sessionId/cancel', this.cancelSession.bind(this));

    // Messages
    router.post('/session/:sessionId/message', this.sendMessage.bind(this));
    router.get('/session/:sessionId/messages', this.getSessionMessages.bind(this));

    // Pharmacy
    router.get('/pharmacy/:pharmacyId', this.getPharmacySessions.bind(this));
    router.get('/pharmacy/:pharmacyId/high-risk', this.getHighRiskPatients.bind(this));

    return router;
  }
}

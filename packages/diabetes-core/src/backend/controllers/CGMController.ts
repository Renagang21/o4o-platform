import { Request, Response, Router } from 'express';
import type { DataSource } from 'typeorm';
import { CGMIngestService } from '../services/CGMIngestService.js';
import { MetricsCalculatorService } from '../services/MetricsCalculatorService.js';
import type { CGMIngestRequestDto } from '../dto/index.js';

/**
 * CGMController
 * CGM 데이터 관련 API 컨트롤러
 */
export class CGMController {
  private ingestService: CGMIngestService;
  private metricsService: MetricsCalculatorService;

  constructor(private dataSource: DataSource) {
    this.ingestService = new CGMIngestService(dataSource);
    this.metricsService = new MetricsCalculatorService(dataSource);
  }

  /**
   * CGM 데이터 수집
   * POST /diabetes/cgm/ingest
   */
  async ingest(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.params.userId || (req as any).user?.id;
      if (!userId) {
        res.status(400).json({ error: 'User ID is required' });
        return;
      }

      const body = req.body as CGMIngestRequestDto;

      const result = await this.ingestService.ingest({
        userId,
        deviceType: body.deviceType,
        deviceSerial: body.deviceSerial,
        sensorId: body.sensorId,
        pharmacyId: body.pharmacyId,
        readings: body.readings.map((r) => ({
          ...r,
          timestamp: new Date(r.timestamp),
        })),
      });

      res.status(201).json({
        success: true,
        ...result,
      });
    } catch (error) {
      console.error('[CGMController] Ingest error:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * 활성 세션 조회
   * GET /diabetes/cgm/session/active
   */
  async getActiveSession(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.params.userId || (req as any).user?.id;
      if (!userId) {
        res.status(400).json({ error: 'User ID is required' });
        return;
      }

      const session = await this.ingestService.getActiveSession(userId);

      if (!session) {
        res.status(404).json({ error: 'No active session found' });
        return;
      }

      res.json(session);
    } catch (error) {
      console.error('[CGMController] GetActiveSession error:', error);
      res.status(500).json({ error: 'Failed to get active session' });
    }
  }

  /**
   * 세션 상세 조회
   * GET /diabetes/cgm/session/:sessionId
   */
  async getSession(req: Request, res: Response): Promise<void> {
    try {
      const { sessionId } = req.params;

      const session = await this.ingestService.getSession(sessionId);

      if (!session) {
        res.status(404).json({ error: 'Session not found' });
        return;
      }

      res.json(session);
    } catch (error) {
      console.error('[CGMController] GetSession error:', error);
      res.status(500).json({ error: 'Failed to get session' });
    }
  }

  /**
   * CGM 읽기 데이터 조회
   * GET /diabetes/cgm/readings
   */
  async getReadings(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.params.userId || (req as any).user?.id;
      if (!userId) {
        res.status(400).json({ error: 'User ID is required' });
        return;
      }

      const { startDate, endDate } = req.query;
      if (!startDate || !endDate) {
        res.status(400).json({ error: 'startDate and endDate are required' });
        return;
      }

      const readings = await this.ingestService.getReadings(
        userId,
        new Date(startDate as string),
        new Date(endDate as string)
      );

      res.json({
        count: readings.length,
        readings,
      });
    } catch (error) {
      console.error('[CGMController] GetReadings error:', error);
      res.status(500).json({ error: 'Failed to get readings' });
    }
  }

  /**
   * CGM 이벤트 조회
   * GET /diabetes/cgm/events
   */
  async getEvents(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.params.userId || (req as any).user?.id;
      if (!userId) {
        res.status(400).json({ error: 'User ID is required' });
        return;
      }

      const { startDate, endDate } = req.query;
      if (!startDate || !endDate) {
        res.status(400).json({ error: 'startDate and endDate are required' });
        return;
      }

      const events = await this.ingestService.getEvents(
        userId,
        new Date(startDate as string),
        new Date(endDate as string)
      );

      res.json({
        count: events.length,
        events,
      });
    } catch (error) {
      console.error('[CGMController] GetEvents error:', error);
      res.status(500).json({ error: 'Failed to get events' });
    }
  }

  /**
   * 라우터 생성
   */
  createRouter(): Router {
    const router = Router();

    // CGM Ingest
    router.post('/ingest', this.ingest.bind(this));
    router.post('/:userId/ingest', this.ingest.bind(this));

    // Sessions
    router.get('/session/active', this.getActiveSession.bind(this));
    router.get('/:userId/session/active', this.getActiveSession.bind(this));
    router.get('/session/:sessionId', this.getSession.bind(this));

    // Readings & Events
    router.get('/readings', this.getReadings.bind(this));
    router.get('/:userId/readings', this.getReadings.bind(this));
    router.get('/events', this.getEvents.bind(this));
    router.get('/:userId/events', this.getEvents.bind(this));

    return router;
  }
}

import { Request, Response, Router } from 'express';
import type { DataSource } from 'typeorm';
import { PatternDetectorService } from '../services/PatternDetectorService.js';
import type { PatternResponseDto } from '../dto/index.js';

/**
 * PatternController
 * 혈당 패턴 API 컨트롤러
 */
export class PatternController {
  private patternService: PatternDetectorService;

  constructor(private dataSource: DataSource) {
    this.patternService = new PatternDetectorService(dataSource);
  }

  /**
   * 사용자 패턴 조회
   * GET /diabetes/patterns/:userId
   */
  async getPatterns(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.params.userId || (req as any).user?.id;
      if (!userId) {
        res.status(400).json({ error: 'User ID is required' });
        return;
      }

      const activeOnly = req.query.activeOnly !== 'false';
      const patterns = await this.patternService.getPatterns(userId, activeOnly);

      const response: PatternResponseDto[] = patterns.map((p) => ({
        id: p.id,
        patternType: p.patternType,
        confidence: p.confidence,
        confidenceScore: Number(p.confidenceScore ?? 0),
        occurrenceCount: p.occurrenceCount,
        description: p.description,
        timeOfDay: p.timeOfDay,
        recommendations: p.recommendations,
        isActive: p.isActive,
        acknowledged: p.acknowledged,
        analyzedAt: p.analyzedAt.toISOString(),
      }));

      res.json({
        count: response.length,
        patterns: response,
      });
    } catch (error) {
      console.error('[PatternController] GetPatterns error:', error);
      res.status(500).json({ error: 'Failed to get patterns' });
    }
  }

  /**
   * 패턴 분석 실행
   * POST /diabetes/patterns/:userId/analyze
   */
  async analyzePatterns(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.params.userId || (req as any).user?.id;
      if (!userId) {
        res.status(400).json({ error: 'User ID is required' });
        return;
      }

      const { startDate, endDate } = req.body;

      // 기본값: 최근 14일
      const end = endDate ? new Date(endDate) : new Date();
      const start = startDate
        ? new Date(startDate)
        : new Date(end.getTime() - 14 * 24 * 60 * 60 * 1000);

      const patterns = await this.patternService.analyzePatterns(userId, start, end);

      res.json({
        success: true,
        period: {
          startDate: start.toISOString().split('T')[0],
          endDate: end.toISOString().split('T')[0],
        },
        patternsDetected: patterns.length,
        patterns: patterns.map((p) => ({
          id: p.id,
          patternType: p.patternType,
          confidence: p.confidence,
          description: p.description,
        })),
      });
    } catch (error) {
      console.error('[PatternController] AnalyzePatterns error:', error);
      res.status(500).json({ error: 'Failed to analyze patterns' });
    }
  }

  /**
   * 패턴 확인 처리
   * POST /diabetes/patterns/:patternId/acknowledge
   */
  async acknowledgePattern(req: Request, res: Response): Promise<void> {
    try {
      const { patternId } = req.params;

      const pattern = await this.patternService.acknowledgePattern(patternId);

      res.json({
        success: true,
        pattern: {
          id: pattern.id,
          acknowledged: pattern.acknowledged,
          acknowledgedAt: pattern.acknowledgedAt?.toISOString(),
        },
      });
    } catch (error) {
      console.error('[PatternController] AcknowledgePattern error:', error);
      res.status(500).json({ error: 'Failed to acknowledge pattern' });
    }
  }

  /**
   * 라우터 생성
   */
  createRouter(): Router {
    const router = Router();

    router.get('/:userId', this.getPatterns.bind(this));
    router.post('/:userId/analyze', this.analyzePatterns.bind(this));
    router.post('/:patternId/acknowledge', this.acknowledgePattern.bind(this));

    return router;
  }
}

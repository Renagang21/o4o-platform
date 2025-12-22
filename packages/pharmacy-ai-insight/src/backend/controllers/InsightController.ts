/**
 * InsightController
 *
 * AI 인사이트 API 엔드포인트 (최소 계약 기반)
 *
 * @package @o4o/pharmacy-ai-insight
 */

import type { Router, Request, Response } from 'express';
import { AiInsightService } from '../services/AiInsightService.js';
import type { AiInsightInput, GlucoseSummary, PurchaseHistory } from '../dto/index.js';

export class InsightController {
  private aiInsightService: AiInsightService;

  constructor() {
    this.aiInsightService = new AiInsightService();
  }

  /**
   * AI 요약 조회
   * GET /api/v1/pharmacy-ai-insight/summary
   */
  async getSummary(req: Request, res: Response): Promise<void> {
    try {
      const pharmacyId = this.getPharmacyId(req);
      if (!pharmacyId) {
        res.status(401).json({ error: '약국 인증이 필요합니다.' });
        return;
      }

      const input = this.buildInsightInput(req, pharmacyId);
      const insight = await this.aiInsightService.generateInsight(input);
      res.json(insight);
    } catch (error) {
      console.error('[InsightController] getSummary error:', error);
      res.status(500).json({
        error: 'AI 요약 생성 중 오류가 발생했습니다.',
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * 패턴 분석 조회
   * POST /api/v1/pharmacy-ai-insight/patterns
   */
  async getPatterns(req: Request, res: Response): Promise<void> {
    try {
      const pharmacyId = this.getPharmacyId(req);
      if (!pharmacyId) {
        res.status(401).json({ error: '약국 인증이 필요합니다.' });
        return;
      }

      const input = this.buildInsightInput(req, pharmacyId);
      const insight = await this.aiInsightService.generateInsight(input);
      res.json({
        patterns: insight.patterns,
        disclaimer: insight.disclaimer,
      });
    } catch (error) {
      console.error('[InsightController] getPatterns error:', error);
      res.status(500).json({
        error: '패턴 분석 중 오류가 발생했습니다.',
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * 제품 힌트 조회
   * POST /api/v1/pharmacy-ai-insight/product-hints
   */
  async getProductHints(req: Request, res: Response): Promise<void> {
    try {
      const pharmacyId = this.getPharmacyId(req);
      if (!pharmacyId) {
        res.status(401).json({ error: '약국 인증이 필요합니다.' });
        return;
      }

      const input = this.buildInsightInput(req, pharmacyId);
      const insight = await this.aiInsightService.generateInsight(input);
      res.json({
        productHints: insight.productHints,
        disclaimer: insight.disclaimer,
      });
    } catch (error) {
      console.error('[InsightController] getProductHints error:', error);
      res.status(500).json({
        error: '제품 힌트 생성 중 오류가 발생했습니다.',
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * AiInsightInput 빌드 (요청에서 필요한 데이터 추출)
   */
  private buildInsightInput(req: Request, pharmacyId: string): AiInsightInput {
    // 쿼리 또는 바디에서 데이터 추출
    const glucoseSummaryRaw = req.body?.glucoseSummary ||
      (req.query.glucoseSummary ? JSON.parse(req.query.glucoseSummary as string) : undefined);

    const purchaseHistoryRaw = req.body?.purchaseHistory ||
      (req.query.purchaseHistory ? JSON.parse(req.query.purchaseHistory as string) : undefined);

    // 레거시 필드 호환 (cgmSummary → glucoseSummary)
    const cgmSummaryRaw = req.body?.cgmSummary ||
      (req.query.cgmSummary ? JSON.parse(req.query.cgmSummary as string) : undefined);

    const glucoseSummary: GlucoseSummary | undefined = glucoseSummaryRaw || cgmSummaryRaw;
    const purchaseHistory: PurchaseHistory | undefined = purchaseHistoryRaw || req.body?.productMeta;

    return {
      context: {
        pharmacyId,
        pharmacyName: req.body?.pharmacyName,
        season: this.getCurrentSeason(),
      },
      glucoseSummary,
      purchaseHistory,
    };
  }

  /**
   * 현재 계절 반환
   */
  private getCurrentSeason(): 'spring' | 'summer' | 'fall' | 'winter' {
    const month = new Date().getMonth() + 1;
    if (month >= 3 && month <= 5) return 'spring';
    if (month >= 6 && month <= 8) return 'summer';
    if (month >= 9 && month <= 11) return 'fall';
    return 'winter';
  }

  /**
   * 요청에서 약국 ID 추출
   */
  private getPharmacyId(req: Request): string | null {
    return (req as any).user?.organizationId || (req as any).pharmacyId || null;
  }
}

/**
 * Insight 라우트 생성
 */
export function createInsightRoutes(router: Router): void {
  const controller = new InsightController();

  router.get('/summary', (req, res) => controller.getSummary(req, res));
  router.post('/patterns', (req, res) => controller.getPatterns(req, res));
  router.post('/product-hints', (req, res) => controller.getProductHints(req, res));
}

export default InsightController;

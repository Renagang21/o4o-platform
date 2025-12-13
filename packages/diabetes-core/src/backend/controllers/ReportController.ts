import { Request, Response, Router } from 'express';
import type { DataSource } from 'typeorm';
import { ReportGeneratorService } from '../services/ReportGeneratorService.js';
import type { ReportGenerateRequestDto, ReportResponseDto } from '../dto/index.js';

/**
 * ReportController
 * 리포트 API 컨트롤러
 */
export class ReportController {
  private reportService: ReportGeneratorService;

  constructor(private dataSource: DataSource) {
    this.reportService = new ReportGeneratorService(dataSource);
  }

  /**
   * 리포트 생성
   * POST /diabetes/report/:userId
   */
  async generateReport(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.params.userId || (req as any).user?.id;
      if (!userId) {
        res.status(400).json({ error: 'User ID is required' });
        return;
      }

      const body = req.body as ReportGenerateRequestDto;

      if (!body.reportType || !body.startDate || !body.endDate) {
        res.status(400).json({ error: 'reportType, startDate, and endDate are required' });
        return;
      }

      const report = await this.reportService.generateReport({
        userId,
        reportType: body.reportType,
        startDate: new Date(body.startDate),
        endDate: new Date(body.endDate),
        pharmacyId: body.pharmacyId,
        includePatternAnalysis: body.includePatternAnalysis ?? true,
        includeRecommendations: body.includeRecommendations ?? true,
      });

      res.status(201).json({
        success: true,
        report: this.formatReportResponse(report),
      });
    } catch (error) {
      console.error('[ReportController] GenerateReport error:', error);
      res.status(500).json({ error: 'Failed to generate report' });
    }
  }

  /**
   * 리포트 조회
   * GET /diabetes/report/:reportId
   */
  async getReport(req: Request, res: Response): Promise<void> {
    try {
      const { reportId } = req.params;

      const report = await this.reportService.getReport(reportId);

      if (!report) {
        res.status(404).json({ error: 'Report not found' });
        return;
      }

      // 조회 처리
      await this.reportService.markAsViewed(reportId);

      res.json(this.formatReportResponse(report));
    } catch (error) {
      console.error('[ReportController] GetReport error:', error);
      res.status(500).json({ error: 'Failed to get report' });
    }
  }

  /**
   * 사용자 리포트 목록 조회
   * GET /diabetes/reports/:userId
   */
  async getUserReports(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.params.userId || (req as any).user?.id;
      if (!userId) {
        res.status(400).json({ error: 'User ID is required' });
        return;
      }

      const limit = parseInt(req.query.limit as string) || 10;
      const offset = parseInt(req.query.offset as string) || 0;

      const reports = await this.reportService.getUserReports(userId, { limit, offset });

      res.json({
        count: reports.length,
        reports: reports.map((r) => this.formatReportResponse(r)),
      });
    } catch (error) {
      console.error('[ReportController] GetUserReports error:', error);
      res.status(500).json({ error: 'Failed to get user reports' });
    }
  }

  /**
   * 약사 코멘트 추가
   * POST /diabetes/report/:reportId/comment
   */
  async addComment(req: Request, res: Response): Promise<void> {
    try {
      const { reportId } = req.params;
      const { comment, pharmacistId } = req.body;

      if (!comment) {
        res.status(400).json({ error: 'Comment is required' });
        return;
      }

      const report = await this.reportService.addPharmacistComment(
        reportId,
        comment,
        pharmacistId || (req as any).user?.id
      );

      res.json({
        success: true,
        report: this.formatReportResponse(report),
      });
    } catch (error) {
      console.error('[ReportController] AddComment error:', error);
      res.status(500).json({ error: 'Failed to add comment' });
    }
  }

  /**
   * 리포트 전송 처리
   * POST /diabetes/report/:reportId/send
   */
  async sendReport(req: Request, res: Response): Promise<void> {
    try {
      const { reportId } = req.params;

      const report = await this.reportService.markAsSent(reportId);

      res.json({
        success: true,
        sentAt: report.sentAt?.toISOString(),
      });
    } catch (error) {
      console.error('[ReportController] SendReport error:', error);
      res.status(500).json({ error: 'Failed to send report' });
    }
  }

  /**
   * 리포트 응답 포맷팅
   */
  private formatReportResponse(report: any): ReportResponseDto {
    return {
      id: report.id,
      reportType: report.reportType,
      status: report.status,
      periodStart: report.periodStart?.toISOString?.()?.split('T')[0] || report.periodStart,
      periodEnd: report.periodEnd?.toISOString?.()?.split('T')[0] || report.periodEnd,
      title: report.title,
      summaryMetrics: report.summaryMetrics
        ? {
            totalReadings: report.summaryMetrics.totalReadings,
            avgGlucose: report.summaryMetrics.avgGlucose,
            tir: report.summaryMetrics.tirPercent,
            hypoEvents: report.summaryMetrics.hypoEvents,
            hyperEvents: report.summaryMetrics.hyperEvents,
            gmi: report.summaryMetrics.gmi,
          }
        : undefined,
      comparison: report.comparison,
      recommendations: report.recommendations,
      pharmacistComment: report.pharmacistComment,
      createdAt: report.createdAt?.toISOString?.() || report.createdAt,
    };
  }

  /**
   * 라우터 생성
   */
  createRouter(): Router {
    const router = Router();

    router.post('/:userId', this.generateReport.bind(this));
    router.get('/detail/:reportId', this.getReport.bind(this));
    router.get('/:userId', this.getUserReports.bind(this));
    router.post('/:reportId/comment', this.addComment.bind(this));
    router.post('/:reportId/send', this.sendReport.bind(this));

    return router;
  }
}

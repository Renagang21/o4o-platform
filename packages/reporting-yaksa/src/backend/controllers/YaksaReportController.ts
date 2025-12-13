import { Request, Response, NextFunction } from 'express';
import {
  yaksaReportService,
  ListReportsOptions,
  UpdateReportInput,
} from '../services/YaksaReportService.js';
import { YaksaReportStatus, YaksaReportType } from '../entities/YaksaReport.js';

/**
 * YaksaReportController
 *
 * forum-yaksa RPA 기반 신고서 API 컨트롤러
 */
export class YaksaReportController {
  /**
   * GET /api/v1/yaksa/reports
   * 신고서 목록 조회
   */
  async listReports(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const {
        status,
        reportType,
        memberId,
        page = '1',
        limit = '20',
        sortBy = 'createdAt',
        sortOrder = 'DESC',
      } = req.query;

      const options: ListReportsOptions = {
        page: parseInt(page as string, 10),
        limit: Math.min(parseInt(limit as string, 10), 100),
        sortBy: sortBy as 'createdAt' | 'confidence' | 'updatedAt',
        sortOrder: sortOrder as 'ASC' | 'DESC',
      };

      if (status) {
        if (typeof status === 'string' && status.includes(',')) {
          options.status = status.split(',') as YaksaReportStatus[];
        } else {
          options.status = status as YaksaReportStatus;
        }
      }

      if (reportType) {
        options.reportType = reportType as YaksaReportType;
      }

      if (memberId) {
        options.memberId = memberId as string;
      }

      const result = await yaksaReportService.getReportsByStatus(options);

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/v1/yaksa/reports/:id
   * 신고서 상세 조회
   */
  async getReport(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { id } = req.params;

      const report = await yaksaReportService.getReportDetail(id);

      if (!report) {
        res.status(404).json({
          success: false,
          error: 'Report not found',
        });
        return;
      }

      res.json({
        success: true,
        data: report,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/v1/yaksa/reports/from-post/:postId
   * forum 게시글로부터 신고서 초안 생성
   */
  async createFromPost(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { postId } = req.params;
      const {
        memberId,
        reportType,
        payload,
        confidence,
        triggerSnapshot,
        memberSnapshot,
      } = req.body;

      if (!memberId || !reportType || !payload) {
        res.status(400).json({
          success: false,
          error: 'memberId, reportType, and payload are required',
        });
        return;
      }

      const report = await yaksaReportService.createDraftFromForumPost({
        postId,
        memberId,
        reportType,
        payload,
        confidence: confidence || 0,
        triggerSnapshot,
        memberSnapshot,
      });

      res.status(201).json({
        success: true,
        data: report,
      });
    } catch (error: any) {
      if (error.message?.includes('already exists')) {
        res.status(409).json({
          success: false,
          error: error.message,
        });
        return;
      }
      next(error);
    }
  }

  /**
   * PUT /api/v1/yaksa/reports/:id
   * 신고서 수정
   */
  async updateReport(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { id } = req.params;
      const { payload, operatorNotes } = req.body;
      const user = (req as any).user;

      const input: UpdateReportInput = {};
      if (payload !== undefined) input.payload = payload;
      if (operatorNotes !== undefined) input.operatorNotes = operatorNotes;

      const actor = {
        id: user?.id || 'system',
        name: user?.name || user?.username || 'System',
        role: user?.role,
      };

      const report = await yaksaReportService.updateDraft(
        id,
        input,
        actor,
        req.ip
      );

      res.json({
        success: true,
        data: report,
      });
    } catch (error: any) {
      if (error.message?.includes('not found')) {
        res.status(404).json({
          success: false,
          error: error.message,
        });
        return;
      }
      if (error.message?.includes('cannot be edited')) {
        res.status(400).json({
          success: false,
          error: error.message,
        });
        return;
      }
      next(error);
    }
  }

  /**
   * POST /api/v1/yaksa/reports/:id/approve
   * 신고서 승인
   */
  async approveReport(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { id } = req.params;
      const user = (req as any).user;

      const actor = {
        id: user?.id || 'system',
        name: user?.name || user?.username || 'System',
        role: user?.role,
      };

      const report = await yaksaReportService.approveReport(id, actor, req.ip);

      res.json({
        success: true,
        data: report,
        message: 'Report approved successfully',
      });
    } catch (error: any) {
      if (error.message?.includes('not found')) {
        res.status(404).json({
          success: false,
          error: error.message,
        });
        return;
      }
      if (error.message?.includes('cannot be approved')) {
        res.status(400).json({
          success: false,
          error: error.message,
        });
        return;
      }
      next(error);
    }
  }

  /**
   * POST /api/v1/yaksa/reports/:id/reject
   * 신고서 반려
   */
  async rejectReport(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { id } = req.params;
      const { reason } = req.body;
      const user = (req as any).user;

      if (!reason) {
        res.status(400).json({
          success: false,
          error: 'Rejection reason is required',
        });
        return;
      }

      const actor = {
        id: user?.id || 'system',
        name: user?.name || user?.username || 'System',
        role: user?.role,
      };

      const report = await yaksaReportService.rejectReport(
        id,
        reason,
        actor,
        req.ip
      );

      res.json({
        success: true,
        data: report,
        message: 'Report rejected successfully',
      });
    } catch (error: any) {
      if (error.message?.includes('not found')) {
        res.status(404).json({
          success: false,
          error: error.message,
        });
        return;
      }
      if (error.message?.includes('cannot be rejected')) {
        res.status(400).json({
          success: false,
          error: error.message,
        });
        return;
      }
      next(error);
    }
  }

  /**
   * GET /api/v1/yaksa/reports/stats
   * 대시보드 통계
   */
  async getStats(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const stats = await yaksaReportService.getDashboardStats();

      res.json({
        success: true,
        data: stats,
      });
    } catch (error) {
      next(error);
    }
  }
}

// 싱글톤 인스턴스
export const yaksaReportController = new YaksaReportController();

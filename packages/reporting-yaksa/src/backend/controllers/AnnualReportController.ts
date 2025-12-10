import type { Request, Response } from 'express';
import type { DataSource } from 'typeorm';
import {
  AnnualReportService,
  type ReportFilterDto,
  type ActorInfo,
} from '../services/AnnualReportService.js';
import { MembershipSyncService } from '../services/MembershipSyncService.js';
import type { ReportStatus } from '../entities/AnnualReport.js';

/**
 * AnnualReportController
 *
 * 신상신고서 관리 API 컨트롤러 (Express Request/Response 스타일)
 */
export class AnnualReportController {
  private reportService: AnnualReportService;
  private syncService: MembershipSyncService;

  constructor(reportService: AnnualReportService, syncService: MembershipSyncService) {
    this.reportService = reportService;
    this.syncService = syncService;
  }

  /**
   * Extract actor info from request
   */
  private getActor(req: Request): ActorInfo {
    const user = (req as any).user || {};
    return {
      id: user.id || 'unknown',
      name: user.name || user.username || 'Unknown User',
      role: user.role,
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
    };
  }

  /**
   * Extract member ID from request
   */
  private getMemberId(req: Request): string {
    const user = (req as any).user || {};
    return user.memberId || user.id || '';
  }

  /**
   * Extract organization ID from request
   */
  private getOrganizationId(req: Request): string {
    const user = (req as any).user || {};
    return user.organizationId || '';
  }

  // ===== 회원용 API =====

  /**
   * GET /api/reporting/my-report
   */
  async getMyReport(req: Request, res: Response): Promise<void> {
    try {
      const memberId = this.getMemberId(req);
      const year = req.query.year
        ? parseInt(req.query.year as string, 10)
        : new Date().getFullYear();

      const report = await this.reportService.findByMemberAndYear(memberId, year);

      res.json({ success: true, data: report });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  }

  /**
   * GET /api/reporting/my-reports
   */
  async getMyReports(req: Request, res: Response): Promise<void> {
    try {
      const memberId = this.getMemberId(req);
      const reports = await this.reportService.findByMember(memberId);

      res.json({ success: true, data: reports });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  }

  /**
   * POST /api/reporting/my-report
   */
  async createMyReport(req: Request, res: Response): Promise<void> {
    try {
      const memberId = this.getMemberId(req);
      const organizationId = this.getOrganizationId(req);
      const actor = this.getActor(req);
      const { year, fields } = req.body;

      const report = await this.reportService.create(
        {
          memberId,
          organizationId,
          year: year || new Date().getFullYear(),
          fields,
        },
        actor
      );

      res.status(201).json({ success: true, data: report });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  }

  /**
   * PUT /api/reporting/my-report
   */
  async updateMyReport(req: Request, res: Response): Promise<void> {
    try {
      const memberId = this.getMemberId(req);
      const actor = this.getActor(req);
      const { year, fields } = req.body;

      const targetYear = year || new Date().getFullYear();
      const existing = await this.reportService.findByMemberAndYear(memberId, targetYear);

      if (!existing) {
        res.status(404).json({ success: false, error: `Report for year ${targetYear} not found` });
        return;
      }

      const report = await this.reportService.update(existing.id, { fields }, actor);

      res.json({ success: true, data: report });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  }

  /**
   * POST /api/reporting/my-report/submit
   */
  async submitMyReport(req: Request, res: Response): Promise<void> {
    try {
      const memberId = this.getMemberId(req);
      const actor = this.getActor(req);
      const { year } = req.body;

      const targetYear = year || new Date().getFullYear();
      const existing = await this.reportService.findByMemberAndYear(memberId, targetYear);

      if (!existing) {
        res.status(404).json({ success: false, error: `Report for year ${targetYear} not found` });
        return;
      }

      const report = await this.reportService.submit(existing.id, actor);

      res.json({ success: true, data: report });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  }

  /**
   * GET /api/reporting/my-report/:id/logs
   */
  async getMyReportLogs(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const memberId = this.getMemberId(req);

      const report = await this.reportService.findById(id);

      if (!report) {
        res.status(404).json({ success: false, error: `Report "${id}" not found` });
        return;
      }

      if (report.memberId !== memberId) {
        res.status(403).json({ success: false, error: 'Access denied' });
        return;
      }

      const logs = await this.reportService.getLogs(id);

      res.json({ success: true, data: logs });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  }

  // ===== 관리자용 API =====

  /**
   * GET /api/reporting/reports
   */
  async list(req: Request, res: Response): Promise<void> {
    try {
      const filter: ReportFilterDto = {};

      if (req.query.organizationId) {
        filter.organizationId = req.query.organizationId as string;
      }
      if (req.query.year) {
        filter.year = parseInt(req.query.year as string, 10);
      }
      if (req.query.status) {
        filter.status = req.query.status as ReportStatus;
      }
      if (req.query.page) {
        filter.page = parseInt(req.query.page as string, 10);
      }
      if (req.query.limit) {
        filter.limit = parseInt(req.query.limit as string, 10);
      }

      const { data, total } = await this.reportService.list(filter);

      res.json({
        success: true,
        data,
        total,
        page: filter.page || 1,
        limit: filter.limit || 20,
      });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  }

  /**
   * GET /api/reporting/reports/stats
   */
  async getStats(req: Request, res: Response): Promise<void> {
    try {
      const filter: { organizationId?: string; year?: number } = {};

      if (req.query.organizationId) {
        filter.organizationId = req.query.organizationId as string;
      }
      if (req.query.year) {
        filter.year = parseInt(req.query.year as string, 10);
      }

      const stats = await this.reportService.getStatsByStatus(filter);

      res.json({ success: true, data: stats });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  }

  /**
   * GET /api/reporting/reports/:id
   */
  async get(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const report = await this.reportService.findById(id);

      if (!report) {
        res.status(404).json({ success: false, error: `Report "${id}" not found` });
        return;
      }

      res.json({ success: true, data: report });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  }

  /**
   * GET /api/reporting/reports/:id/logs
   */
  async getLogs(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const logs = await this.reportService.getLogs(id);

      res.json({ success: true, data: logs });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  }

  /**
   * GET /api/reporting/reports/:id/sync-preview
   */
  async getSyncPreview(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const preview = await this.syncService.previewSync(id);

      res.json({ success: true, data: preview });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  }

  /**
   * PATCH /api/reporting/reports/:id/approve
   */
  async approve(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const actor = this.getActor(req);
      const { comment, autoSync } = req.body;

      const report = await this.reportService.approve(id, actor, comment);

      let syncResult;
      if (autoSync !== false) {
        try {
          syncResult = await this.syncService.syncApprovedReport(id, actor);
        } catch (syncError: any) {
          syncResult = { success: false, error: syncError.message };
        }
      }

      res.json({ success: true, data: report, syncResult });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  }

  /**
   * PATCH /api/reporting/reports/:id/reject
   */
  async reject(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const actor = this.getActor(req);
      const { reason } = req.body;

      if (!reason) {
        res.status(400).json({ success: false, error: 'Rejection reason is required' });
        return;
      }

      const report = await this.reportService.reject(id, actor, reason);

      res.json({ success: true, data: report });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  }

  /**
   * PATCH /api/reporting/reports/:id/request-revision
   */
  async requestRevision(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const actor = this.getActor(req);
      const { reason } = req.body;

      if (!reason) {
        res.status(400).json({ success: false, error: 'Revision reason is required' });
        return;
      }

      const report = await this.reportService.requestRevision(id, actor, reason);

      res.json({ success: true, data: report });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  }

  /**
   * POST /api/reporting/reports/:id/sync
   */
  async manualSync(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const actor = this.getActor(req);

      const result = await this.syncService.syncApprovedReport(id, actor);

      res.json({ success: true, data: result });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  }

  /**
   * POST /api/reporting/sync-all
   */
  async syncAll(req: Request, res: Response): Promise<void> {
    try {
      const actor = this.getActor(req);

      const result = await this.syncService.syncAllPending(actor);

      res.json({ success: true, data: result });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  }
}

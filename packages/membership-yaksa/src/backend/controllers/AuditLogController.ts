import { Request, Response } from 'express';
import { AuditLogService } from '../services/AuditLogService.js';
import { AuditAction } from '../entities/MemberAuditLog.js';

/**
 * AuditLogController
 *
 * Phase 2: 회원 변경 이력(Audit Log) API 컨트롤러
 */
export class AuditLogController {
  constructor(private auditLogService: AuditLogService) {}

  /**
   * GET /members/:memberId/logs
   *
   * 회원별 변경 이력 조회
   *
   * Query Parameters:
   * - page: 페이지 번호 (기본: 1)
   * - limit: 페이지당 항목 수 (기본: 20)
   */
  async getMemberLogs(req: Request, res: Response) {
    try {
      const { memberId } = req.params;
      const page = req.query.page ? parseInt(req.query.page as string, 10) : 1;
      const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 20;

      const result = await this.auditLogService.findByMember(memberId, { page, limit });

      res.json({
        success: true,
        data: result.data,
        total: result.total,
        page,
        limit,
        totalPages: Math.ceil(result.total / limit),
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  }

  /**
   * GET /audit-logs
   *
   * 전체 감사 로그 조회 (필터링)
   *
   * Query Parameters:
   * - memberId: 회원 ID
   * - action: 액션 유형
   * - changedBy: 변경자 ID
   * - dateFrom: 시작일 (ISO 8601)
   * - dateTo: 종료일 (ISO 8601)
   * - page: 페이지 번호 (기본: 1)
   * - limit: 페이지당 항목 수 (기본: 20)
   */
  async list(req: Request, res: Response) {
    try {
      const filter = {
        memberId: req.query.memberId as string | undefined,
        action: req.query.action as AuditAction | undefined,
        changedBy: req.query.changedBy as string | undefined,
        dateFrom: req.query.dateFrom ? new Date(req.query.dateFrom as string) : undefined,
        dateTo: req.query.dateTo ? new Date(req.query.dateTo as string) : undefined,
        page: req.query.page ? parseInt(req.query.page as string, 10) : 1,
        limit: req.query.limit ? parseInt(req.query.limit as string, 10) : 20,
      };

      const result = await this.auditLogService.list(filter);

      res.json({
        success: true,
        data: result.data,
        total: result.total,
        page: filter.page,
        limit: filter.limit,
        totalPages: Math.ceil(result.total / filter.limit),
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  }

  /**
   * GET /audit-logs/:id
   *
   * 감사 로그 상세 조회
   */
  async get(req: Request, res: Response) {
    try {
      const log = await this.auditLogService.findById(req.params.id);

      if (!log) {
        return res.status(404).json({
          success: false,
          error: 'Audit log not found',
        });
      }

      res.json({
        success: true,
        data: log,
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  }

  /**
   * GET /audit-logs/recent
   *
   * 최근 변경 이력 조회
   *
   * Query Parameters:
   * - limit: 항목 수 (기본: 50)
   * - action: 액션 유형
   */
  async getRecent(req: Request, res: Response) {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 50;
      const action = req.query.action as AuditAction | undefined;

      const logs = await this.auditLogService.getRecentLogs({ limit, action });

      res.json({
        success: true,
        data: logs,
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  }

  /**
   * GET /audit-logs/stats
   *
   * 변경 통계 조회
   *
   * Query Parameters:
   * - dateFrom: 시작일 (ISO 8601, 필수)
   * - dateTo: 종료일 (ISO 8601, 필수)
   * - organizationId: 조직 ID (선택)
   */
  async getStats(req: Request, res: Response) {
    try {
      const dateFrom = req.query.dateFrom
        ? new Date(req.query.dateFrom as string)
        : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const dateTo = req.query.dateTo
        ? new Date(req.query.dateTo as string)
        : new Date();
      const organizationId = req.query.organizationId as string | undefined;

      const stats = await this.auditLogService.getChangeStats(dateFrom, dateTo, organizationId);

      res.json({
        success: true,
        data: stats,
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  }
}

/**
 * OperatorAnnualReportController — 운영자의 신상신고 처리
 * WO-O4O-KPA-BRANCH-ANNUAL-REPORT-MEMBERSHIP-SYNC-V1
 *
 * 분회 경계는 라우터의 `resolveBranch` + `requireBranchScope` 가 통과시킨 뒤에만 도달한다.
 * 컨트롤러는 `req.branch.id` 만 신뢰하고 body 의 organizationId/userId 는 읽지 않는다.
 *
 * 회원 제출 직후 자동 반영은 채택하지 않았다 — 운영자가 명시적으로 실행한다.
 * 근거는 CHECK 문서 참조(검수 이전 자동 원장 변경 방지 · 실행 주체 기록 · W4 검수와의 순서).
 */
import type { Request, Response } from 'express';
import {
  AnnualReportMembershipSyncService,
  AnnualReportSyncError,
} from '../../services/kpa-branch/AnnualReportMembershipSyncService.js';
import logger from '../../utils/logger.js';

export class OperatorAnnualReportController {
  /**
   * POST /branches/:branchSlug/operator/annual-reports/:reportId/sync
   * 제출 완료된 신고서의 sync 대상 필드를 회원 원장에 반영한다.
   */
  static async sync(req: Request, res: Response) {
    const organizationId = req.branch!.id;
    const actorUserId = (req as any).user.id as string;
    const reportId = req.params.reportId;

    try {
      const result = await AnnualReportMembershipSyncService.syncReport({
        reportId,
        organizationId,
        actorUserId,
      });

      logger.info('[KpaBranch] annual report membership sync', {
        reportId: result.reportId,
        organizationId,
        actorUserId,
        applied: result.applied,
        alreadySynced: result.alreadySynced,
        changedKeys: result.record.changes.map((c) => c.key),
      });

      return res.json({
        success: true,
        data: {
          reportId: result.reportId,
          applied: result.applied,
          alreadySynced: result.alreadySynced,
          syncedToMembership: true,
          syncedChanges: result.record,
        },
      });
    } catch (err) {
      if (err instanceof AnnualReportSyncError) {
        return res.status(err.status).json({
          success: false,
          error: err.message,
          code: err.code,
          ...(err.details ? { data: err.details } : {}),
        });
      }
      throw err;
    }
  }
}

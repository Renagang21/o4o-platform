/**
 * OperatorAnnualReportController — 운영자의 신상신고 검수·처리
 * WO-O4O-KPA-BRANCH-ANNUAL-REPORT-MEMBERSHIP-SYNC-V1 (sync)
 * WO-O4O-KPA-BRANCH-ANNUAL-REPORT-REVIEW-V1          (목록·상세·승인·보완요청)
 *
 * 분회 경계는 라우터의 `resolveBranch` + `requireBranchScope` 가 통과시킨 뒤에만 도달한다.
 * 컨트롤러는 `req.branch.id` 만 신뢰하고 body 의 organizationId/userId 는 읽지 않는다.
 *
 * 회원 제출 직후 자동 반영은 채택하지 않았다 — 운영자가 명시적으로 실행한다.
 * 근거는 CHECK 문서 참조(검수 이전 자동 원장 변경 방지 · 실행 주체 기록 · W4 검수와의 순서).
 *
 * 승인과 반영을 한 endpoint 로 합치지 않는다 (W4 WO §6):
 *   submitted → [승인] → approved → [반영] → 원장 write
 * 승인은 검수 판정이고 반영은 원장 쓰기다. 하나로 묶으면 "승인만 하고 반영은 보류" 가 불가능해진다.
 */
import type { Request, Response } from 'express';
import {
  AnnualReportMembershipSyncService,
  AnnualReportSyncError,
} from '../../services/kpa-branch/AnnualReportMembershipSyncService.js';
import {
  AnnualReportReviewService,
  AnnualReportReviewError,
} from '../../services/kpa-branch/AnnualReportReviewService.js';
import type { AnnualReportStatus } from '../../routes/kpa-branch/entities/annual-report.entity.js';
import logger from '../../utils/logger.js';

/** 목록 필터로 받을 수 있는 상태. 이 목록 밖의 값은 필터를 무시한다(전체 조회로 떨어뜨리지 않는다). */
const FILTERABLE_STATUSES: readonly AnnualReportStatus[] = [
  'draft',
  'submitted',
  'revision_requested',
  'approved',
];

/** 검수 오류를 표준 JSON 으로. 알 수 없는 오류는 그대로 올려 상위 핸들러가 처리한다. */
function handleReviewError(err: unknown, res: Response) {
  if (err instanceof AnnualReportReviewError) {
    return res.status(err.status).json({
      success: false,
      error: err.message,
      code: err.code,
      ...(err.details ? { data: err.details } : {}),
    });
  }
  throw err;
}

export class OperatorAnnualReportController {
  /**
   * GET /branches/:branchSlug/operator/annual-reports?year=&status=
   * 분회 신고서 목록. 필터는 year / status 2개뿐이다 (WO §3).
   */
  static async list(req: Request, res: Response) {
    const organizationId = req.branch!.id;

    const rawYear = req.query.year;
    const year = rawYear !== undefined && rawYear !== '' ? Number(rawYear) : undefined;
    const rawStatus = req.query.status as string | undefined;
    const status = FILTERABLE_STATUSES.includes(rawStatus as AnnualReportStatus)
      ? (rawStatus as AnnualReportStatus)
      : undefined;

    if (year !== undefined && !Number.isInteger(year)) {
      return res.status(422).json({ success: false, error: '연도가 올바르지 않습니다.', code: 'INVALID_YEAR' });
    }

    const items = await AnnualReportReviewService.list({ organizationId, year, status });
    return res.json({
      success: true,
      data: { items, filter: { year: year ?? null, status: status ?? null } },
    });
  }

  /**
   * GET /branches/:branchSlug/operator/annual-reports/:reportId
   * 제출 당시 스냅샷 + 양식 version + 원장 대비 변경항목.
   */
  static async detail(req: Request, res: Response) {
    try {
      const data = await AnnualReportReviewService.detail({
        reportId: req.params.reportId,
        organizationId: req.branch!.id,
      });
      return res.json({ success: true, data });
    } catch (err) {
      return handleReviewError(err, res);
    }
  }

  /**
   * POST /branches/:branchSlug/operator/annual-reports/:reportId/approve
   * 승인만 한다. 원장은 바꾸지 않는다.
   */
  static async approve(req: Request, res: Response) {
    const organizationId = req.branch!.id;
    const actorUserId = (req as any).user.id as string;
    try {
      const result = await AnnualReportReviewService.approve({
        reportId: req.params.reportId,
        organizationId,
        actorUserId,
      });
      logger.info('[KpaBranch] annual report approved', {
        reportId: result.id,
        organizationId,
        actorUserId,
      });
      return res.json({ success: true, data: result });
    } catch (err) {
      return handleReviewError(err, res);
    }
  }

  /**
   * POST /branches/:branchSlug/operator/annual-reports/:reportId/request-revision
   * body: { reason }. 사유는 필수이고 회원 화면에 그대로 보인다.
   */
  static async requestRevision(req: Request, res: Response) {
    const organizationId = req.branch!.id;
    const actorUserId = (req as any).user.id as string;
    try {
      const result = await AnnualReportReviewService.requestRevision({
        reportId: req.params.reportId,
        organizationId,
        actorUserId,
        reason: req.body?.reason,
      });
      logger.info('[KpaBranch] annual report revision requested', {
        reportId: result.id,
        organizationId,
        actorUserId,
        round: result.round,
      });
      return res.json({ success: true, data: result });
    } catch (err) {
      return handleReviewError(err, res);
    }
  }

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

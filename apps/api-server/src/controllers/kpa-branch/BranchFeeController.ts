/**
 * BranchFeeController — 분회 연회비 정책 · 원장 (운영자) / 내 회비 (회원)
 * WO-O4O-KPA-BRANCH-ANNUAL-FEE-LEDGER-V1
 *
 * 분회 경계는 라우터의 `resolveBranch` + `requireBranchScope` 가 통과시킨 뒤에만 도달한다.
 * 컨트롤러는 `req.branch.id` 만 신뢰하고 body 의 organizationId / userId 는 읽지 않는다
 * (분회·회원 스푸핑 차단 — §7 Guard Rule 4 와 같은 사고).
 *
 * 운영자만 쓰고 회원은 본인 것만 읽는다. 두 축을 한 핸들러로 합치지 않는다 —
 * 합치면 "요청자가 누구인가"에 따라 권한이 갈라지는 분기가 컨트롤러에 생긴다.
 */
import type { Request, Response } from 'express';
import { BranchFeeService, BranchFeeError } from '../../services/kpa-branch/BranchFeeService.js';
import type { BranchFeeStatus } from '../../routes/kpa-branch/entities/branch-fee-ledger.entity.js';
import logger from '../../utils/logger.js';

/** 목록 필터로 받을 수 있는 상태. 이 목록 밖의 값은 필터를 무시한다 */
const FILTERABLE_STATUSES: readonly BranchFeeStatus[] = ['unpaid', 'partial', 'paid', 'exempt'];

/** 연도 미지정 시 기본값 — 올해 */
function defaultYear(): number {
  return new Date().getFullYear();
}

function parseYear(raw: unknown): number {
  if (raw === undefined || raw === '' || raw === null) return defaultYear();
  return Number(raw);
}

function handleFeeError(err: unknown, res: Response) {
  if (err instanceof BranchFeeError) {
    return res.status(err.status).json({
      success: false,
      error: err.message,
      code: err.code,
      ...(err.details ? { data: err.details } : {}),
    });
  }
  throw err;
}

export class BranchFeeController {
  // ── 정책 (운영자) ─────────────────────────────────────────────────────────

  /** GET /branches/:branchSlug/operator/fee-policies?year= */
  static async listPolicies(req: Request, res: Response) {
    const year = parseYear(req.query.year);
    try {
      const items = await BranchFeeService.listPolicies({ organizationId: req.branch!.id, year });
      return res.json({ success: true, data: { year, items } });
    } catch (err) {
      return handleFeeError(err, res);
    }
  }

  /**
   * PUT /branches/:branchSlug/operator/fee-policies/:year
   * body: { items: [{ feeCategory, amount, memo }] }
   *
   * 보낸 목록이 그 연도 정책의 전부가 된다. 다른 연도는 건드리지 않는다.
   */
  static async replacePolicies(req: Request, res: Response) {
    const organizationId = req.branch!.id;
    const year = Number(req.params.year);
    try {
      const items = await BranchFeeService.replacePolicies({
        organizationId,
        year,
        items: req.body?.items,
      });
      logger.info('[KpaBranch] fee policies replaced', {
        organizationId,
        year,
        count: items.length,
        actorUserId: (req as any).user?.id,
      });
      return res.json({ success: true, data: { year, items } });
    } catch (err) {
      return handleFeeError(err, res);
    }
  }

  // ── 원장 (운영자) ─────────────────────────────────────────────────────────

  /** GET /branches/:branchSlug/operator/fee-ledgers?year=&status= */
  static async listLedgers(req: Request, res: Response) {
    const year = parseYear(req.query.year);
    const rawStatus = req.query.status as string | undefined;
    const status = FILTERABLE_STATUSES.includes(rawStatus as BranchFeeStatus)
      ? (rawStatus as BranchFeeStatus)
      : undefined;

    try {
      const { items, summary } = await BranchFeeService.listLedgers({
        organizationId: req.branch!.id,
        year,
        status,
      });
      return res.json({
        success: true,
        data: { items, summary, filter: { year, status: status ?? null } },
      });
    } catch (err) {
      return handleFeeError(err, res);
    }
  }

  /**
   * POST /branches/:branchSlug/operator/fee-ledgers/assess
   * body: { year }
   *
   * 멱등이다 — 이미 원장이 있는 회원은 건너뛴다. 재실행이 납부 기록을 지우지 않는다.
   */
  static async assess(req: Request, res: Response) {
    const organizationId = req.branch!.id;
    const actorUserId = (req as any).user.id as string;
    const year = parseYear(req.body?.year);

    try {
      const result = await BranchFeeService.assessYear({ organizationId, year, actorUserId });
      logger.info('[KpaBranch] fee assessed', {
        organizationId,
        year,
        actorUserId,
        created: result.created,
        skipped: result.skipped.length,
        targetCount: result.targetCount,
      });
      return res.json({ success: true, data: { year, ...result } });
    } catch (err) {
      return handleFeeError(err, res);
    }
  }

  /**
   * PATCH /branches/:branchSlug/operator/fee-ledgers/:ledgerId
   * body: { assessedAmount?, paidAmount?, paidAt?, exempt?, memo?, feeCategory? }
   *
   * status 는 받지 않는다 — 금액과 면제 여부에서 서버가 파생한다.
   */
  static async updateLedger(req: Request, res: Response) {
    const organizationId = req.branch!.id;
    const actorUserId = (req as any).user.id as string;

    try {
      const item = await BranchFeeService.updateLedger({
        ledgerId: req.params.ledgerId,
        organizationId,
        actorUserId,
        patch: req.body ?? {},
      });
      logger.info('[KpaBranch] fee ledger updated', {
        ledgerId: item.id,
        organizationId,
        actorUserId,
        status: item.status,
      });
      return res.json({ success: true, data: item });
    } catch (err) {
      return handleFeeError(err, res);
    }
  }

  // ── 내 회비 (회원) ────────────────────────────────────────────────────────

  /**
   * GET /branches/:branchSlug/me/fees
   * 본인의 이 분회 회비 원장 전 연도. 다른 회원 것은 볼 수 없다.
   */
  static async myLedgers(req: Request, res: Response) {
    const userId = (req as any).user.id as string;
    try {
      const items = await BranchFeeService.listMyLedgers({
        organizationId: req.branch!.id,
        userId,
      });
      return res.json({ success: true, data: { items } });
    } catch (err) {
      return handleFeeError(err, res);
    }
  }
}

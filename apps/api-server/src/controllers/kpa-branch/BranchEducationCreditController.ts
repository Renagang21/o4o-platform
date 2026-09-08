/**
 * BranchEducationCreditController — 분회 연수교육 평점 (운영자) / 내 연수교육 (회원)
 * WO-O4O-KPA-BRANCH-CONTINUING-EDUCATION-CREDIT-LEDGER-V1
 *
 * 분회 경계는 라우터의 `resolveBranch` + `requireBranchScope` 가 통과시킨 뒤에만 도달한다.
 * 컨트롤러는 `req.branch.id` 만 신뢰하고 body 의 organizationId / userId 는 읽지 않는다.
 *
 * 회원은 **읽기 경로만** 갖는다. 평점은 분회가 확인해 기록하는 사실이므로
 * 회원이 자기 인정평점을 올리는 경로를 만들지 않는다 (WO §4).
 */
import type { Request, Response } from 'express';
import {
  BranchEducationCreditService,
  BranchEducationCreditError,
} from '../../services/kpa-branch/BranchEducationCreditService.js';
import type { EducationCreditStatus } from '../../routes/kpa-branch/entities/branch-education-credit-ledger.entity.js';
import logger from '../../utils/logger.js';

/** 목록 필터로 받을 수 있는 상태. 이 목록 밖의 값은 필터를 무시한다 (W4·W5 와 같은 판단) */
const FILTERABLE_STATUSES: readonly EducationCreditStatus[] = ['incomplete', 'complete', 'exempt'];

function parseYear(raw: unknown): number {
  if (raw === undefined || raw === '' || raw === null) return new Date().getFullYear();
  return Number(raw);
}

function handleError(err: unknown, res: Response) {
  if (err instanceof BranchEducationCreditError) {
    return res.status(err.status).json({
      success: false,
      error: err.message,
      code: err.code,
      ...(err.details ? { data: err.details } : {}),
    });
  }
  throw err;
}

export class BranchEducationCreditController {
  /** GET /branches/:branchSlug/operator/education-credits?year=&status= */
  static async list(req: Request, res: Response) {
    const year = parseYear(req.query.year);
    const rawStatus = req.query.status as string | undefined;
    const status = FILTERABLE_STATUSES.includes(rawStatus as EducationCreditStatus)
      ? (rawStatus as EducationCreditStatus)
      : undefined;

    try {
      const { items, summary } = await BranchEducationCreditService.list({
        organizationId: req.branch!.id,
        year,
        status,
      });
      return res.json({
        success: true,
        data: { items, summary, filter: { year, status: status ?? null } },
      });
    } catch (err) {
      return handleError(err, res);
    }
  }

  /**
   * POST /branches/:branchSlug/operator/education-credits/open
   * body: { year, requiredCredits }
   *
   * 멱등이다 — 이미 개설된 회원은 건너뛴다.
   */
  static async openYear(req: Request, res: Response) {
    const organizationId = req.branch!.id;
    const actorUserId = (req as any).user.id as string;
    const year = parseYear(req.body?.year);

    try {
      const result = await BranchEducationCreditService.openYear({
        organizationId,
        year,
        requiredCredits: req.body?.requiredCredits,
        actorUserId,
      });
      logger.info('[KpaBranch] education credit year opened', {
        organizationId,
        year,
        actorUserId,
        created: result.created,
        skipped: result.skipped.length,
        targetCount: result.targetCount,
      });
      return res.json({ success: true, data: { year, ...result } });
    } catch (err) {
      return handleError(err, res);
    }
  }

  /**
   * PATCH /branches/:branchSlug/operator/education-credits/:ledgerId
   * body: { requiredCredits?, completedCredits?, exemptionType?, memo? }
   *
   * status 는 받지 않는다 — DB generated column 이 정한다.
   */
  static async update(req: Request, res: Response) {
    const organizationId = req.branch!.id;
    const actorUserId = (req as any).user.id as string;

    try {
      const item = await BranchEducationCreditService.update({
        ledgerId: req.params.ledgerId,
        organizationId,
        actorUserId,
        patch: req.body ?? {},
      });
      logger.info('[KpaBranch] education credit updated', {
        ledgerId: item.id,
        organizationId,
        actorUserId,
        status: item.status,
      });
      return res.json({ success: true, data: item });
    } catch (err) {
      return handleError(err, res);
    }
  }

  /**
   * GET /branches/:branchSlug/me/education-credits
   * 본인의 이 분회 연수교육 원장 전 연도. 다른 회원 것은 볼 수 없다.
   */
  static async mine(req: Request, res: Response) {
    const userId = (req as any).user.id as string;
    try {
      const items = await BranchEducationCreditService.listMine({
        organizationId: req.branch!.id,
        userId,
      });
      return res.json({ success: true, data: { items } });
    } catch (err) {
      return handleError(err, res);
    }
  }
}

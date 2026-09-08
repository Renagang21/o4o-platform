/**
 * BranchMemberController — 분회 회원 소속/이력
 * WO-O4O-PHARMACIST-BRANCH-SERVICE-FOUNDATION-DESIGN-AND-IMPLEMENTATION-V1 §3
 *
 * 운영자 경로는 라우터에서 resolveBranch + requireBranchScope 를 통과한 뒤에만 도달한다.
 * 따라서 컨트롤러는 req.branch.id 만 신뢰하고, 요청 body 의 organizationId 는 받지 않는다
 * (분회 스푸핑 차단 — Boundary Guard Rule 4 와 동일한 사고).
 */
import type { Request, Response } from 'express';
import {
  branchMembershipService,
  BranchMembershipConflictError,
} from '../../services/kpa-branch/BranchMembershipService.js';
import {
  BranchMemberConsoleService,
  BranchMemberConsoleError,
  type AttentionCode,
} from '../../services/kpa-branch/BranchMemberConsoleService.js';

function serialize(m: {
  id: string; user_id: string; organization_id: string; status: string;
  joined_at: Date; left_at: Date | null; transfer_reason: string | null; note: string | null;
}) {
  return {
    id: m.id,
    userId: m.user_id,
    organizationId: m.organization_id,
    status: m.status,
    joinedAt: m.joined_at,
    leftAt: m.left_at,
    transferReason: m.transfer_reason,
    note: m.note,
  };
}

/** 콘솔 오류를 표준 JSON 으로. 알 수 없는 오류는 그대로 올려 상위 핸들러가 처리한다 */
function handleConsoleError(err: unknown, res: Response) {
  if (err instanceof BranchMemberConsoleError) {
    return res.status(err.status).json({ success: false, error: err.message, code: err.code });
  }
  throw err;
}

export class BranchMemberController {
  /** GET /me/branch — 내 현재 분회 */
  static async myCurrent(req: Request, res: Response) {
    const userId = (req as any).user.id;
    const current = await branchMembershipService.getCurrent(userId);
    return res.json({ success: true, data: current ? serialize(current) : null });
  }

  /** GET /me/branch/history — 내 전입·전출 이력 (삭제되지 않는다) */
  static async myHistory(req: Request, res: Response) {
    const userId = (req as any).user.id;
    const items = await branchMembershipService.getHistory(userId);
    return res.json({ success: true, data: items.map(serialize) });
  }

  /**
   * GET /branches/:branchSlug/operator/members?year=&status=&attention=&q=
   * 회원 업무 콘솔 목록 (WO-O4O-KPA-BRANCH-MEMBER-OPERATIONS-CONSOLE-V1)
   *
   * 소속 + 신상신고 + 회비 + 연수교육을 **서버가 합쳐** 회원별 1행으로 낸다.
   * 프런트가 3개 API 를 각각 불러 조인하지 않게 하는 것이 이 엔드포인트의 존재 이유다.
   *
   * 응답은 기존 계약의 **superset** 이다 — 소속 필드(id·userId·organizationId·status·
   * joinedAt·leftAt·transferReason·note)를 그대로 두고 요약을 덧붙였다.
   * (착수 시점 살아있는 소비처 0건이지만 파괴적 변경으로 만들 이유가 없다.)
   */
  static async list(req: Request, res: Response) {
    const status = (req.query.status as 'active' | 'left' | 'all') || 'active';
    const rawYear = req.query.year;
    const year = rawYear === undefined || rawYear === '' ? new Date().getFullYear() : Number(rawYear);
    const attention = (req.query.attention as AttentionCode | undefined) || undefined;

    try {
      const { items, total, year: resolvedYear } = await BranchMemberConsoleService.list({
        organizationId: req.branch!.id,
        year,
        membershipStatus: status,
        attention,
        q: req.query.q as string | undefined,
        limit: req.query.limit === undefined ? undefined : Number(req.query.limit),
        offset: req.query.offset === undefined ? undefined : Number(req.query.offset),
      });
      return res.json({
        success: true,
        data: { items, total, year: resolvedYear, filter: { status, attention: attention ?? null } },
      });
    } catch (err) {
      return handleConsoleError(err, res);
    }
  }

  /**
   * GET /branches/:branchSlug/operator/members/:userId?year=
   * 회원 1명의 4영역(기본·신고·회비·교육)을 한 번에 낸다.
   *
   * 조회 조건은 (organizationId, userId) 복합이다 — 다른 분회 회원 id 를 넣으면
   * 소속 행이 없어 404 다. 존재 여부를 알려주지 않는다.
   */
  static async detail(req: Request, res: Response) {
    const rawYear = req.query.year;
    const year = rawYear === undefined || rawYear === '' ? new Date().getFullYear() : Number(rawYear);
    try {
      const data = await BranchMemberConsoleService.detail({
        organizationId: req.branch!.id,
        userId: req.params.userId,
        year,
      });
      return res.json({ success: true, data });
    } catch (err) {
      return handleConsoleError(err, res);
    }
  }

  /** POST /branches/:branchSlug/operator/members — 전입 (다른 분회 소속이면 자동 전출 후 전입) */
  static async join(req: Request, res: Response) {
    const { userId, reason, note } = req.body ?? {};
    if (!userId) {
      return res.status(400).json({ success: false, error: 'userId는 필수입니다.', code: 'INVALID_INPUT' });
    }
    try {
      const created = await branchMembershipService.join({
        userId, organizationId: req.branch!.id, reason, note,
      });
      return res.status(201).json({ success: true, data: serialize(created) });
    } catch (error) {
      if (error instanceof BranchMembershipConflictError) {
        return res.status(409).json({ success: false, error: error.message, code: error.code });
      }
      throw error;
    }
  }

  /** POST /branches/:branchSlug/operator/members/:userId/leave — 전출 */
  static async leave(req: Request, res: Response) {
    const { userId } = req.params;
    try {
      const left = await branchMembershipService.leave({
        userId, organizationId: req.branch!.id, reason: req.body?.reason,
      });
      return res.json({ success: true, data: serialize(left) });
    } catch (error) {
      if (error instanceof BranchMembershipConflictError) {
        return res.status(409).json({ success: false, error: error.message, code: error.code });
      }
      throw error;
    }
  }
}

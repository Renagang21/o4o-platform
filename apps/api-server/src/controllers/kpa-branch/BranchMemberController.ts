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

  /** GET /branches/:branchSlug/operator/members?status= */
  static async list(req: Request, res: Response) {
    const status = (req.query.status as 'active' | 'left' | 'all') || 'active';
    const limit = Number(req.query.limit ?? 50);
    const offset = Number(req.query.offset ?? 0);
    const { items, total } = await branchMembershipService.listByBranch(req.branch!.id, {
      status, limit, offset,
    });
    return res.json({ success: true, data: { items: items.map(serialize), total } });
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

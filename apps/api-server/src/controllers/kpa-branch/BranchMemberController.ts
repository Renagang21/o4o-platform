/**
 * BranchMemberController — 분회 회원 소속/이력
 * WO-O4O-PHARMACIST-BRANCH-SERVICE-FOUNDATION-DESIGN-AND-IMPLEMENTATION-V1 §3
 *
 * 운영자 경로는 라우터에서 resolveBranch + requireBranchScope 를 통과한 뒤에만 도달한다.
 * 따라서 컨트롤러는 req.branch.id 만 신뢰하고, 요청 body 의 organizationId 는 받지 않는다
 * (분회 스푸핑 차단 — Boundary Guard Rule 4 와 동일한 사고).
 */
import type { Request, Response } from 'express';
import { AppDataSource } from '../../database/connection.js';
import { PharmacistProfilePromotionService } from '../../services/kpa-branch/PharmacistProfilePromotionService.js';
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
  fee_category?: string | null; workplace_name?: string | null; workplace_address?: string | null;
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
    // 분회별 회원 속성 (WO-O4O-KPA-BRANCH-PHARMACIST-PROFILE-CANONICALIZATION-V1)
    feeCategory: m.fee_category ?? null,
    workplaceName: m.workplace_name ?? null,
    workplaceAddress: m.workplace_address ?? null,
  };
}

/** 분회 회비구분 — 선택 입력. 코드계는 branch_fee_policies.fee_category 와 같다 (varchar 50) */
function parseFeeCategory(raw: unknown): string | null | 'invalid' {
  if (raw === undefined || raw === null || raw === '') return null;
  if (typeof raw !== 'string') return 'invalid';
  const v = raw.trim();
  return v.length > 0 && v.length <= 50 ? v : 'invalid';
}

/**
 * 발령일 파싱. 미지정이면 null(=처리 시각). 형식이 틀리면 조용히 오늘로 넘기지 않고 거절한다.
 * 날짜만 온 경우('2026-03-01')를 그대로 Date 로 넘기면 UTC 자정이 되는데, 소속 구간 경계는
 * 일 단위 업무 개념이라 그대로 둔다 (기존 joined_at 도 timestamptz 다).
 */
function parseEffectiveDate(raw: unknown): Date | null | 'invalid' {
  if (raw === undefined || raw === null || raw === '') return null;
  if (typeof raw !== 'string') return 'invalid';
  const d = new Date(raw);
  return Number.isNaN(d.getTime()) ? 'invalid' : d;
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

  /**
   * GET /branches/:branchSlug/operator/members/:userId/history — 소속 이력
   *
   * 대상 분회에 소속 행이 있는 회원만 열람된다. 그렇지 않으면 404 이며,
   * 해당 userId 의 존재 여부는 알려주지 않는다 (다른 분회 회원 탐색 차단).
   */
  static async history(req: Request, res: Response) {
    const rows = await branchMembershipService.getHistoryForBranch(
      req.params.userId,
      req.branch!.id,
    );
    if (rows.length === 0) {
      return res
        .status(404)
        .json({ success: false, error: '이 분회의 회원을 찾을 수 없습니다.', code: 'MEMBER_NOT_FOUND' });
    }
    return res.json({
      success: true,
      data: {
        items: rows.map((r) => ({
          ...serialize(r),
          organizationName: r.organization_name,
          organizationSlug: r.organization_slug,
          isCurrentBranch: r.organization_id === req.branch!.id,
        })),
      },
    });
  }

  /**
   * POST /branches/:branchSlug/operator/members — 신규 소속 / 전입
   *
   * 대상 분회는 언제나 `req.branch.id` 다. body 의 organizationId·
   * sourceOrganizationId·targetOrganizationId 는 읽지 않는다.
   * 회원이 다른 분회에 active 면 서비스가 같은 트랜잭션에서 전출 후 전입한다.
   */
  static async join(req: Request, res: Response) {
    const { userId, email, reason, note } = req.body ?? {};
    if (!userId && !email) {
      return res
        .status(400)
        .json({ success: false, error: 'userId 또는 email 이 필요합니다.', code: 'INVALID_INPUT' });
    }
    const effectiveDate = parseEffectiveDate(req.body?.effectiveDate);
    if (effectiveDate === 'invalid') {
      return res
        .status(422)
        .json({ success: false, error: '발령일이 올바르지 않습니다.', code: 'INVALID_EFFECTIVE_DATE' });
    }
    const feeCategory = parseFeeCategory(req.body?.feeCategory);
    if (feeCategory === 'invalid') {
      return res
        .status(422)
        .json({ success: false, error: '회비구분이 올바르지 않습니다.', code: 'INVALID_FEE_CATEGORY' });
    }

    let targetUserId: string | undefined = userId;
    if (!targetUserId) {
      // 정확일치 1건만 해석한다. 목록·부분검색을 제공하지 않는다 (WO §12 전국 회원 검색 제외).
      const found: Array<{ id: string }> = await AppDataSource.query(
        'SELECT id FROM users WHERE lower(email) = lower($1) LIMIT 1',
        [String(email).trim()],
      );
      if (found.length === 0) {
        return res
          .status(404)
          .json({ success: false, error: '해당 이메일의 사용자를 찾을 수 없습니다.', code: 'USER_NOT_FOUND' });
      }
      targetUserId = found[0].id;
    }

    try {
      const created = await branchMembershipService.join({
        userId: targetUserId, organizationId: req.branch!.id, reason, note, effectiveDate, feeCategory,
      });
      /**
       * 전입 확정 후 약사 profile 을 보장한다 (WO-O4O-KPA-BRANCH-PHARMACIST-PROFILE-CANONICALIZATION-V1).
       * 가입 시 core 가 남긴 `businessInfo.licenseNumber` 를 canonical profile 로 승격하며 기존 값은 보존한다.
       * 실패해도 전입은 되돌리지 않는다.
       */
      const profile = await PharmacistProfilePromotionService.promoteFromUser({ userId: targetUserId });
      return res.status(201).json({
        success: true,
        data: {
          ...serialize(created),
          pharmacistProfile: profile
            ? {
                id: profile.profileId,
                created: profile.created,
                licenseNumber: profile.licenseNumber,
                activityType: profile.activityType,
                licenseConflict: profile.licenseConflict,
              }
            : null,
        },
      });
    } catch (error) {
      if (error instanceof BranchMembershipConflictError) {
        return res.status(409).json({ success: false, error: error.message, code: error.code });
      }
      throw error;
    }
  }

  /** POST /branches/:branchSlug/operator/members/:userId/leave — 전출 (현 분회 active 만) */
  static async leave(req: Request, res: Response) {
    const { userId } = req.params;
    const effectiveDate = parseEffectiveDate(req.body?.effectiveDate);
    if (effectiveDate === 'invalid') {
      return res
        .status(422)
        .json({ success: false, error: '전출일이 올바르지 않습니다.', code: 'INVALID_EFFECTIVE_DATE' });
    }
    try {
      const left = await branchMembershipService.leave({
        userId, organizationId: req.branch!.id, reason: req.body?.reason, effectiveDate,
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

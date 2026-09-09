/**
 * BranchOfficerController — 분회 임원 명부 (공개 / 회원 / 운영자)
 * WO-O4O-KPA-BRANCH-OFFICER-ROSTER-V1
 *
 * 분회 경계는 라우터의 `resolveBranch` (+ 회원·운영자 경로는 `requireBranchScope`)가
 * 통과시킨 뒤에만 도달한다. 컨트롤러는 `req.branch.id` 만 신뢰하고
 * body 의 organizationId 는 읽지 않는다.
 *
 * 직책은 RBAC 이 아니므로 이 컨트롤러는 role 을 부여하거나 검사하지 않는다.
 */
import type { Request, Response } from 'express';
import { BranchOfficerService, BranchOfficerError } from '../../services/kpa-branch/BranchOfficerService.js';
import type { BranchOfficerStatus } from '../../routes/kpa-branch/entities/branch-officer.entity.js';
import logger from '../../utils/logger.js';

/** 목록 필터로 받을 수 있는 상태. 밖의 값은 필터를 무시한다 (W4~W10 과 같은 판단) */
const FILTERABLE: readonly BranchOfficerStatus[] = ['active', 'ended'];

function handleError(err: unknown, res: Response) {
  if (err instanceof BranchOfficerError) {
    return res.status(err.status).json({ success: false, error: err.message, code: err.code });
  }
  throw err;
}

export class BranchOfficerController {
  /** GET /branches/:branchSlug/officers — 공개. visibility='public' + 현직만 */
  static async publicList(req: Request, res: Response) {
    try {
      const items = await BranchOfficerService.listPublic({ organizationId: req.branch!.id });
      return res.json({ success: true, data: { items } });
    } catch (err) {
      return handleError(err, res);
    }
  }

  /** GET /branches/:branchSlug/me/officers — 회원. public + members_only, 현직만 */
  static async memberList(req: Request, res: Response) {
    try {
      const items = await BranchOfficerService.listForMember({ organizationId: req.branch!.id });
      return res.json({ success: true, data: { items } });
    } catch (err) {
      return handleError(err, res);
    }
  }

  /** GET /branches/:branchSlug/operator/officers?status= — 종료된 임기 포함 */
  static async list(req: Request, res: Response) {
    const raw = req.query.status as string | undefined;
    const status = FILTERABLE.includes(raw as BranchOfficerStatus) ? (raw as BranchOfficerStatus) : undefined;
    try {
      const items = await BranchOfficerService.listForOperator({
        organizationId: req.branch!.id,
        status,
      });
      return res.json({ success: true, data: { items, filter: { status: status ?? null } } });
    } catch (err) {
      return handleError(err, res);
    }
  }

  /**
   * POST /branches/:branchSlug/operator/officers
   * body: { name, position, userId?, groupName?, termStart, termEnd?, displayOrder?, visibility?, status? }
   *
   * `userId` 는 선택이다 — 고문·자문 등 외부 인사는 `name` 만으로 등록한다.
   * 연결할 때는 그 회원이 **이 분회 재적 회원**인지 서버가 확인한다.
   */
  static async create(req: Request, res: Response) {
    const organizationId = req.branch!.id;
    try {
      const data = await BranchOfficerService.create({ organizationId, input: req.body ?? {} });
      logger.info('[KpaBranch] officer created', {
        officerId: data.id,
        organizationId,
        actorUserId: (req as any).user?.id,
        linked: data.userId !== null,
      });
      return res.status(201).json({ success: true, data });
    } catch (err) {
      return handleError(err, res);
    }
  }

  /**
   * PATCH /branches/:branchSlug/operator/officers/:officerId
   * 임기 종료(status='ended')·표시순서·공개범위도 이 경로다.
   *
   * 재임은 이 경로가 아니라 **새 등록**이다 — 과거 임기를 덮어쓰면 이력이 사라진다.
   */
  static async update(req: Request, res: Response) {
    const organizationId = req.branch!.id;
    try {
      const data = await BranchOfficerService.update({
        organizationId,
        officerId: req.params.officerId,
        input: req.body ?? {},
      });
      logger.info('[KpaBranch] officer updated', {
        officerId: data.id,
        organizationId,
        actorUserId: (req as any).user?.id,
        status: data.status,
      });
      return res.json({ success: true, data });
    } catch (err) {
      return handleError(err, res);
    }
  }

  /**
   * PUT /branches/:branchSlug/operator/officers/order
   * body: { items: [{ id, displayOrder }] }
   *
   * 한 트랜잭션으로 끝낸다 — 행마다 PATCH 를 보내면 중간 정렬 상태가 화면에 남는다.
   */
  static async reorder(req: Request, res: Response) {
    const organizationId = req.branch!.id;
    try {
      const items = await BranchOfficerService.reorder({ organizationId, items: req.body?.items });
      logger.info('[KpaBranch] officer order changed', {
        organizationId,
        actorUserId: (req as any).user?.id,
        count: Array.isArray(req.body?.items) ? req.body.items.length : 0,
      });
      return res.json({ success: true, data: { items } });
    } catch (err) {
      return handleError(err, res);
    }
  }
}

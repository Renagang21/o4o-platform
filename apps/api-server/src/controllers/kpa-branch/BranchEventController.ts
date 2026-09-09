/**
 * BranchEventController — 분회 행사 (운영자 CRUD / 회원 RSVP / 공개 목록)
 * WO-O4O-KPA-BRANCH-EVENTS-AND-RSVP-V1
 *
 * 분회 경계는 라우터의 `resolveBranch` (+ 운영자·회원 경로는 `requireBranchScope`)가
 * 통과시킨 뒤에만 도달한다. 컨트롤러는 `req.branch.id` 만 신뢰하고
 * body 의 organizationId / userId 는 읽지 않는다.
 *
 * 응답 주체는 언제나 로그인한 본인이다 — 대리 응답 경로를 만들지 않는다.
 */
import type { Request, Response } from 'express';
import { BranchEventService, BranchEventError } from '../../services/kpa-branch/BranchEventService.js';
import type { BranchEventStatus } from '../../routes/kpa-branch/entities/branch-event.entity.js';
import logger from '../../utils/logger.js';

/** 목록 필터로 받을 수 있는 상태. 이 목록 밖의 값은 필터를 무시한다 (W4~W6 와 같은 판단) */
const FILTERABLE: readonly BranchEventStatus[] = ['draft', 'published', 'cancelled'];

function handleError(err: unknown, res: Response) {
  if (err instanceof BranchEventError) {
    return res.status(err.status).json({
      success: false,
      error: err.message,
      code: err.code,
      ...(err.details ? { data: err.details } : {}),
    });
  }
  throw err;
}

export class BranchEventController {
  // ── 공개 ──────────────────────────────────────────────────────────────────

  /** GET /branches/:branchSlug/events — 로그인 없이. public + published 만 */
  static async publicList(req: Request, res: Response) {
    try {
      const items = await BranchEventService.listPublic({ organizationId: req.branch!.id });
      return res.json({ success: true, data: { items } });
    } catch (err) {
      return handleError(err, res);
    }
  }

  /** GET /branches/:branchSlug/events/:eventId — 공개 상세 */
  static async publicDetail(req: Request, res: Response) {
    try {
      const data = await BranchEventService.detail({
        organizationId: req.branch!.id,
        eventId: req.params.eventId,
        audience: 'public',
      });
      return res.json({ success: true, data });
    } catch (err) {
      return handleError(err, res);
    }
  }

  // ── 회원 ──────────────────────────────────────────────────────────────────

  /** GET /branches/:branchSlug/me/events — 게시·취소된 행사 + 내 응답 */
  static async memberList(req: Request, res: Response) {
    try {
      const items = await BranchEventService.listForMember({
        organizationId: req.branch!.id,
        userId: (req as any).user.id,
      });
      return res.json({ success: true, data: { items } });
    } catch (err) {
      return handleError(err, res);
    }
  }

  /**
   * POST /branches/:branchSlug/me/events/:eventId/rsvp
   * body: { status: 'attending' | 'not_attending', memo? }
   *
   * 기존 응답이 있으면 갱신된다 — 중복 신청이 아니라 정정이다.
   */
  static async respond(req: Request, res: Response) {
    const organizationId = req.branch!.id;
    const userId = (req as any).user.id as string;
    try {
      const data = await BranchEventService.respond({
        organizationId,
        eventId: req.params.eventId,
        userId,
        status: req.body?.status,
        memo: req.body?.memo,
      });
      logger.info('[KpaBranch] event rsvp', {
        eventId: data.id,
        organizationId,
        userId,
        status: req.body?.status,
      });
      return res.json({ success: true, data });
    } catch (err) {
      return handleError(err, res);
    }
  }

  // ── 운영자 ────────────────────────────────────────────────────────────────

  /** GET /branches/:branchSlug/operator/events?status= — draft 포함 */
  static async list(req: Request, res: Response) {
    const raw = req.query.status as string | undefined;
    const status = FILTERABLE.includes(raw as BranchEventStatus) ? (raw as BranchEventStatus) : undefined;
    try {
      const items = await BranchEventService.listForOperator({
        organizationId: req.branch!.id,
        status,
      });
      return res.json({ success: true, data: { items, filter: { status: status ?? null } } });
    } catch (err) {
      return handleError(err, res);
    }
  }

  /** GET /branches/:branchSlug/operator/events/:eventId */
  static async detail(req: Request, res: Response) {
    try {
      const data = await BranchEventService.detail({
        organizationId: req.branch!.id,
        eventId: req.params.eventId,
        audience: 'operator',
      });
      return res.json({ success: true, data });
    } catch (err) {
      return handleError(err, res);
    }
  }

  /**
   * POST /branches/:branchSlug/operator/events
   * body: { title, startsAt, endsAt?, location?, description?, externalUrl?,
   *         rsvpEnabled?, rsvpDeadline?, visibility?, status? }
   *
   * 제목과 시작 일시만 있으면 만들 수 있다. 기본은 draft · members_only 다.
   */
  static async create(req: Request, res: Response) {
    const organizationId = req.branch!.id;
    const actorUserId = (req as any).user.id as string;
    try {
      const data = await BranchEventService.create({
        organizationId,
        actorUserId,
        input: req.body ?? {},
      });
      logger.info('[KpaBranch] event created', {
        eventId: data.id,
        organizationId,
        actorUserId,
        status: data.status,
      });
      return res.status(201).json({ success: true, data });
    } catch (err) {
      return handleError(err, res);
    }
  }

  /**
   * PATCH /branches/:branchSlug/operator/events/:eventId
   * 게시(status='published') · 취소(status='cancelled') 도 이 경로로 한다 —
   * 상태 전용 endpoint 를 따로 만들지 않는다 (상태도 행사의 한 속성이다).
   */
  static async update(req: Request, res: Response) {
    const organizationId = req.branch!.id;
    try {
      const data = await BranchEventService.update({
        organizationId,
        eventId: req.params.eventId,
        input: req.body ?? {},
      });
      logger.info('[KpaBranch] event updated', {
        eventId: data.id,
        organizationId,
        actorUserId: (req as any).user?.id,
        status: data.status,
      });
      return res.json({ success: true, data });
    } catch (err) {
      return handleError(err, res);
    }
  }

  /** GET /branches/:branchSlug/operator/events/:eventId/rsvps — 참가 명단 */
  static async rsvps(req: Request, res: Response) {
    try {
      // 존재·소속 확인을 먼저 한다 — 명단만 비어 있는 응답으로 얼버무리지 않는다
      const event = await BranchEventService.detail({
        organizationId: req.branch!.id,
        eventId: req.params.eventId,
        audience: 'operator',
      });
      const items = await BranchEventService.listRsvps({
        organizationId: req.branch!.id,
        eventId: req.params.eventId,
      });
      return res.json({ success: true, data: { event, items, total: items.length } });
    } catch (err) {
      return handleError(err, res);
    }
  }
}

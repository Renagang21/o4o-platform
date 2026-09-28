/**
 * BranchCreationRequestController — 분회 개설 신청·승인
 *
 * WO-O4O-SERVICE-IDENTITY-AND-OPERATOR-SCOPE-V1 §5 (S3)
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * 기존 `BranchAdminController.create` 와 나란히 있는 **다른 경로**다. 그것을 대체하지 않는다.
 *
 *   admin/branches            platform:super_admin 이 직접 만든다 (구조 변경 · 온보딩 수작업)
 *   admin/branch-requests     kpa-branch:admin 이 신청을 심사한다 (승인이 첫 운영자까지 만든다)
 *
 * 승인 주체를 `kpa-branch:admin` 으로 두는 이유: `kpa-branch:operator` 는 **서비스 전역 역할**
 * 이어서 개별 분회 운영자도 갖는다. 그 역할로 승인을 열면 A 분회 운영자가 B 분회 개설을
 * 승인한다. 개별 분회 한정은 `branch_memberships` + `requireBranchScope` 가 만드는 다른 축이고,
 * 개설 신청은 아직 어느 분회에도 속하지 않은 요청이라 그 축으로 판정할 수 없다.
 */
import type { Request, Response } from 'express';
import { AppDataSource } from '../../database/connection.js';
import {
  BranchLifecycleService,
  BranchLifecycleError,
} from '../../services/kpa-branch/branch-lifecycle.service.js';

const NAME_MAX = 200;
const DESCRIPTION_MAX = 500;
const ADDRESS_MAX = 200;
const PHONE_MAX = 50;
const REASON_MAX = 1000;

function service(): BranchLifecycleService {
  return new BranchLifecycleService(AppDataSource);
}

function sendLifecycleError(res: Response, error: unknown): boolean {
  if (!(error instanceof BranchLifecycleError)) return false;
  res.status(error.statusCode).json({ success: false, error: error.message, code: error.code });
  return true;
}

function actorId(req: Request, res: Response): string | null {
  const id = (req as { user?: { id?: string } }).user?.id;
  if (!id) {
    res.status(401).json({ success: false, error: 'Authentication required', code: 'AUTH_REQUIRED' });
    return null;
  }
  return id;
}

/** 길이 제한을 넘는 입력은 DB varchar 에서 터지기 전에 400 으로 돌린다. */
function bounded(
  res: Response,
  value: unknown,
  max: number,
  field: string,
  required: boolean,
): string | null | false {
  const text = typeof value === 'string' ? value.trim() : '';
  if (!text) {
    if (required) {
      res.status(400).json({ success: false, error: `${field}을(를) 입력해야 합니다.`, code: 'FIELD_REQUIRED', field });
      return false;
    }
    return null;
  }
  if (text.length > max) {
    res.status(400).json({
      success: false,
      error: `${field}은(는) ${max}자를 넘을 수 없습니다.`,
      code: 'FIELD_TOO_LONG',
      field,
    });
    return false;
  }
  return text;
}

export const BranchCreationRequestController = {
  /** 개설 신청 — 인증만 요구한다(아직 어느 분회에도 속하지 않은 사람이 신청한다). */
  async create(req: Request, res: Response): Promise<void> {
    const requesterUserId = actorId(req, res);
    if (!requesterUserId) return;
    const body = (req.body ?? {}) as Record<string, unknown>;

    const name = bounded(res, body.name, NAME_MAX, '분회 이름', true);
    if (name === false) return;
    const description = bounded(res, body.description, DESCRIPTION_MAX, '설명', false);
    if (description === false) return;
    const address = bounded(res, body.address, ADDRESS_MAX, '주소지', false);
    if (address === false) return;
    const phone = bounded(res, body.phone, PHONE_MAX, '연락처', false);
    if (phone === false) return;

    try {
      const created = await service().requestCreation({
        requesterUserId,
        desiredSlug: String(body.slug ?? ''),
        name: name as string,
        parentId: typeof body.parentId === 'string' ? body.parentId : null,
        description,
        address,
        phone,
      });
      res.status(201).json({ success: true, data: created });
    } catch (error) {
      if (!sendLifecycleError(res, error)) throw error;
    }
  },

  /** 내 신청 이력 — slug_conflict 로 돌아온 신청의 재신청 안내가 도달하는 유일한 경로. */
  async mine(req: Request, res: Response): Promise<void> {
    const requesterUserId = actorId(req, res);
    if (!requesterUserId) return;
    res.json({ success: true, data: { requests: await service().listMyRequests(requesterUserId) } });
  },

  async listPending(_req: Request, res: Response): Promise<void> {
    res.json({ success: true, data: { requests: await service().listPendingRequests() } });
  },

  async approve(req: Request, res: Response): Promise<void> {
    const reviewerUserId = actorId(req, res);
    if (!reviewerUserId) return;
    try {
      // 선점 충돌은 실패가 아니라 결과다 — 신청자에게 재신청을 요청한 상태로 돌아온다.
      const result = await service().approveCreation({
        requestId: String(req.params.requestId),
        reviewerUserId,
      });
      res.json({ success: true, data: result });
    } catch (error) {
      if (!sendLifecycleError(res, error)) throw error;
    }
  },

  async reject(req: Request, res: Response): Promise<void> {
    const reviewerUserId = actorId(req, res);
    if (!reviewerUserId) return;
    const reason = bounded(res, (req.body ?? {}).reason, REASON_MAX, '거절 사유', true);
    if (reason === false) return;
    try {
      res.json({
        success: true,
        data: await service().rejectCreation({
          requestId: String(req.params.requestId),
          reviewerUserId,
          reason: reason as string,
        }),
      });
    } catch (error) {
      if (!sendLifecycleError(res, error)) throw error;
    }
  },
};

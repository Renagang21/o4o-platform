/**
 * Store Membership Routes — 매장 구성원 초대 · 수락 · 해제
 *
 * WO-O4O-STORE-BUSINESS-ENROLLMENT-AND-MEMBER-ACCESS-V1
 * 정책 정본: `docs/baseline/O4O-STORE-ACCESS-AND-MEMBERSHIP-V1.md`
 *
 * API Namespace: `/api/v1/store` (공통 Store Workspace mount — serviceKey 없는 서비스 중립 표면)
 *
 *   GET    /membership                      내 접근 자격 (owner · member · none)
 *   GET    /members                         구성원 목록                      — Owner
 *   POST   /members/invite                  초대 (기존 가입자만 · 메일 0)     — Owner
 *   DELETE /members/:userId                 해제                            — Owner
 *   GET    /invitations                     내가 받은 초대
 *   POST   /invitations/:organizationId/accept   초대 수락 — 받은 본인만
 *
 * 경계 (프런트 가드에 기대지 않는다 — 여기서 막는다):
 *   - 사용자 id 는 **세션에서만** 온다. body/query 의 userId 는 읽지 않는다
 *   - 쓰기 경로의 조직은 요청이 고르지 않는다. `isStoreOwner()` 가 해석한 조직만 쓴다 →
 *     다른 매장 id 를 넣어도 자기 매장 밖으로 나가지 않는다
 *   - 업종 경계는 `serviceKey` 가 주어졌을 때 조직↔서비스 linkage 로 확인한다
 *   - 수락은 **초대받은 본인**만 — 세션 사용자 = 대상 행의 user_id
 */
import { Router, type Request, type Response, type RequestHandler } from 'express';
import type { DataSource } from 'typeorm';
import type { AuthRequest } from '../../types/auth.js';
import { asyncHandler } from '../../middleware/error-handler.js';
import { readPreferredStoreOrganizationId } from '../../utils/store-organization.resolver.js';
import type { StoreOwnerServiceKey } from '../../utils/store-owner.utils.js';
import {
  StoreMemberError,
  acceptStoreInvitation,
  inviteStoreMember,
  listMyInvitations,
  listStoreMembers,
  removeStoreMember,
  resolveStoreAccessLevel,
} from '../../services/store/store-membership.service.js';

/** 쿼리의 serviceKey 는 **허용 목록 안에서만** 받는다 — 모르는 값은 무시(서비스 중립 경로). */
const SERVICE_KEYS: readonly StoreOwnerServiceKey[] = ['kpa', 'cosmetics', 'pharmacy-hub', 'cafe24-b2b'];
function readServiceKey(req: Request): StoreOwnerServiceKey | undefined {
  const raw = typeof req.query.serviceKey === 'string' ? req.query.serviceKey : undefined;
  return raw && (SERVICE_KEYS as readonly string[]).includes(raw) ? (raw as StoreOwnerServiceKey) : undefined;
}

const sessionUserId = (req: Request): string => ((req as AuthRequest).user?.id as string) ?? '';

function sendError(res: Response, error: unknown): void {
  if (error instanceof StoreMemberError) {
    res.status(error.status).json({ success: false, error: error.message, code: error.code });
    return;
  }
  throw error;
}

export function createStoreMembershipRoutes(dataSource: DataSource, requireAuth: RequestHandler): Router {
  const router = Router();

  // 내 자격 — 화면이 Owner/Member 를 추측하지 않도록 서버가 확정해 돌려준다.
  router.get(
    '/membership',
    requireAuth,
    asyncHandler(async (req: Request, res: Response) => {
      const access = await resolveStoreAccessLevel(
        dataSource,
        sessionUserId(req),
        readServiceKey(req),
        readPreferredStoreOrganizationId(req),
      );
      res.json({ success: true, data: access });
    }),
  );

  router.get(
    '/members',
    requireAuth,
    asyncHandler(async (req: Request, res: Response) => {
      try {
        const data = await listStoreMembers(
          dataSource,
          sessionUserId(req),
          readServiceKey(req),
          readPreferredStoreOrganizationId(req),
        );
        res.json({ success: true, data });
      } catch (e) {
        sendError(res, e);
      }
    }),
  );

  router.post(
    '/members/invite',
    requireAuth,
    asyncHandler(async (req: Request, res: Response) => {
      const email = typeof req.body?.email === 'string' ? req.body.email : '';
      if (!email.trim()) {
        res.status(400).json({ success: false, error: '초대할 주소를 입력해 주세요.', code: 'EMAIL_REQUIRED' });
        return;
      }
      try {
        const data = await inviteStoreMember(dataSource, {
          ownerUserId: sessionUserId(req),
          email,
          serviceKey: readServiceKey(req),
          preferredOrganizationId: readPreferredStoreOrganizationId(req),
        });
        res.json({ success: true, data });
      } catch (e) {
        sendError(res, e);
      }
    }),
  );

  router.delete(
    '/members/:userId',
    requireAuth,
    asyncHandler(async (req: Request, res: Response) => {
      try {
        const data = await removeStoreMember(dataSource, {
          ownerUserId: sessionUserId(req),
          targetUserId: req.params.userId,
          serviceKey: readServiceKey(req),
          preferredOrganizationId: readPreferredStoreOrganizationId(req),
        });
        res.json({ success: true, data });
      } catch (e) {
        sendError(res, e);
      }
    }),
  );

  router.get(
    '/invitations',
    requireAuth,
    asyncHandler(async (req: Request, res: Response) => {
      const data = await listMyInvitations(dataSource, sessionUserId(req));
      res.json({ success: true, data });
    }),
  );

  router.post(
    '/invitations/:organizationId/accept',
    requireAuth,
    asyncHandler(async (req: Request, res: Response) => {
      try {
        const data = await acceptStoreInvitation(dataSource, {
          userId: sessionUserId(req),
          organizationId: req.params.organizationId,
        });
        res.json({ success: true, data });
      } catch (e) {
        sendError(res, e);
      }
    }),
  );

  return router;
}

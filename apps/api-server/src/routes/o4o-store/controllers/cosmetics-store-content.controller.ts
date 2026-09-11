/**
 * K-Cosmetics Store Content Controller — 매장 콘텐츠 (thin wrapper)
 *
 * WO-O4O-KCOS-STORE-CONTENTS-WRAPPER-AND-DEAD-ASSET-MOUNT-CLOSURE-V1
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * 고친 결함
 *
 *   `cosmetics.routes.ts` 가 `/store-contents` 에 공통 `createStoreContentController` 를
 *   그대로 마운트하고 있었다. 그 컨트롤러는 조직을
 *     isStoreOwner(dataSource, userId, 'kpa') + KpaMember(kpa_members) fallback
 *   으로 구한다 — KPA 하드와이어다. 그래서
 *     - KCos 전용 매장은 조직 해석 실패(403 NO_ORG)
 *     - KPA·KCos 양쪽 회원은 **KPA 조직**의 `kpa_store_contents` 가 KCos 화면에 노출
 *   되는 tenant scope 결함이 있었다 (`/assets` 의 결함과 같은 계열 —
 *   WO-O4O-KCOS-LIBRARY-ORGANIZATION-SCOPE-AND-SNAPSHOT-ROUTE-CLOSURE-V1 참조).
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * 계약 (Pharmacy-Hub `PharmacyHubStoreContentController` 와 같은 패턴)
 *
 *   KCos request → cosmetics:store_owner → isStoreOwner(…, 'cosmetics') → **KCos organizationId**
 *   → 공통 services/store/store-content.service.ts 호출 (로직 복제 0)
 *
 *   - 이 컨트롤러가 하는 일은 **조직 결정 + 응답 envelope** 뿐이다.
 *   - **KPA organization fallback 금지.** kpa_members 를 보지 않는다.
 *   - 공통 service 에 serviceKey 분기를 넣지 않는다.
 *   - 원장은 `kpa_store_contents`(legacy physical table name · 논리 개념은 service-neutral
 *     Store Production Material, CLAUDE.md §5). 새 테이블 없음. 격리 축 = organization_id.
 *
 * 노출 범위 (KPA 와 같은 경로 형태 · KCos 실소비 = GET / 목록)
 *   GET    /store-contents              목록 (snapshot_edit + direct)
 *   POST   /store-contents              direct 콘텐츠 등록
 *   GET    /store-contents/direct/:id   direct 콘텐츠 단건
 *   PUT    /store-contents/direct/:id   direct 콘텐츠 수정
 *   DELETE /store-contents/direct/:id   direct 콘텐츠 삭제
 *
 *   KPA 전용 흐름(snapshot_edit 편집 `/:snapshotId` · `/by-product` · `/b2c-descriptions` ·
 *   `/import-b2c-description` · `/:id/reimport-source` · 번역)은 KPA 확장 계층
 *   (snapshots · kpa_contents HUB copy · 번역)에 묶여 있어 여기서 제공하지 않는다.
 *   KCos frontend · 60일 production 로그 모두 해당 경로 consumer 0 (CHECK 문서 census).
 *
 * KPA 컨트롤러(`store-content.controller.ts`)는 **한 글자도 바꾸지 않는다.**
 */

import { Router, Request, Response } from 'express';
import { DataSource } from 'typeorm';
import type { AuthRequest } from '../../../types/auth.js';
import { isStoreOwner } from '../../../utils/store-owner.utils.js';
import {
  listStoreContents,
  createDirectContent,
  getDirectContent,
  updateDirectContent,
  deleteDirectContent,
  type ContentFailure,
  type ContentResult,
} from '../../../services/store/store-content.service.js';

type AuthMiddleware = import('express').RequestHandler;

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** 실패 결과를 KPA 컨트롤러와 동일한 nested envelope 으로 내려보낸다. (strictNullChecks off) */
function sendContentFailure(res: Response, result: ContentResult<unknown>): void {
  const failure = result as ContentFailure;
  res.status(failure.status).json({
    success: false,
    error: { code: failure.code, message: failure.message },
  });
}

function sendError(res: Response, status: number, code: string, message: string): void {
  res.status(status).json({ success: false, error: { code, message } });
}

/**
 * KCos 조직 해석 — 오직 `cosmetics:store_owner` 의 조직만.
 * `serviceKey='cosmetics'` 를 명시해 다른 서비스 role 로의 침투를 차단한다.
 * (isOwner 판정 · 조직 id 둘 다 여기서 나온다. KPA fallback 없음.)
 */
async function resolveCosmeticsStoreOwner(
  dataSource: DataSource,
  userId: string,
): Promise<{ isOwner: boolean; organizationId: string | null }> {
  const { isOwner, organizationId } = await isStoreOwner(dataSource, userId, 'cosmetics');
  return { isOwner, organizationId: organizationId ?? null };
}

export function createCosmeticsStoreContentController(
  dataSource: DataSource,
  requireAuth: AuthMiddleware,
): Router {
  const router = Router();

  /** 인증 + KCos store_owner + 조직 — 통과 못 하면 응답을 이미 보냈다(null). */
  async function requireCosmeticsOrg(
    req: Request,
    res: Response,
    write: boolean,
  ): Promise<{ userId: string; organizationId: string } | null> {
    const userId = (req as AuthRequest).user?.id;
    if (!userId) {
      sendError(res, 401, 'UNAUTHORIZED', 'Authentication required');
      return null;
    }
    const { isOwner, organizationId } = await resolveCosmeticsStoreOwner(dataSource, userId);
    if (write && !isOwner) {
      sendError(res, 403, 'STORE_OWNER_REQUIRED', '매장 경영자(cosmetics:store_owner)만 내 매장 콘텐츠를 저장할 수 있습니다.');
      return null;
    }
    if (!organizationId) {
      sendError(res, 403, 'NO_ORG', 'User has no K-Cosmetics store organization');
      return null;
    }
    return { userId, organizationId };
  }

  function rejectsMalformedId(req: Request, res: Response): boolean {
    if (UUID_RE.test(String(req.params.id ?? ''))) return false;
    sendError(res, 400, 'INVALID_ID', 'Invalid content ID');
    return true;
  }

  /** GET /store-contents — 내 매장 전체 콘텐츠 목록 */
  router.get('/', requireAuth, async (req: Request, res: Response): Promise<void> => {
    try {
      const ctx = await requireCosmeticsOrg(req, res, false);
      if (!ctx) return;
      const contents = await listStoreContents(dataSource, ctx.organizationId);
      res.json({ success: true, data: contents });
    } catch (error: any) {
      sendError(res, 500, 'INTERNAL_ERROR', error.message);
    }
  });

  /** POST /store-contents — direct 콘텐츠 신규 생성 */
  router.post('/', requireAuth, async (req: Request, res: Response): Promise<void> => {
    try {
      const ctx = await requireCosmeticsOrg(req, res, true);
      if (!ctx) return;
      const result = await createDirectContent(dataSource, ctx.organizationId, ctx.userId, req.body);
      if (!result.ok) {
        sendContentFailure(res, result);
        return;
      }
      res.status(201).json({ success: true, data: result.data });
    } catch (error: any) {
      sendError(res, 500, 'INTERNAL_ERROR', error.message);
    }
  });

  /** GET /store-contents/direct/:id — direct 콘텐츠 단건 */
  router.get('/direct/:id', requireAuth, async (req: Request, res: Response): Promise<void> => {
    try {
      if (rejectsMalformedId(req, res)) return;
      const ctx = await requireCosmeticsOrg(req, res, false);
      if (!ctx) return;
      const result = await getDirectContent(dataSource, ctx.organizationId, req.params.id);
      if (!result.ok) {
        sendContentFailure(res, result);
        return;
      }
      res.json({ success: true, data: result.data });
    } catch (error: any) {
      sendError(res, 500, 'INTERNAL_ERROR', error.message);
    }
  });

  /** PUT /store-contents/direct/:id — direct 콘텐츠 수정 */
  router.put('/direct/:id', requireAuth, async (req: Request, res: Response): Promise<void> => {
    try {
      if (rejectsMalformedId(req, res)) return;
      const ctx = await requireCosmeticsOrg(req, res, true);
      if (!ctx) return;
      const result = await updateDirectContent(dataSource, ctx.organizationId, ctx.userId, req.params.id, req.body);
      if (!result.ok) {
        sendContentFailure(res, result);
        return;
      }
      res.json({ success: true, data: result.data });
    } catch (error: any) {
      sendError(res, 500, 'INTERNAL_ERROR', error.message);
    }
  });

  /** DELETE /store-contents/direct/:id — direct 콘텐츠 삭제 */
  router.delete('/direct/:id', requireAuth, async (req: Request, res: Response): Promise<void> => {
    try {
      if (rejectsMalformedId(req, res)) return;
      const ctx = await requireCosmeticsOrg(req, res, true);
      if (!ctx) return;
      const result = await deleteDirectContent(dataSource, ctx.organizationId, req.params.id);
      if (!result.ok) {
        sendContentFailure(res, result);
        return;
      }
      res.json({ success: true, data: result.data });
    } catch (error: any) {
      sendError(res, 500, 'INTERNAL_ERROR', error.message);
    }
  });

  return router;
}

/**
 * Store Content Controller — 매장 전용 콘텐츠 편집
 *
 * WO-KPA-A-CONTENT-OVERRIDE-EXTENSION-V1
 * WO-O4O-STORE-CONTENT-HUB-SHARE-UI-PHASE2-V1 (DEPRECATED — 본 흐름은 V1 으로 제거됨)
 * WO-O4O-AI-STORE-CONTENT-DIRECT-SAVE-V1
 * WO-O4O-KPA-STORE-CONTENT-STORE-OWNER-GUARD-FIX-V1
 * WO-O4O-REMOVE-STORE-TO-COMMUNITY-SHARE-FLOW-V1 — Store → Community 공유 흐름 제거
 *
 * Core(o4o_asset_snapshots) immutable. 매장이 복제된 콘텐츠를
 * kpa_store_contents 테이블에서 독립 편집.
 *
 * Canonical 정책 (WO-O4O-REMOVE-STORE-TO-COMMUNITY-SHARE-FLOW-V1):
 *   - Community → Store = copy only (POST /assets/copy 통해서만)
 *   - Store → Community = publish/share 없음
 *   - 매장에서 만든 콘텐츠는 매장 전용. 커뮤니티에 노출하고 싶으면
 *     처음부터 커뮤니티 영역에서 작성한다.
 *
 * 권한 정책:
 *   POST / (direct 생성) — role_assignments.kpa:store_owner REQUIRED (RBAC SSOT)
 *   기타 — org membership (resolveOrgId, kpa_members 기반)
 *
 * Endpoints:
 *   GET /store-contents                    — 내 매장 콘텐츠 목록
 *   POST /store-contents                   — direct 콘텐츠 신규 생성 (source_type='direct', store owner only)
 *   GET /store-contents/:snapshotId        — 편집용 콘텐츠 조회 (store 우선, fallback snapshot)
 *   PUT /store-contents/:snapshotId        — 편집 저장 (upsert, snapshot_edit 전용)
 *
 *   (제거됨) POST /store-contents/:id/share-to-hub — Store → Community 공유 요청.
 *           정책 변경에 따라 V1 으로 제거. DB 컬럼 share_status / shared_at /
 *           shared_request_id 는 호환성 유지를 위해 잔존 (별도 cleanup WO).
 */

import { Router, Request, Response } from 'express';
import { DataSource } from 'typeorm';
import { KpaMember } from '../../kpa/entities/kpa-member.entity.js';
import { KpaStoreContent } from '../../kpa/entities/kpa-store-content.entity.js';
import type { AuthRequest } from '../../../types/auth.js';
import { isStoreOwner } from '../../../utils/store-owner.utils.js';

type AuthMiddleware = import('express').RequestHandler;

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// WO-O4O-KPA-CONTENT-LIST-TAG-FIELD-AND-DISPLAY-V1:
//   태그 정규화 — 문자열 배열만 허용, trim, 빈 문자열 제거, 중복 제거, 길이/개수 제한.
const TAG_MAX_COUNT = 20;
const TAG_MAX_LEN = 30;
export function normalizeTags(input: unknown): string[] {
  if (!Array.isArray(input)) return [];
  return Array.from(
    new Set(
      input
        .filter((v): v is string => typeof v === 'string')
        .map((v) => v.trim())
        .filter(Boolean)
        .map((v) => v.slice(0, TAG_MAX_LEN)),
    ),
  ).slice(0, TAG_MAX_COUNT);
}

export function createStoreContentController(
  dataSource: DataSource,
  requireAuth: AuthMiddleware,
): Router {
  const router = Router();

  // ───────────────────────────────────────────────────────────────────────────
  // WO-O4O-KPA-STORE-HANDLED-PRODUCTS-CONTENT-LINK-V1
  //   콘텐츠 ↔ 매장 취급제품 연결(kpa_store_content_product_links) 처리 헬퍼.
  //   - productRef 미전송 → 기존 link 유지 (tags 와 동일 정책)
  //   - productRef: null  → 기존 product_description link 제거
  //   - productRef: { sourceType, sourceId } → 검증 후 link 교체(1개 유지)
  //   - sourceType: 'listing'=O4O 기반 제품 / 'local'=매장 경영활용 제품
  //   - org 스코프 검증 + listing 의 master_id 부가 보존.
  // ───────────────────────────────────────────────────────────────────────────
  const LINK_TYPE = 'product_description';

  type ParsedProductRef =
    | { kind: 'absent' }
    | { kind: 'clear' }
    | { kind: 'set'; sourceType: 'listing' | 'local'; sourceId: string }
    | { kind: 'invalid'; message: string };

  function parseProductRef(raw: unknown): ParsedProductRef {
    if (raw === undefined) return { kind: 'absent' };
    if (raw === null) return { kind: 'clear' };
    if (typeof raw !== 'object') return { kind: 'invalid', message: 'productRef는 객체여야 합니다.' };
    const ref = raw as { sourceType?: unknown; sourceId?: unknown };
    if (ref.sourceType !== 'listing' && ref.sourceType !== 'local') {
      return { kind: 'invalid', message: "productRef.sourceType은 'listing' 또는 'local' 이어야 합니다." };
    }
    if (typeof ref.sourceId !== 'string' || !UUID_RE.test(ref.sourceId)) {
      return { kind: 'invalid', message: 'productRef.sourceId는 유효한 UUID 여야 합니다.' };
    }
    return { kind: 'set', sourceType: ref.sourceType, sourceId: ref.sourceId };
  }

  /**
   * 제품이 해당 매장(organization)에 속하는지 검증하고 listing 의 master_id 를 반환.
   * - listing: organization_product_listings 에서 master_id 조회
   * - local:   store_local_products 존재만 확인 (master 없음)
   * 미존재/타 매장이면 ok=false.
   */
  async function resolveProductForLink(
    organizationId: string,
    sourceType: 'listing' | 'local',
    sourceId: string,
  ): Promise<{ ok: true; masterId: string | null } | { ok: false }> {
    if (sourceType === 'listing') {
      const rows = await dataSource.query(
        `SELECT master_id FROM organization_product_listings WHERE id = $1 AND organization_id = $2 LIMIT 1`,
        [sourceId, organizationId],
      );
      if (!rows.length) return { ok: false };
      return { ok: true, masterId: rows[0].master_id ?? null };
    }
    const rows = await dataSource.query(
      `SELECT id FROM store_local_products WHERE id = $1 AND organization_id = $2 LIMIT 1`,
      [sourceId, organizationId],
    );
    if (!rows.length) return { ok: false };
    return { ok: true, masterId: null };
  }

  async function clearProductLink(organizationId: string, contentId: string): Promise<void> {
    await dataSource.query(
      `DELETE FROM kpa_store_content_product_links
       WHERE organization_id = $1 AND content_id = $2 AND link_type = $3`,
      [organizationId, contentId, LINK_TYPE],
    );
  }

  async function replaceProductLink(
    organizationId: string,
    contentId: string,
    sourceType: 'listing' | 'local',
    sourceId: string,
    masterId: string | null,
  ): Promise<void> {
    // V1: 콘텐츠당 product_description link 1개 유지 → 기존 제거 후 삽입.
    await clearProductLink(organizationId, contentId);
    await dataSource.query(
      `INSERT INTO kpa_store_content_product_links
         (organization_id, content_id, product_source_type, product_source_id, master_id, link_type)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (organization_id, content_id, product_source_type, product_source_id, link_type) DO NOTHING`,
      [organizationId, contentId, sourceType, sourceId, masterId, LINK_TYPE],
    );
  }

  type ProductRefPlan =
    | { action: 'noop' }
    | { action: 'clear' }
    | { action: 'set'; sourceType: 'listing' | 'local'; sourceId: string; masterId: string | null };

  /**
   * productRef 형식 검증 + 제품 org 스코프 검증을 콘텐츠 저장 *이전* 에 수행한다
   * (잘못된 productRef 로 콘텐츠가 먼저 저장되는 orphan 방지).
   * ok=false 면 호출측이 400 으로 응답. ok=true 면 plan 을 저장 후 applyProductRefPlan 으로 적용.
   */
  async function prepareProductRef(
    organizationId: string,
    raw: unknown,
  ): Promise<{ ok: true; plan: ProductRefPlan; error?: undefined } | { ok: false; error: string; plan?: undefined }> {
    const parsed = parseProductRef(raw);
    if (parsed.kind === 'absent') return { ok: true, plan: { action: 'noop' } };
    if (parsed.kind === 'invalid') return { ok: false, error: parsed.message };
    if (parsed.kind === 'clear') return { ok: true, plan: { action: 'clear' } };
    const resolved = await resolveProductForLink(organizationId, parsed.sourceType, parsed.sourceId);
    if (!resolved.ok) return { ok: false, error: '연결할 제품을 현재 매장에서 찾을 수 없습니다.' };
    return {
      ok: true,
      plan: { action: 'set', sourceType: parsed.sourceType, sourceId: parsed.sourceId, masterId: resolved.masterId },
    };
  }

  async function applyProductRefPlan(
    organizationId: string,
    contentId: string,
    plan: ProductRefPlan,
  ): Promise<void> {
    if (plan.action === 'noop') return;
    if (plan.action === 'clear') {
      await clearProductLink(organizationId, contentId);
      return;
    }
    await replaceProductLink(organizationId, contentId, plan.sourceType, plan.sourceId, plan.masterId);
  }

  /**
   * GET /store-contents
   *
   * 내 매장 전체 콘텐츠 목록.
   * WO-O4O-REMOVE-STORE-TO-COMMUNITY-SHARE-FLOW-V1: shareStatus / sharedAt /
   *   sharedRequestId 응답 필드 제거 (Store → Community 공유 흐름 폐기).
   */
  router.get(
    '/',
    requireAuth,
    async (req: Request, res: Response): Promise<void> => {
      try {
        const authReq = req as AuthRequest;
        const userId = authReq.user?.id;
        if (!userId) {
          res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Authentication required' } });
          return;
        }

        // organization_members 우선, kpa_members fallback (POST와 동일)
        const organizationId = await resolveDualOrgId(userId);
        if (!organizationId) {
          res.status(403).json({ success: false, error: { code: 'NO_ORG', message: 'No organization membership' } });
          return;
        }

        const repo = dataSource.getRepository(KpaStoreContent);
        const contents = await repo.find({
          where: { organization_id: organizationId },
          order: { updated_at: 'DESC' },
        });

        res.json({
          success: true,
          data: contents.map((c) => ({
            id: c.id,
            sourceType: c.source_type,
            snapshotId: c.snapshot_id,
            title: c.title,
            updatedAt: c.updated_at,
          })),
        });
      } catch (error: any) {
        res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: error.message } });
      }
    },
  );

  /**
   * POST /store-contents
   *
   * WO-O4O-AI-STORE-CONTENT-DIRECT-SAVE-V1
   * WO-O4O-KPA-STORE-CONTENT-STORE-OWNER-GUARD-FIX-V1
   *
   * Direct 콘텐츠 신규 생성 (source_type='direct', snapshot_id=null).
   * AI 생성 결과, 직접 작성, 붙여넣기 등 모든 비-스냅샷 경로에서 사용.
   * 매장 내부 전용 — published-assets 공개 렌더링 대상 아님.
   *
   * 권한: role_assignments.kpa:store_owner REQUIRED (RBAC SSOT)
   *   1차: isStoreOwner('kpa') → role_assignments 확인
   *   2차: organizationId → organization_members 우선, kpa_members fallback
   *
   * Body: { title: string, contentJson: unknown }
   */
  router.post(
    '/',
    requireAuth,
    async (req: Request, res: Response): Promise<void> => {
      try {
        const authReq = req as AuthRequest;
        const userId = authReq.user?.id;
        if (!userId) {
          res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Authentication required' } });
          return;
        }

        // WO-O4O-KPA-STORE-CONTENT-STORE-OWNER-GUARD-FIX-V1:
        // role_assignments에 kpa:store_owner 있는지 확인 (RBAC SSOT)
        const { isOwner, organizationId: orgFromRa } = await isStoreOwner(dataSource, userId, 'kpa');
        if (!isOwner) {
          res.status(403).json({
            success: false,
            error: {
              code: 'STORE_OWNER_REQUIRED',
              message: '매장 경영자(kpa:store_owner)만 내 매장 콘텐츠를 저장할 수 있습니다.',
            },
          });
          return;
        }

        // organizationId: organization_members 우선, kpa_members fallback
        let organizationId: string | null = orgFromRa;
        if (!organizationId) {
          const member = await dataSource.getRepository(KpaMember).findOne({ where: { user_id: userId } });
          organizationId = member?.organization_id || null;
        }

        if (!organizationId) {
          res.status(403).json({
            success: false,
            error: {
              code: 'NO_ORG',
              message: '매장 조직 정보를 찾을 수 없습니다. 매장 등록 후 다시 시도해 주세요.',
            },
          });
          return;
        }

        const { title, contentJson, tags, productRef } = req.body as {
          title?: string;
          contentJson?: unknown;
          tags?: unknown;
          productRef?: unknown;
        };

        if (!title || !title.trim()) {
          res.status(400).json({
            success: false,
            error: { code: 'VALIDATION_ERROR', message: 'title은 필수입니다.' },
          });
          return;
        }

        // WO-O4O-KPA-STORE-HANDLED-PRODUCTS-CONTENT-LINK-V1:
        //   productRef 는 optional. 저장 전 형식/제품 org 스코프 검증.
        const prepared = await prepareProductRef(organizationId, productRef);
        if (!prepared.ok) {
          res.status(400).json({ success: false, error: { code: 'INVALID_PRODUCT_REF', message: prepared.error } });
          return;
        }

        const repo = dataSource.getRepository(KpaStoreContent);
        const content = repo.create({
          snapshot_id: null,
          source_type: 'direct',
          organization_id: organizationId,
          title: title.trim(),
          content_json: (contentJson ?? {}) as Record<string, unknown>,
          tags: normalizeTags(tags),
          updated_by: userId,
        });
        const saved = await repo.save(content);

        await applyProductRefPlan(organizationId, saved.id, prepared.plan);

        res.status(201).json({
          success: true,
          data: {
            id: saved.id,
            sourceType: saved.source_type,
            organizationId: saved.organization_id,
            title: saved.title,
            contentJson: saved.content_json,
            tags: saved.tags ?? [],
            updatedAt: saved.updated_at,
            updatedBy: saved.updated_by,
          },
        });
      } catch (error: any) {
        res.status(500).json({
          success: false,
          error: { code: 'INTERNAL_ERROR', message: error.message },
        });
      }
    },
  );

  /**
   * GET /store-contents/by-product
   * WO-O4O-KPA-STORE-HANDLED-PRODUCTS-CONTENT-LINK-V1
   *
   * 특정 매장 취급제품에 연결된 콘텐츠 목록.
   * Query: sourceType(listing|local), sourceId(uuid)
   * NOTE: /:snapshotId 보다 먼저 등록해야 한다(리터럴 경로 우선).
   */
  router.get(
    '/by-product',
    requireAuth,
    async (req: Request, res: Response): Promise<void> => {
      try {
        const authReq = req as AuthRequest;
        const userId = authReq.user?.id;
        if (!userId) {
          res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Authentication required' } });
          return;
        }

        const sourceType = req.query.sourceType as string;
        const sourceId = req.query.sourceId as string;
        if (sourceType !== 'listing' && sourceType !== 'local') {
          res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: "sourceType은 'listing' 또는 'local' 이어야 합니다." } });
          return;
        }
        if (!sourceId || !UUID_RE.test(sourceId)) {
          res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'sourceId는 유효한 UUID 여야 합니다.' } });
          return;
        }

        const organizationId = await resolveDualOrgId(userId);
        if (!organizationId) {
          res.status(403).json({ success: false, error: { code: 'NO_ORG', message: 'No organization membership' } });
          return;
        }

        // WO-O4O-KPA-STORE-HANDLED-PRODUCTS-CONTENT-ACTIONS-V1:
        //   source_type / snapshot_id 를 함께 반환 → 프론트가 편집 경로(direct vs snapshot)를 판별.
        const rows: Array<{ id: string; title: string; workspace_status: string; link_type: string; source_type: string; snapshot_id: string | null; updated_at: Date }> =
          await dataSource.query(
            `SELECT c.id, c.title, c.workspace_status, l.link_type, c.source_type, c.snapshot_id, c.updated_at
             FROM kpa_store_content_product_links l
             JOIN kpa_store_contents c
               ON c.id = l.content_id AND c.organization_id = l.organization_id
             WHERE l.organization_id = $1 AND l.product_source_type = $2 AND l.product_source_id = $3
             ORDER BY c.updated_at DESC`,
            [organizationId, sourceType, sourceId],
          );

        res.json({
          success: true,
          data: {
            items: rows.map((r) => ({
              contentId: r.id,
              title: r.title,
              status: r.workspace_status,
              linkType: r.link_type,
              // 'direct' = direct 콘텐츠(/store/content/direct/:id) / 'snapshot_edit' = 스냅샷 편집(/store/content/:snapshotId/edit)
              sourceType: r.source_type,
              snapshotId: r.snapshot_id,
              updatedAt: r.updated_at,
            })),
          },
        });
      } catch (error: any) {
        res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: error.message } });
      }
    },
  );

  // ─────────────────────────────────────────────────────────────────────────
  // direct 콘텐츠 전용 CRUD (WO-O4O-STORE-CONTENT-DIRECT-DETAIL-EDIT-UX-V1)
  // NOTE: /direct/:id 라우트는 /:snapshotId 보다 먼저 등록해야 한다.
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * POST에서 사용하는 것과 동일한 이중 org 해석:
   * organization_members (isStoreOwner) 우선, kpa_members fallback.
   * direct 콘텐츠는 이 경로로 저장되므로 조회도 동일 소스를 사용해야 한다.
   */
  async function resolveDualOrgId(userId: string): Promise<string | null> {
    const { organizationId: orgFromRa } = await isStoreOwner(dataSource, userId, 'kpa');
    if (orgFromRa) return orgFromRa;
    const member = await dataSource.getRepository(KpaMember).findOne({ where: { user_id: userId } });
    return member?.organization_id || null;
  }

  /**
   * GET /store-contents/direct/:id
   *
   * source_type='direct' 콘텐츠 상세 조회.
   * organization ownership 확인: organization_members 우선, kpa_members fallback.
   */
  router.get(
    '/direct/:id',
    requireAuth,
    async (req: Request, res: Response): Promise<void> => {
      try {
        const authReq = req as AuthRequest;
        const userId = authReq.user?.id;
        if (!userId) {
          res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Authentication required' } });
          return;
        }
        const { id } = req.params;
        if (!UUID_RE.test(id)) {
          res.status(400).json({ success: false, error: { code: 'INVALID_ID', message: 'Invalid content ID' } });
          return;
        }

        const organizationId = await resolveDualOrgId(userId);
        if (!organizationId) {
          res.status(403).json({ success: false, error: { code: 'NO_ORG', message: 'No organization membership' } });
          return;
        }

        const repo = dataSource.getRepository(KpaStoreContent);
        const content = await repo.findOne({
          where: { id, organization_id: organizationId, source_type: 'direct' },
        });

        if (!content) {
          res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Direct content not found' } });
          return;
        }

        res.json({
          success: true,
          data: {
            id: content.id,
            sourceType: content.source_type,
            title: content.title,
            contentJson: content.content_json,
            tags: content.tags ?? [],
            updatedAt: content.updated_at,
            updatedBy: content.updated_by,
          },
        });
      } catch (error: any) {
        res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: error.message } });
      }
    },
  );

  /**
   * PUT /store-contents/direct/:id
   *
   * direct 콘텐츠 수정. store owner 권한 필수.
   * Body: { title?: string, contentJson?: object }
   */
  router.put(
    '/direct/:id',
    requireAuth,
    async (req: Request, res: Response): Promise<void> => {
      try {
        const authReq = req as AuthRequest;
        const userId = authReq.user?.id;
        if (!userId) {
          res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Authentication required' } });
          return;
        }
        const { id } = req.params;
        if (!UUID_RE.test(id)) {
          res.status(400).json({ success: false, error: { code: 'INVALID_ID', message: 'Invalid content ID' } });
          return;
        }

        // store owner 권한 확인 (RBAC SSOT)
        const { isOwner, organizationId: orgFromRa } = await isStoreOwner(dataSource, userId, 'kpa');
        if (!isOwner) {
          res.status(403).json({ success: false, error: { code: 'STORE_OWNER_REQUIRED', message: '매장 경영자(kpa:store_owner)만 수정할 수 있습니다.' } });
          return;
        }

        let organizationId: string | null = orgFromRa;
        if (!organizationId) {
          const member = await dataSource.getRepository(KpaMember).findOne({ where: { user_id: userId } });
          organizationId = member?.organization_id || null;
        }
        if (!organizationId) {
          res.status(403).json({ success: false, error: { code: 'NO_ORG', message: '매장 조직 정보를 찾을 수 없습니다.' } });
          return;
        }

        const { title, contentJson, tags, productRef } = req.body as { title?: string; contentJson?: Record<string, unknown>; tags?: unknown; productRef?: unknown };

        const repo = dataSource.getRepository(KpaStoreContent);
        const content = await repo.findOne({
          where: { id, organization_id: organizationId, source_type: 'direct' },
        });

        if (!content) {
          res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Direct content not found' } });
          return;
        }

        // WO-O4O-KPA-STORE-HANDLED-PRODUCTS-CONTENT-LINK-V1: productRef optional, 저장 전 검증.
        const prepared = await prepareProductRef(organizationId, productRef);
        if (!prepared.ok) {
          res.status(400).json({ success: false, error: { code: 'INVALID_PRODUCT_REF', message: prepared.error } });
          return;
        }

        if (title !== undefined) content.title = title.trim() || content.title;
        if (contentJson !== undefined) content.content_json = contentJson as Record<string, unknown>;
        // tags 미전송 시 기존 값 보존, 전송 시 sanitize 후 교체.
        if (tags !== undefined) content.tags = normalizeTags(tags);
        content.updated_by = userId;

        const saved = await repo.save(content);

        // productRef 미전송 → 기존 link 유지 / null → 제거 / 객체 → 교체.
        await applyProductRefPlan(organizationId, saved.id, prepared.plan);

        res.json({
          success: true,
          data: {
            id: saved.id,
            sourceType: saved.source_type,
            title: saved.title,
            contentJson: saved.content_json,
            tags: saved.tags ?? [],
            updatedAt: saved.updated_at,
            updatedBy: saved.updated_by,
          },
        });
      } catch (error: any) {
        res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: error.message } });
      }
    },
  );

  /**
   * DELETE /store-contents/direct/:id
   *
   * direct 콘텐츠 삭제. store owner 권한 필수.
   */
  router.delete(
    '/direct/:id',
    requireAuth,
    async (req: Request, res: Response): Promise<void> => {
      try {
        const authReq = req as AuthRequest;
        const userId = authReq.user?.id;
        if (!userId) {
          res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Authentication required' } });
          return;
        }
        const { id } = req.params;
        if (!UUID_RE.test(id)) {
          res.status(400).json({ success: false, error: { code: 'INVALID_ID', message: 'Invalid content ID' } });
          return;
        }

        const { isOwner, organizationId: orgFromRa } = await isStoreOwner(dataSource, userId, 'kpa');
        if (!isOwner) {
          res.status(403).json({ success: false, error: { code: 'STORE_OWNER_REQUIRED', message: '매장 경영자(kpa:store_owner)만 삭제할 수 있습니다.' } });
          return;
        }

        let organizationId: string | null = orgFromRa;
        if (!organizationId) {
          const member = await dataSource.getRepository(KpaMember).findOne({ where: { user_id: userId } });
          organizationId = member?.organization_id || null;
        }
        if (!organizationId) {
          res.status(403).json({ success: false, error: { code: 'NO_ORG', message: '매장 조직 정보를 찾을 수 없습니다.' } });
          return;
        }

        const repo = dataSource.getRepository(KpaStoreContent);
        const content = await repo.findOne({
          where: { id, organization_id: organizationId, source_type: 'direct' },
        });

        if (!content) {
          res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Direct content not found' } });
          return;
        }

        await repo.remove(content);

        res.json({ success: true, data: { deleted: true, id } });
      } catch (error: any) {
        res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: error.message } });
      }
    },
  );

  // (제거됨) POST /store-contents/:id/share-to-hub
  // WO-O4O-REMOVE-STORE-TO-COMMUNITY-SHARE-FLOW-V1
  //
  // Canonical 정책: Community → Store = copy only / Store → Community = publish/share 없음.
  // 매장에서 만든 콘텐츠는 매장 전용으로 유지된다. 커뮤니티 노출이 필요하면
  // 처음부터 커뮤니티 영역에서 작성해야 한다.
  //
  // 기존 DB 컬럼 (share_status, shared_at, shared_request_id) 은 호환성 유지를 위해
  // 잔존하나 신규 생성 경로는 모두 차단되었다. 컬럼 삭제는 별도 cleanup WO.

  /**
   * GET /store-contents/:snapshotId
   *
   * Returns editable content for a snapshot.
   * Priority: kpa_store_contents > o4o_asset_snapshots
   *
   * Response includes `source` field: 'store' | 'snapshot'
   */
  router.get(
    '/:snapshotId',
    requireAuth,
    async (req: Request, res: Response): Promise<void> => {
      try {
        const authReq = req as AuthRequest;
        const userId = authReq.user?.id;
        if (!userId) {
          res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Authentication required' } });
          return;
        }

        // WO-O4O-KPA-STORE-LIBRARY-SNAPSHOT-SINGLE-EDIT-V1:
        //   org 해석을 목록/POST 와 동일하게 resolveDualOrgId(organization_members 우선, kpa_members fallback)로 통일.
        //   기존 resolveOrgId(kpa_members only)는 store_owner(organization_members)만 있는 매장에서 404 유발.
        const organizationId = await resolveDualOrgId(userId);
        if (!organizationId) {
          res.status(403).json({ success: false, error: { code: 'NO_ORG', message: 'No organization membership' } });
          return;
        }

        const { snapshotId } = req.params;

        // Try store content first
        const storeContentRepo = dataSource.getRepository(KpaStoreContent);
        const storeContent = await storeContentRepo.findOne({
          where: { snapshot_id: snapshotId, organization_id: organizationId },
        });

        if (storeContent) {
          res.json({
            success: true,
            data: {
              snapshotId,
              organizationId,
              title: storeContent.title,
              contentJson: storeContent.content_json,
              source: 'store' as const,
              updatedAt: storeContent.updated_at,
              updatedBy: storeContent.updated_by,
            },
          });
          return;
        }

        // Fallback to snapshot (seed)
        const snapResult = await dataSource.query(
          `SELECT id, title, content_json, organization_id
           FROM o4o_asset_snapshots
           WHERE id = $1 AND organization_id = $2
           LIMIT 1`,
          [snapshotId, organizationId],
        );

        if (!snapResult.length) {
          res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Snapshot not found' } });
          return;
        }

        res.json({
          success: true,
          data: {
            snapshotId,
            organizationId,
            title: snapResult[0].title,
            contentJson: snapResult[0].content_json,
            source: 'snapshot' as const,
            updatedAt: null,
            updatedBy: null,
          },
        });
      } catch (error: any) {
        res.status(500).json({
          success: false,
          error: { code: 'INTERNAL_ERROR', message: error.message },
        });
      }
    },
  );

  /**
   * PUT /store-contents/:snapshotId
   *
   * Upsert store content.
   * - Row 없으면 INSERT (snapshot 기반 seed)
   * - Row 있으면 UPDATE
   *
   * Body: { title: string, contentJson: object }
   */
  router.put(
    '/:snapshotId',
    requireAuth,
    async (req: Request, res: Response): Promise<void> => {
      try {
        const authReq = req as AuthRequest;
        const userId = authReq.user?.id;
        if (!userId) {
          res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Authentication required' } });
          return;
        }

        // WO-O4O-KPA-STORE-LIBRARY-SNAPSHOT-SINGLE-EDIT-V1:
        //   org 해석을 목록/POST 와 동일하게 resolveDualOrgId(organization_members 우선, kpa_members fallback)로 통일.
        //   기존 resolveOrgId(kpa_members only)는 store_owner(organization_members)만 있는 매장에서 404 유발.
        const organizationId = await resolveDualOrgId(userId);
        if (!organizationId) {
          res.status(403).json({ success: false, error: { code: 'NO_ORG', message: 'No organization membership' } });
          return;
        }

        const { snapshotId } = req.params;
        const { title, contentJson, productRef } = req.body as {
          title?: string;
          contentJson?: Record<string, unknown>;
          productRef?: unknown;
        };

        if (!title || !contentJson) {
          res.status(400).json({
            success: false,
            error: { code: 'VALIDATION_ERROR', message: 'title and contentJson are required' },
          });
          return;
        }

        // WO-O4O-KPA-STORE-HANDLED-PRODUCTS-CONTENT-LINK-V1: productRef optional, 저장 전 검증.
        const prepared = await prepareProductRef(organizationId, productRef);
        if (!prepared.ok) {
          res.status(400).json({ success: false, error: { code: 'INVALID_PRODUCT_REF', message: prepared.error } });
          return;
        }

        // Verify snapshot exists and belongs to this org
        const snapCheck = await dataSource.query(
          `SELECT id FROM o4o_asset_snapshots WHERE id = $1 AND organization_id = $2 LIMIT 1`,
          [snapshotId, organizationId],
        );
        if (!snapCheck.length) {
          res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Snapshot not found for this organization' } });
          return;
        }

        const repo = dataSource.getRepository(KpaStoreContent);
        let content = await repo.findOne({
          where: { snapshot_id: snapshotId, organization_id: organizationId },
        });

        if (content) {
          content.title = title;
          content.content_json = contentJson;
          content.updated_by = userId;
          content = await repo.save(content);
        } else {
          content = repo.create({
            snapshot_id: snapshotId,
            organization_id: organizationId,
            title,
            content_json: contentJson,
            updated_by: userId,
          });
          content = await repo.save(content);
        }

        await applyProductRefPlan(organizationId, content.id, prepared.plan);

        res.json({
          success: true,
          data: {
            snapshotId,
            organizationId,
            title: content.title,
            contentJson: content.content_json,
            source: 'store' as const,
            updatedAt: content.updated_at,
            updatedBy: content.updated_by,
          },
        });
      } catch (error: any) {
        res.status(500).json({
          success: false,
          error: { code: 'INTERNAL_ERROR', message: error.message },
        });
      }
    },
  );

  return router;
}

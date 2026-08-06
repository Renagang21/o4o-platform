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
import { ContentTranslationService } from '../../../modules/store-ai/services/content-ai-translation.service.js';
import type { TranslationLocale } from '@o4o/ai-prompts/store';
import {
  LINK_TYPE,
  normalizeTags,
  listStoreContents,
  createDirectContent,
  getDirectContent,
  updateDirectContent,
  deleteDirectContent,
  prepareProductRef as prepareProductRefForOrg,
  applyProductRefPlan as applyProductRefPlanForOrg,
  resolveProductForLink as resolveProductForLinkInOrg,
  type ContentFailure,
  type ContentResult,
  type ProductRefPlan,
} from '../../../services/store/store-content.service.js';

type AuthMiddleware = import('express').RequestHandler;

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// WO-O4O-KPA-CONTENT-MULTILINGUAL-TRANSLATION-V1: 매장이 선택 가능한 번역 대상 언어.
const TRANSLATION_LOCALES: TranslationLocale[] = ['en', 'zh', 'ja', 'vi', 'th', 'id'];

// WO-PHARMACY-HUB-STORE-CONTENT-LIBRARY-V1:
//   목록 + direct CRUD + productRef 링크 로직을 services/store/store-content.service.ts 로 추출.
//   이 컨트롤러는 KPA 조직 결정(isStoreOwner('kpa') + KpaMember fallback) + 응답 envelope 만 담당한다.
//   Pharmacy-Hub 는 같은 서비스 함수를 enrollment 기준 조직 해석기와 함께 호출한다 (로직 복제 0).
//   요청/응답 계약은 추출 전과 동일하다.
export { normalizeTags };

/**
 * 실패 결과를 원본과 동일한 nested envelope 으로 내려보낸다.
 * (strictNullChecks 가 꺼져 있어 `!result.ok` 로 union 이 좁혀지지 않는다.)
 */
function sendContentFailure(res: Response, result: ContentResult<unknown>): void {
  const failure = result as ContentFailure;
  res.status(failure.status).json({
    success: false,
    error: { code: failure.code, message: failure.message },
  });
}

export function createStoreContentController(
  dataSource: DataSource,
  requireAuth: AuthMiddleware,
): Router {
  const router = Router();
  const translationService = new ContentTranslationService(dataSource);

  // ───────────────────────────────────────────────────────────────────────────
  // WO-O4O-KPA-STORE-HANDLED-PRODUCTS-CONTENT-LINK-V1
  //   콘텐츠 ↔ 매장 취급제품 연결(kpa_store_content_product_links) 처리 헬퍼.
  //   - productRef 미전송 → 기존 link 유지 (tags 와 동일 정책)
  //   - productRef: null  → 기존 product_description link 제거
  //   - productRef: { sourceType, sourceId } → 검증 후 link 교체(1개 유지)
  //   - sourceType: 'listing'=O4O 기반 제품 / 'local'=매장 경영활용 제품
  //   - org 스코프 검증 + listing 의 master_id 부가 보존.
  // ───────────────────────────────────────────────────────────────────────────
  //   WO-PHARMACY-HUB-STORE-CONTENT-LIBRARY-V1 에서 services/store/store-content.service.ts
  //   로 이관했다. 아래는 dataSource 를 묶어주는 thin wrapper 일 뿐이며 동작은 동일하다.
  const resolveProductForLink = (
    organizationId: string,
    sourceType: 'listing' | 'local',
    sourceId: string,
  ) => resolveProductForLinkInOrg(dataSource, organizationId, sourceType, sourceId);

  const prepareProductRef = (organizationId: string, raw: unknown) =>
    prepareProductRefForOrg(dataSource, organizationId, raw);

  const applyProductRefPlan = (organizationId: string, contentId: string, plan: ProductRefPlan) =>
    applyProductRefPlanForOrg(dataSource, organizationId, contentId, plan);

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

        const contents = await listStoreContents(dataSource, organizationId);
        res.json({ success: true, data: contents });
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

        // WO-O4O-KPA-STORE-HANDLED-PRODUCTS-CONTENT-LINK-V1:
        //   productRef 는 optional. 저장 전 형식/제품 org 스코프 검증(서비스 내부).
        const result = await createDirectContent(dataSource, organizationId, userId, req.body);
        if (!result.ok) {
          sendContentFailure(res, result);
          return;
        }

        res.status(201).json({ success: true, data: result.data });
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

  // ───────────────────────────────────────────────────────────────────────────
  // WO-O4O-KPA-O4O-B2C-DESCRIPTION-COPY-TO-STORE-CONTENT-V1
  //   O4O 기반 제품(listing)의 B2C 상세설명(shared_product_descriptions, canonical)을
  //   매장 자료함 direct 콘텐츠로 가져오기(=복사). 원본과 사본은 독립.
  //   - 이미지: 본문 내 영구 공개 GCS URL 그대로 복사(재호스팅 없음). master 하드삭제 시에만
  //     이미지 깨짐 가능(문서화된 한계, V1 범위 외).
  //   - 제목 필드 없음 → ProductMaster.name 파생.
  //   NOTE: 리터럴 경로이므로 /:snapshotId 보다 먼저 등록.
  // ───────────────────────────────────────────────────────────────────────────

  /**
   * GET /store-contents/b2c-descriptions?listingId=<uuid>
   * 해당 listing(=master)에 가져올 수 있는 B2C 상세설명(canonical) 목록. 미발행/숨김/타제품 제외.
   */
  router.get(
    '/b2c-descriptions',
    requireAuth,
    async (req: Request, res: Response): Promise<void> => {
      try {
        const authReq = req as AuthRequest;
        const userId = authReq.user?.id;
        if (!userId) {
          res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Authentication required' } });
          return;
        }
        const listingId = req.query.listingId as string;
        if (!listingId || !UUID_RE.test(listingId)) {
          res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'listingId는 유효한 UUID 여야 합니다.' } });
          return;
        }
        const organizationId = await resolveDualOrgId(userId);
        if (!organizationId) {
          res.status(403).json({ success: false, error: { code: 'NO_ORG', message: 'No organization membership' } });
          return;
        }
        // org → listing 소유 + master_id 확인 (서버가 관계를 직접 검증)
        const resolved = await resolveProductForLink(organizationId, 'listing', listingId);
        if (!resolved.ok) {
          res.status(404).json({ success: false, error: { code: 'LISTING_NOT_FOUND', message: 'O4O 제품을 현재 매장에서 찾을 수 없습니다.' } });
          return;
        }
        if (!resolved.masterId) {
          res.json({ success: true, data: { items: [] } });
          return;
        }
        // WO-O4O-KPA-STORE-HANDLED-PRODUCT-DESCRIPTION-USAGE-POLICY-FIX-V1:
        //   정책 변경 — 매장으로 복사하지 않고 매장용(STORE) 상세설명서를 매장 화면에서 직접 조회·표시한다.
        //   따라서 목록 조회에 본문(content HTML)을 함께 반환한다(additive, 읽기 전용 뷰어용).
        const rows: Array<{ id: string; content: string | null; summary: string | null; language: string | null; status: string; updated_at: Date; product_name: string | null }> =
          await dataSource.query(
            `SELECT spd.id, spd.content, spd.summary, spd.language, spd.status, spd.updated_at, pm.name AS product_name
             FROM shared_product_descriptions spd
             JOIN product_masters pm ON pm.id = spd.master_id
             WHERE spd.master_id = $1 AND spd.status = 'canonical' AND spd.description_type = 'STORE' AND spd.deleted_at IS NULL
             ORDER BY spd.updated_at DESC`,
            [resolved.masterId],
          );
        res.json({
          success: true,
          data: {
            items: rows.map((r) => ({
              descriptionId: r.id,
              // 제목 필드가 없으므로 제품명을 사용자 표시 제목으로 사용.
              title: r.product_name || '매장용 상세설명서',
              language: r.language || 'ko',
              status: r.status,
              summary: r.summary,
              // 읽기 전용 뷰어 표시용 본문. null 방어는 클라이언트에서 처리.
              contentHtml: r.content || null,
              updatedAt: r.updated_at,
            })),
          },
        });
      } catch (error: any) {
        res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: error.message } });
      }
    },
  );

  /**
   * POST /store-contents/import-b2c-description  { listingId, descriptionId }
   * 가져오기=복사. 서버가 org→listing→master→description 관계를 검증하고 원본을 직접 읽어
   * 독립 direct 콘텐츠 + product_description 링크를 한 transaction 으로 생성. 출처 metadata 보존.
   */
  router.post(
    '/import-b2c-description',
    requireAuth,
    async (req: Request, res: Response): Promise<void> => {
      try {
        const authReq = req as AuthRequest;
        const userId = authReq.user?.id;
        if (!userId) {
          res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Authentication required' } });
          return;
        }
        // 쓰기 = store owner 권한 (POST / 와 동일)
        const { isOwner, organizationId: orgFromRa } = await isStoreOwner(dataSource, userId, 'kpa');
        if (!isOwner) {
          res.status(403).json({ success: false, error: { code: 'STORE_OWNER_REQUIRED', message: '매장 경영자(kpa:store_owner)만 가져올 수 있습니다.' } });
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

        const { listingId, descriptionId } = req.body as { listingId?: string; descriptionId?: string };
        if (!listingId || !UUID_RE.test(listingId) || !descriptionId || !UUID_RE.test(descriptionId)) {
          res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'listingId, descriptionId는 유효한 UUID 여야 합니다.' } });
          return;
        }

        // org → listing 소유 + master_id
        const resolved = await resolveProductForLink(organizationId, 'listing', listingId);
        if (!resolved.ok || !resolved.masterId) {
          res.status(404).json({ success: false, error: { code: 'LISTING_NOT_FOUND', message: 'O4O 제품을 현재 매장에서 찾을 수 없습니다.' } });
          return;
        }
        const masterId = resolved.masterId;

        // 복사: 원본 읽기 + 콘텐츠 + 링크를 한 transaction. 실패 시 흔적 없음.
        const result = await dataSource.transaction(async (manager) => {
          const src: Array<{ content: string | null; summary: string | null; product_name: string | null }> =
            await manager.query(
              `SELECT spd.content, spd.summary, pm.name AS product_name
               FROM shared_product_descriptions spd
               JOIN product_masters pm ON pm.id = spd.master_id
               WHERE spd.id = $1 AND spd.master_id = $2 AND spd.status = 'canonical' AND spd.deleted_at IS NULL
               LIMIT 1`,
              [descriptionId, masterId],
            );
          if (!src.length) {
            const e: any = new Error('가져올 수 있는 B2C 상세설명이 아닙니다(타 제품/미공개/미존재).');
            e.code = 'NOT_IMPORTABLE';
            throw e;
          }
          const s = src[0];
          const title = s.product_name || 'O4O 상세설명';
          const contentJson = {
            html: s.content || '',
            summary: s.summary || null,
            sourceResources: [],
            generatedBy: 'o4o-b2c-import',
          };
          const sourceMetadata = {
            copiedFrom: 'o4o_b2c_product_description',
            sourceRefId: descriptionId,
            masterId,
            copiedAt: new Date().toISOString(),
          };
          const ins: Array<{ id: string; workspace_status: string; updated_at: Date }> = await manager.query(
            `INSERT INTO kpa_store_contents
               (organization_id, source_type, snapshot_id, title, content_json, tags, updated_by,
                source_metadata, author_role, visibility_scope, workspace_status)
             VALUES ($1, 'direct', NULL, $2, $3::jsonb, '[]'::jsonb, $4, $5::jsonb, 'operator', 'organization', 'draft')
             RETURNING id, workspace_status, updated_at`,
            [organizationId, title, JSON.stringify(contentJson), userId, JSON.stringify(sourceMetadata)],
          );
          const contentId = ins[0].id;
          await manager.query(
            `INSERT INTO kpa_store_content_product_links
               (organization_id, content_id, product_source_type, product_source_id, master_id, link_type)
             VALUES ($1, $2, 'listing', $3, $4, $5)
             ON CONFLICT (organization_id, content_id, product_source_type, product_source_id, link_type) DO NOTHING`,
            [organizationId, contentId, listingId, masterId, LINK_TYPE],
          );
          return { contentId, title, status: ins[0].workspace_status, updatedAt: ins[0].updated_at };
        });

        res.status(201).json({
          success: true,
          data: {
            id: result.contentId,
            sourceType: 'direct' as const,
            title: result.title,
            status: result.status,
            masterId,
            updatedAt: result.updatedAt,
          },
        });
      } catch (error: any) {
        if (error?.code === 'NOT_IMPORTABLE') {
          res.status(400).json({ success: false, error: { code: 'NOT_IMPORTABLE', message: error.message } });
          return;
        }
        res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: error.message } });
      }
    },
  );

  /**
   * POST /store-contents/:id/reimport-source
   * WO-O4O-STORE-IMPORTED-DESCRIPTION-REIMPORT-REPLACE-V1
   *
   * "원본 갱신됨" 배지를 본 매장 경영자가 새 canonical 원본을 **명시적으로 다시 가져오기**.
   * V1 정책: 기존 사본(:id) 을 덮어쓰지 않고 **새 사본(D)** 을 생성한다.
   *   - 기존 사본 C 는 본문/QR/태블릿 연결 그대로 유지(불변).
   *   - C 의 source_metadata.sourceRefId(=이전 원본 SPD) 로 (master, STORE, 언어) 의 **현재 canonical** 을 해석.
   *   - 현재 canonical 이 없으면 재가져오기 불가, 이미 최신(sourceRefId===현재)이면 no-op.
   *   - 새 사본 D: sourceRefId=현재 canonical id, source_metadata 도 현재 기준. 같은 listing 링크 복제.
   * 자동 갱신/덮어쓰기 없음. 매장 경영자 명시 액션에서만 호출.
   */
  router.post(
    '/:id/reimport-source',
    requireAuth,
    async (req: Request, res: Response): Promise<void> => {
      try {
        const authReq = req as AuthRequest;
        const userId = authReq.user?.id;
        if (!userId) {
          res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Authentication required' } });
          return;
        }
        // 쓰기 = store owner 권한 (import 와 동일)
        const { isOwner, organizationId: orgFromRa } = await isStoreOwner(dataSource, userId, 'kpa');
        if (!isOwner) {
          res.status(403).json({ success: false, error: { code: 'STORE_OWNER_REQUIRED', message: '매장 경영자(kpa:store_owner)만 가져올 수 있습니다.' } });
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

        const contentId = req.params.id;
        if (!contentId || !UUID_RE.test(contentId)) {
          res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'id는 유효한 UUID 여야 합니다.' } });
          return;
        }

        // 기존 사본 C 조회 — org 소유 + O4O b2c import 로 만든 direct 사본만 대상.
        const srcRows: Array<{ organization_id: string; source_type: string; source_metadata: { copiedFrom?: string; sourceRefId?: string } | null }> =
          await dataSource.query(
            `SELECT organization_id, source_type, source_metadata
               FROM kpa_store_contents WHERE id = $1 LIMIT 1`,
            [contentId],
          );
        const cRow = srcRows[0];
        if (!cRow || cRow.organization_id !== organizationId) {
          res.status(404).json({ success: false, error: { code: 'CONTENT_NOT_FOUND', message: '해당 콘텐츠를 현재 매장에서 찾을 수 없습니다.' } });
          return;
        }
        if (cRow.source_type !== 'direct' || cRow.source_metadata?.copiedFrom !== 'o4o_b2c_product_description' || !cRow.source_metadata?.sourceRefId) {
          res.status(400).json({ success: false, error: { code: 'NOT_REIMPORTABLE', message: 'O4O 설명서에서 가져온 사본만 다시 가져올 수 있습니다.' } });
          return;
        }
        const oldRefId = cRow.source_metadata.sourceRefId;

        // 이전 원본 SPD 로 (master, STORE, 언어) 축 확인 → 현재 canonical 해석.
        const oldSpd: Array<{ master_id: string; description_type: string; language: string | null }> =
          await dataSource.query(
            `SELECT master_id, description_type, language FROM shared_product_descriptions WHERE id = $1 LIMIT 1`,
            [oldRefId],
          );
        if (!oldSpd.length) {
          res.status(400).json({ success: false, error: { code: 'SOURCE_UNRESOLVED', message: '원본 설명서 정보를 확인할 수 없습니다.' } });
          return;
        }
        const { master_id: masterId, description_type: descType, language } = oldSpd[0];

        // 같은 (master, STORE, 언어) 의 현재 canonical (배지 감지와 동일 해석).
        const curRows: Array<{ id: string; content: string | null; summary: string | null; product_name: string | null }> =
          await dataSource.query(
            `SELECT spd.id, spd.content, spd.summary, pm.name AS product_name
               FROM shared_product_descriptions spd
               JOIN product_masters pm ON pm.id = spd.master_id
              WHERE spd.master_id = $1 AND spd.description_type = $2
                AND COALESCE(spd.language, 'ko') = COALESCE($3, 'ko')
                AND spd.status = 'canonical' AND spd.deleted_at IS NULL
              LIMIT 1`,
            [masterId, descType, language],
          );
        if (!curRows.length) {
          res.status(400).json({ success: false, error: { code: 'NO_CURRENT_CANONICAL', message: '현재 가져올 수 있는 새 원본이 없습니다.' } });
          return;
        }
        const current = curRows[0];
        if (current.id === oldRefId) {
          res.status(200).json({ success: true, data: { mode: 'already_latest', message: '이미 최신 원본입니다.', sourceDescriptionId: current.id } });
          return;
        }

        // 기존 사본 C 의 listing 링크(있으면 복제). 없으면 링크 없이 새 사본만.
        const linkRows: Array<{ product_source_id: string; master_id: string | null }> = await dataSource.query(
          `SELECT product_source_id, master_id FROM kpa_store_content_product_links
            WHERE content_id = $1 AND organization_id = $2 AND product_source_type = 'listing' AND link_type = $3
            LIMIT 1`,
          [contentId, organizationId, LINK_TYPE],
        );
        const listingId = linkRows[0]?.product_source_id ?? null;

        // 새 사본 D 생성 — import-b2c-description 과 동일 구조(덮어쓰기 아님). 단일 transaction.
        const result = await dataSource.transaction(async (manager) => {
          const title = current.product_name || 'O4O 상세설명';
          const contentJson = {
            html: current.content || '',
            summary: current.summary || null,
            sourceResources: [],
            generatedBy: 'o4o-b2c-reimport',
          };
          const sourceMetadata = {
            copiedFrom: 'o4o_b2c_product_description',
            sourceRefId: current.id,
            masterId,
            copiedAt: new Date().toISOString(),
            reimportedFrom: contentId, // 어떤 사본의 재가져오기인지 추적(표시/감사용, 자동 동작 없음)
          };
          const ins: Array<{ id: string; workspace_status: string; updated_at: Date }> = await manager.query(
            `INSERT INTO kpa_store_contents
               (organization_id, source_type, snapshot_id, title, content_json, tags, updated_by,
                source_metadata, author_role, visibility_scope, workspace_status)
             VALUES ($1, 'direct', NULL, $2, $3::jsonb, '[]'::jsonb, $4, $5::jsonb, 'operator', 'organization', 'draft')
             RETURNING id, workspace_status, updated_at`,
            [organizationId, title, JSON.stringify(contentJson), userId, JSON.stringify(sourceMetadata)],
          );
          const newContentId = ins[0].id;
          if (listingId) {
            await manager.query(
              `INSERT INTO kpa_store_content_product_links
                 (organization_id, content_id, product_source_type, product_source_id, master_id, link_type)
               VALUES ($1, $2, 'listing', $3, $4, $5)
               ON CONFLICT (organization_id, content_id, product_source_type, product_source_id, link_type) DO NOTHING`,
              [organizationId, newContentId, listingId, masterId, LINK_TYPE],
            );
          }
          return { contentId: newContentId, title, status: ins[0].workspace_status, updatedAt: ins[0].updated_at };
        });

        res.status(201).json({
          success: true,
          data: {
            mode: 'create_copy',
            oldStoreContentId: contentId,
            newStoreContentId: result.contentId,
            sourceDescriptionId: current.id,
            id: result.contentId,
            sourceType: 'direct' as const,
            title: result.title,
            status: result.status,
            masterId,
            updatedAt: result.updatedAt,
            message: '새 원본을 매장 사본으로 가져왔습니다. 기존 사본은 그대로 유지됩니다.',
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

        const result = await getDirectContent(dataSource, organizationId, id);
        if (!result.ok) {
          sendContentFailure(res, result);
          return;
        }

        res.json({ success: true, data: result.data });
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

        // WO-O4O-KPA-STORE-HANDLED-PRODUCTS-CONTENT-LINK-V1: productRef optional, 저장 전 검증(서비스 내부).
        const result = await updateDirectContent(dataSource, organizationId, userId, id, req.body);
        if (!result.ok) {
          sendContentFailure(res, result);
          return;
        }

        res.json({ success: true, data: result.data });
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

        const result = await deleteDirectContent(dataSource, organizationId, id);
        if (!result.ok) {
          sendContentFailure(res, result);
          return;
        }

        res.json({ success: true, data: result.data });
      } catch (error: any) {
        res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: error.message } });
      }
    },
  );

  // ───────────────────────────────────────────────────────────────────────────
  // WO-O4O-KPA-CONTENT-MULTILINGUAL-TRANSLATION-V1: 콘텐츠 다국어 번역 (매장)
  //   - 나라 1개씩 AI 번역 → content_json.translations[locale] 저장(draft)
  //   - 매장 수정 저장(PUT) → status=ready
  // ───────────────────────────────────────────────────────────────────────────

  /**
   * POST /store-contents/direct/:id/translate  body: { locale }
   * direct 콘텐츠(title + content_json.html)를 대상 언어 1개로 AI 번역 →
   * content_json.translations[locale] = { title, html, status:'draft', model, updatedAt } upsert.
   */
  router.post(
    '/direct/:id/translate',
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
        const locale = (req.body as { locale?: string })?.locale as TranslationLocale;
        if (!locale || !TRANSLATION_LOCALES.includes(locale)) {
          res.status(400).json({ success: false, error: { code: 'INVALID_LOCALE', message: `locale must be one of ${TRANSLATION_LOCALES.join(', ')}` } });
          return;
        }

        const { isOwner, organizationId: orgFromRa } = await isStoreOwner(dataSource, userId, 'kpa');
        if (!isOwner) {
          res.status(403).json({ success: false, error: { code: 'STORE_OWNER_REQUIRED', message: '매장 경영자(kpa:store_owner)만 번역할 수 있습니다.' } });
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

        const cj = (content.content_json ?? {}) as Record<string, unknown>;
        const html = typeof cj.html === 'string' ? cj.html : '';
        if (!html && !content.title.trim()) {
          res.status(400).json({ success: false, error: { code: 'EMPTY_CONTENT', message: '번역할 본문이 없습니다.' } });
          return;
        }

        const out = await translationService.translate(content.title, html, locale);
        if (!out) {
          res.status(502).json({ success: false, error: { code: 'TRANSLATION_FAILED', message: 'AI 번역에 실패했습니다. (AI 설정/키 확인)' } });
          return;
        }

        const translations = (cj.translations && typeof cj.translations === 'object')
          ? (cj.translations as Record<string, unknown>) : {};
        const entry = {
          title: out.result.title,
          html: out.result.html,
          status: 'draft',
          model: out.model,
          updatedAt: new Date().toISOString(),
        };
        translations[locale] = entry;
        content.content_json = { ...cj, translations };
        content.updated_by = userId;
        await repo.save(content);

        res.json({ success: true, data: { id, locale, translation: entry } });
      } catch (error: any) {
        res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: error.message } });
      }
    },
  );

  /**
   * PUT /store-contents/direct/:id/translations/:locale  body: { title?, html? }
   * 번역본을 매장이 수정 저장 → status='ready'.
   */
  router.put(
    '/direct/:id/translations/:locale',
    requireAuth,
    async (req: Request, res: Response): Promise<void> => {
      try {
        const authReq = req as AuthRequest;
        const userId = authReq.user?.id;
        if (!userId) {
          res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Authentication required' } });
          return;
        }
        const { id, locale } = req.params as { id: string; locale: string };
        if (!UUID_RE.test(id)) {
          res.status(400).json({ success: false, error: { code: 'INVALID_ID', message: 'Invalid content ID' } });
          return;
        }
        if (!TRANSLATION_LOCALES.includes(locale as TranslationLocale)) {
          res.status(400).json({ success: false, error: { code: 'INVALID_LOCALE', message: `locale must be one of ${TRANSLATION_LOCALES.join(', ')}` } });
          return;
        }

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

        const repo = dataSource.getRepository(KpaStoreContent);
        const content = await repo.findOne({
          where: { id, organization_id: organizationId, source_type: 'direct' },
        });
        if (!content) {
          res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Direct content not found' } });
          return;
        }

        const cj = (content.content_json ?? {}) as Record<string, unknown>;
        const translations = (cj.translations && typeof cj.translations === 'object')
          ? (cj.translations as Record<string, unknown>) : {};
        const prev = (translations[locale] && typeof translations[locale] === 'object')
          ? (translations[locale] as Record<string, unknown>) : {};
        const { title, html } = req.body as { title?: string; html?: string };
        translations[locale] = {
          ...prev,
          title: typeof title === 'string' ? title : prev.title,
          html: typeof html === 'string' ? html : prev.html,
          status: 'ready',
          updatedAt: new Date().toISOString(),
        };
        content.content_json = { ...cj, translations };
        content.updated_by = userId;
        await repo.save(content);

        res.json({ success: true, data: { id, locale, translation: translations[locale] } });
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

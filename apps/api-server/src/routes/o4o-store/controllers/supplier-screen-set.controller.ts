/**
 * Supplier Screen Set Controller — 공급자 Screen Set 원본 제작·HUB 게시 API
 *
 * WO-O4O-SUPPLIER-SCREEN-SET-BACKEND-HUB-COPY-V2B
 *   설계: ADR-O4O-SCREEN-SET-OWNER-SCOPE-MODEL-V1 · CHECK-O4O-SUPPLIER-SCREEN-SET-POLICY-AND-TARGET-SCHEMA-V1
 *   선행 스키마: hub_target_store_type + CHK_stss_hub_target (migration 20270211000000)
 *
 * 공급자가 매장 배포용 Screen Set 원본(origin='supplier')을 제작·관리하고 대상 매장 HUB 에 게시한다.
 * 운영자 컨트롤러(operator-screen-set.controller.ts)와 동일 골격 — 소유권/상태/게시 대상만 다르다.
 *
 * 확정 소유권 계약(CHK_stss_owner_scope supplier 브랜치):
 *   origin='supplier' · organization_id=NULL · supplier_id=<로그인 공급자 neture_suppliers.id> ·
 *   service_key=<주입> · created_by_user_id=<작성자> · status ∈ {draft, active, archived}
 *   (supplier_template 미사용). active 일 때 hub_target_store_type 필수(CHK_stss_hub_target).
 *
 * 권한: 로그인 사용자가 **ACTIVE neture_suppliers** 구성원이어야 한다(user_id 매핑). 자기 원본만 접근.
 *
 * 라우트(mount: /api/v1/{serviceKey}/supplier/screen-sets):
 *   GET    /                                  — 자기 공급자 원본 목록
 *   GET    /:id                               — 단일 조회 + blocks
 *   POST   /                                  — 생성 (draft)
 *   PATCH  /:id                               — 이름·템플릿·게시대상 수정
 *   PUT    /:id/blocks                        — 블록 전체 교체(매장 콘텐츠 참조 거부)
 *   POST   /:id/duplicate                     — 복제(새 draft, 값 복사)
 *   POST   /:id/publish                       — draft → active(HUB 게시, 대상 필수 + 의약품 가드)
 *   POST   /:id/unpublish                     — active → draft(게시 해제)
 *   POST   /:id/archive                       — → archived(보관)
 *   POST   /:id/unarchive                     — archived → draft(보관 해제)
 *   DELETE /:id                               — 목록에서 제거(soft delete)
 *   POST   /preview                           — 저장 전 draft 미리보기(Supplier ContentSourceAdapter)
 *   GET    /content-sources/o4o-descriptions  — O4O 표준 설명서 검색(콘텐츠 picker)
 *
 * 차단: 매장·코너 직접 적용 / current 지정 / 공개 타블렛 URL / Screen Set QR 생성 / 매장 제작 콘텐츠 조회.
 */

import { Router, Request, Response, RequestHandler } from 'express';
import { DataSource } from 'typeorm';
import type { AuthRequest } from '../../../types/auth.js';
import { parseIdleMediaConfig, resolveIdleMediaItems } from '../../platform/store-tablet-idle-block.js';
import { parseContentListConfig } from '../../platform/store-tablet-content-list-block.js';
import { resolveContentListItems } from '../../platform/store-public/store-public-tablet-content-resolve.js';
import { createSupplierContentSourceAdapter } from '../../platform/store-public/store-public-tablet-content-source.js';
import { shapeStaticBlock, resolveTemplateKey } from '../../platform/store-public/store-public-tablet-screen.js';
import { analyzeScreenSetMedication, medicationPublishTargetAllowed } from '../../platform/store-tablet-medication-guard.js';

const SUPPLIER_SET_BLOCK_TYPES = [
  'idle_media', 'product_list', 'product_content',
  'corner_description', 'health_info', 'staff_inquiry', 'qr_guide', 'content_list',
];
const SUPPLIER_TEMPLATE_KEYS_ALLOWED = [
  'corner_information_basic_v1', 'product_focus', 'corner_overview_qr', 'product_grid_qr',
];
const HUB_TARGET_STORE_TYPES = ['pharmacy', 'non_pharmacy', 'all'];

const setCols = (p: string) =>
  `${p}id, ${p}organization_id AS "organizationId", ${p}service_key AS "serviceKey", ` +
  `${p}supplier_id AS "supplierId", ${p}tablet_id AS "tabletId", ${p}name, ${p}origin, ${p}status, ` +
  `${p}hub_target_store_type AS "hubTargetStoreType", ` +
  `COALESCE(${p}template_key, 'corner_information_basic_v1') AS "templateKey", ` +
  `${p}public_qr_slug AS "publicQrSlug", ` +
  `${p}created_by_user_id AS "createdByUserId", ${p}created_at AS "createdAt", ${p}updated_at AS "updatedAt"`;
const blockCols = (p: string) =>
  `${p}id, ${p}screen_set_id AS "screenSetId", ${p}block_type AS "blockType", ${p}sort_order AS "sortOrder", ` +
  `${p}is_visible AS "isEnabled", ${p}config, ${p}created_at AS "createdAt", ${p}updated_at AS "updatedAt"`;

function firstReturnedRow(result: unknown): any | null {
  if (!Array.isArray(result)) return null;
  const rows = Array.isArray(result[0]) ? (result[0] as unknown[]) : (result as unknown[]);
  return (rows[0] as any) ?? null;
}

export function createSupplierScreenSetController(
  dataSource: DataSource,
  requireAuth: RequestHandler,
  serviceKey: string,
): Router {
  const router = Router();

  /**
   * 공급자 권한 + supplier_id 확정. 로그인 사용자의 **ACTIVE** neture_suppliers.id 반환.
   *   organization_id 를 소유권에 쓰지 않는다(F6). 미확정 시 응답 전송 후 null.
   */
  async function requireSupplier(req: Request, res: Response): Promise<string | null> {
    const authReq = req as unknown as AuthRequest;
    const userId = authReq.user?.id || (authReq as any).authUser?.id;
    if (!userId) {
      res.status(401).json({ success: false, error: 'Authentication required', code: 'AUTH_REQUIRED' });
      return null;
    }
    const rows = await dataSource.query(
      `SELECT id FROM neture_suppliers WHERE user_id = $1 AND status = 'ACTIVE' LIMIT 1`,
      [userId],
    );
    const supplierId: string | null = rows?.[0]?.id ?? null;
    if (!supplierId) {
      res.status(403).json({ success: false, error: 'Active supplier membership required', code: 'SUPPLIER_MEMBERSHIP_REQUIRED' });
      return null;
    }
    return supplierId;
  }

  /** 자기 공급자 원본 소유·격리 WHERE (origin='supplier' AND supplier_id AND service_key AND 미삭제). */
  const ownWhere = 'origin = \'supplier\' AND supplier_id = $SUP AND service_key = $SVC AND deleted_at IS NULL';

  // GET / — 자기 공급자 원본 목록
  router.get('/', requireAuth, async (req, res) => {
    const supplierId = await requireSupplier(req, res); if (!supplierId) return;
    try {
      const rows = await dataSource.query(
        `SELECT ${setCols('s.')},
                (SELECT count(*)::int FROM store_tablet_screen_blocks b WHERE b.screen_set_id = s.id) AS "blockCount"
         FROM store_tablet_screen_sets s
         WHERE s.origin = 'supplier' AND s.supplier_id = $1 AND s.service_key = $2 AND s.deleted_at IS NULL
         ORDER BY s.updated_at DESC`,
        [supplierId, serviceKey],
      );
      res.json({ success: true, data: rows });
    } catch (error: any) {
      console.error('[SupplierScreenSet] GET / error:', error);
      res.status(500).json({ success: false, error: 'Failed to fetch screen sets', code: 'INTERNAL_ERROR' });
    }
  });

  // GET /content-sources/o4o-descriptions?q= — O4O 표준 설명서(STORE canonical) 검색.
  //   매장 제작 콘텐츠 검색은 제공하지 않는다(WO 차단).
  router.get('/content-sources/o4o-descriptions', requireAuth, async (req, res) => {
    const supplierId = await requireSupplier(req, res); if (!supplierId) return;
    try {
      const q = typeof req.query.q === 'string' ? req.query.q.trim() : '';
      if (q.length < 2) { res.json({ success: true, data: [] }); return; }
      const rows = await dataSource.query(
        `SELECT pm.id AS "masterId", pm.name, pm.barcode, pm.specification,
                (SELECT d.summary FROM shared_product_descriptions d
                  WHERE d.master_id = pm.id AND d.description_type = 'STORE' AND d.status = 'canonical' AND d.deleted_at IS NULL
                  ORDER BY (d.language = 'ko') DESC, d.updated_at DESC LIMIT 1) AS summary,
                ARRAY(SELECT DISTINCT d.language FROM shared_product_descriptions d
                       WHERE d.master_id = pm.id AND d.description_type = 'STORE' AND d.status = 'canonical' AND d.deleted_at IS NULL) AS languages
           FROM product_masters pm
          WHERE EXISTS(SELECT 1 FROM shared_product_descriptions d
                        WHERE d.master_id = pm.id AND d.description_type = 'STORE' AND d.status = 'canonical' AND d.deleted_at IS NULL)
            AND (pm.name ILIKE $1 OR pm.barcode = $2)
          ORDER BY pm.name ASC
          LIMIT 30`,
        [`%${q}%`, q],
      );
      res.json({ success: true, data: rows });
    } catch (error: any) {
      console.error('[SupplierScreenSet] GET /content-sources/o4o-descriptions error:', error);
      res.status(500).json({ success: false, error: 'Failed to search o4o descriptions', code: 'INTERNAL_ERROR' });
    }
  });

  // POST /preview — 저장 전 draft blocks → sections(read-only). Supplier ContentSourceAdapter.
  router.post('/preview', requireAuth, async (req, res) => {
    const supplierId = await requireSupplier(req, res); if (!supplierId) return;
    try {
      let templateKey = resolveTemplateKey({ templateKey: req.body?.templateKey });
      if (!SUPPLIER_TEMPLATE_KEYS_ALLOWED.includes(templateKey)) templateKey = 'corner_information_basic_v1';
      const rawBlocks = Array.isArray(req.body?.blocks) ? req.body.blocks : [];
      const visible = rawBlocks
        .map((b: any, i: number) => ({ b, i }))
        .filter(({ b }: any) => b && typeof b === 'object' && b.isEnabled !== false && SUPPLIER_SET_BLOCK_TYPES.includes(b.blockType))
        .sort((x: any, y: any) => {
          const sx = Number.isFinite(x.b.sortOrder) ? x.b.sortOrder : x.i;
          const sy = Number.isFinite(y.b.sortOrder) ? y.b.sortOrder : y.i;
          return sx - sy;
        });
      const sections: Array<{ blockType: string; sortOrder: number; data: Record<string, unknown> }> = [];
      let order = 0;
      const contentSource = createSupplierContentSourceAdapter(dataSource);
      for (const { b } of visible) {
        const bt = b.blockType as string;
        const config = (b.config && typeof b.config === 'object' && !Array.isArray(b.config)) ? b.config : {};
        try {
          if (bt === 'content_list') {
            const items = await resolveContentListItems(contentSource, '', config);
            if (items.length > 0) sections.push({ blockType: bt, sortOrder: order++, data: { items } });
          } else if (bt === 'idle_media') {
            const parsed = parseIdleMediaConfig(config);
            if (parsed.ok) {
              const resolved = resolveIdleMediaItems(parsed.value, { legacyIdlePlaylist: [], operatorCommon: [] });
              const items = resolved.map((it) => ({ type: it.mediaType, url: it.url, ...(it.durationMs !== undefined ? { durationMs: it.durationMs } : {}) }));
              if (items.length > 0) sections.push({ blockType: bt, sortOrder: order++, data: { items } });
            }
          } else if (bt === 'product_content') {
            sections.push({ blockType: bt, sortOrder: order++, data: { productRef: config.productRef ?? null, contentId: config.contentId ?? null } });
          } else if (bt === 'product_list') {
            continue;
          } else {
            const data = shapeStaticBlock(bt, config);
            if (data) sections.push({ blockType: bt, sortOrder: order++, data });
          }
        } catch (blockErr) {
          console.warn(`[SupplierScreenSet] preview block resolve skipped (${bt}):`, (blockErr as any)?.message);
        }
      }
      res.json({ success: true, data: { mode: 'screen_set', templateKey, screenSet: { id: 'preview', name: '(미리보기)' }, sections, tabletId: null } });
    } catch (error: any) {
      console.error('[SupplierScreenSet] POST /preview error:', error);
      res.status(500).json({ success: false, error: 'Failed to build preview', code: 'INTERNAL_ERROR' });
    }
  });

  // POST / — 생성 (draft, origin=supplier, supplier_id/service_key/created_by 서버 강제)
  router.post('/', requireAuth, async (req, res) => {
    const authReq = req as unknown as AuthRequest;
    const userId = authReq.user?.id || (authReq as any).authUser?.id;
    const supplierId = await requireSupplier(req, res); if (!supplierId) return;
    try {
      const name = typeof req.body?.name === 'string' ? req.body.name.trim() : '';
      if (!name) { res.status(400).json({ success: false, error: 'Screen set name is required', code: 'SCREEN_SET_NAME_REQUIRED' }); return; }
      if (name.length > 120) { res.status(400).json({ success: false, error: 'name too long (max 120)', code: 'VALIDATION_ERROR' }); return; }
      let templateKey: string | null = null;
      if (req.body?.templateKey != null) {
        templateKey = String(req.body.templateKey);
        if (!SUPPLIER_TEMPLATE_KEYS_ALLOWED.includes(templateKey)) { res.status(400).json({ success: false, error: `invalid templateKey (allowed: ${SUPPLIER_TEMPLATE_KEYS_ALLOWED.join(', ')})`, code: 'INVALID_TEMPLATE_KEY' }); return; }
      }
      // draft 는 hub_target_store_type NULL 허용(게시 시 설정).
      const ins = await dataSource.query(
        `INSERT INTO store_tablet_screen_sets
           (organization_id, service_key, supplier_id, tablet_id, name, origin, status, hub_target_store_type, template_key, created_by_user_id)
         VALUES (NULL, $1, $2, NULL, $3, 'supplier', 'draft', NULL, $4, $5)
         RETURNING ${setCols('')}`,
        [serviceKey, supplierId, name, templateKey, userId],
      );
      const row = firstReturnedRow(ins);
      if (!row) { res.status(500).json({ success: false, error: 'Insert returned no row', code: 'INTERNAL_ERROR' }); return; }
      res.status(201).json({ success: true, data: row });
    } catch (error: any) {
      console.error('[SupplierScreenSet] POST / error:', error);
      res.status(500).json({ success: false, error: 'Failed to create screen set', code: 'INTERNAL_ERROR' });
    }
  });

  // GET /:id — 단일 조회 + blocks (자기 소유)
  router.get('/:id', requireAuth, async (req, res) => {
    const supplierId = await requireSupplier(req, res); if (!supplierId) return;
    try {
      const rows = await dataSource.query(
        `SELECT ${setCols('s.')} FROM store_tablet_screen_sets s
         WHERE s.id = $1 AND ${ownWhere.replace('$SUP', '$2').replace('$SVC', '$3')} LIMIT 1`,
        [req.params.id, supplierId, serviceKey],
      );
      if (!rows?.[0]) { res.status(404).json({ success: false, error: 'Screen set not found', code: 'SCREEN_SET_NOT_FOUND' }); return; }
      const blocks = await dataSource.query(
        `SELECT ${blockCols('')} FROM store_tablet_screen_blocks WHERE screen_set_id = $1 ORDER BY sort_order ASC`,
        [req.params.id],
      );
      res.json({ success: true, data: { ...rows[0], blocks } });
    } catch (error: any) {
      console.error('[SupplierScreenSet] GET /:id error:', error);
      res.status(500).json({ success: false, error: 'Failed to fetch screen set', code: 'INTERNAL_ERROR' });
    }
  });

  // PATCH /:id — 이름·템플릿·게시대상 수정. active 원본의 대상 변경 시 의약품 가드 재적용.
  router.patch('/:id', requireAuth, async (req, res) => {
    const supplierId = await requireSupplier(req, res); if (!supplierId) return;
    try {
      const id = req.params.id;
      const owned = await dataSource.query(
        `SELECT id, status FROM store_tablet_screen_sets WHERE id = $1 AND ${ownWhere.replace('$SUP', '$2').replace('$SVC', '$3')} LIMIT 1`,
        [id, supplierId, serviceKey],
      );
      if (!owned?.[0]) { res.status(404).json({ success: false, error: 'Screen set not found', code: 'SCREEN_SET_NOT_FOUND' }); return; }
      const curStatus: string = owned[0].status;
      const sets: string[] = [];
      const params: any[] = [];
      if (typeof req.body?.name === 'string') {
        const nm = req.body.name.trim();
        if (!nm || nm.length > 120) { res.status(400).json({ success: false, error: 'invalid name', code: 'VALIDATION_ERROR' }); return; }
        params.push(nm); sets.push(`name = $${params.length}`);
      }
      if (req.body?.templateKey !== undefined) {
        const tk: string | null = req.body.templateKey == null ? null : String(req.body.templateKey);
        if (tk !== null && !SUPPLIER_TEMPLATE_KEYS_ALLOWED.includes(tk)) { res.status(400).json({ success: false, error: `invalid templateKey`, code: 'INVALID_TEMPLATE_KEY' }); return; }
        params.push(tk); sets.push(`template_key = $${params.length}`);
      }
      if (req.body?.hubTargetStoreType !== undefined) {
        const tgt: string | null = req.body.hubTargetStoreType == null ? null : String(req.body.hubTargetStoreType);
        if (tgt !== null && !HUB_TARGET_STORE_TYPES.includes(tgt)) { res.status(400).json({ success: false, error: `invalid hubTargetStoreType`, code: 'INVALID_HUB_TARGET' }); return; }
        // active 는 대상 NULL 불가(CHK) + 대상 변경 시 의약품 가드 재검사.
        if (curStatus === 'active') {
          if (tgt === null) { res.status(400).json({ success: false, error: '게시 중 원본은 게시 대상을 비울 수 없습니다.', code: 'ACTIVE_TARGET_REQUIRED' }); return; }
          const blocks = await dataSource.query(`SELECT block_type AS "blockType", config FROM store_tablet_screen_blocks WHERE screen_set_id = $1`, [id]);
          const med = await analyzeScreenSetMedication(dataSource, blocks);
          const allow = medicationPublishTargetAllowed(med, tgt);
          if (!allow.ok) { res.status(409).json({ success: false, error: allow.reason, code: 'MEDICATION_PHARMACY_ONLY' }); return; }
        }
        params.push(tgt); sets.push(`hub_target_store_type = $${params.length}`);
      }
      if (sets.length === 0) { res.status(400).json({ success: false, error: 'no fields to update', code: 'VALIDATION_ERROR' }); return; }
      sets.push(`updated_at = NOW()`);
      params.push(id); params.push(supplierId); params.push(serviceKey);
      const upd = await dataSource.query(
        `UPDATE store_tablet_screen_sets SET ${sets.join(', ')}
         WHERE id = $${params.length - 2} AND origin = 'supplier' AND supplier_id = $${params.length - 1} AND service_key = $${params.length} AND deleted_at IS NULL
         RETURNING ${setCols('')}`,
        params,
      );
      const row = firstReturnedRow(upd);
      if (!row) { res.status(404).json({ success: false, error: 'Screen set not found', code: 'SCREEN_SET_NOT_FOUND' }); return; }
      res.json({ success: true, data: row });
    } catch (error: any) {
      console.error('[SupplierScreenSet] PATCH /:id error:', error);
      res.status(500).json({ success: false, error: 'Failed to update screen set', code: 'INTERNAL_ERROR' });
    }
  });

  // PUT /:id/blocks — 블록 전체 교체. content_list 의 store_content 참조 거부(매장 콘텐츠 차단).
  router.put('/:id/blocks', requireAuth, async (req, res) => {
    const supplierId = await requireSupplier(req, res); if (!supplierId) return;
    try {
      const id = req.params.id;
      const owned = await dataSource.query(
        `SELECT id FROM store_tablet_screen_sets WHERE id = $1 AND ${ownWhere.replace('$SUP', '$2').replace('$SVC', '$3')} LIMIT 1`,
        [id, supplierId, serviceKey],
      );
      if (!owned?.[0]) { res.status(404).json({ success: false, error: 'Screen set not found', code: 'SCREEN_SET_NOT_FOUND' }); return; }
      const blocks = req.body?.blocks;
      if (!Array.isArray(blocks)) { res.status(400).json({ success: false, error: 'blocks must be an array', code: 'VALIDATION_ERROR' }); return; }
      for (let i = 0; i < blocks.length; i++) {
        const b = blocks[i];
        if (!b || typeof b !== 'object') { res.status(400).json({ success: false, error: `blocks[${i}] must be an object`, code: 'VALIDATION_ERROR' }); return; }
        if (!SUPPLIER_SET_BLOCK_TYPES.includes(b.blockType)) { res.status(400).json({ success: false, error: `blocks[${i}].blockType invalid`, code: 'INVALID_BLOCK_TYPE' }); return; }
        if (b.config != null && (typeof b.config !== 'object' || Array.isArray(b.config))) { res.status(400).json({ success: false, error: `blocks[${i}].config must be an object`, code: 'INVALID_BLOCK_CONFIG' }); return; }
        if (b.blockType === 'idle_media') {
          const parsed = parseIdleMediaConfig(b.config);
          if (!parsed.ok && 'error' in parsed) { res.status(400).json({ success: false, error: `blocks[${i}].config: ${parsed.error}`, code: 'INVALID_BLOCK_CONFIG' }); return; }
        }
        if (b.blockType === 'content_list') {
          const parsed = parseContentListConfig(b.config);
          if (!parsed.ok && 'error' in parsed) { res.status(400).json({ success: false, error: `blocks[${i}].config: ${(parsed as any).error}`, code: 'INVALID_BLOCK_CONFIG' }); return; }
          if (parsed.ok && parsed.value.items.some((it) => it.sourceType === 'store_content')) {
            res.status(400).json({ success: false, error: `blocks[${i}].config: 공급자 원본은 매장 제작 콘텐츠를 사용할 수 없습니다 (O4O 표준 설명서만 허용).`, code: 'SUPPLIER_STORE_CONTENT_FORBIDDEN' }); return;
          }
        }
      }
      await dataSource.transaction(async (manager) => {
        await manager.query(`DELETE FROM store_tablet_screen_blocks WHERE screen_set_id = $1`, [id]);
        for (let i = 0; i < blocks.length; i++) {
          const b = blocks[i];
          await manager.query(
            `INSERT INTO store_tablet_screen_blocks (screen_set_id, block_type, sort_order, is_visible, config)
             VALUES ($1, $2, $3, $4, $5::jsonb)`,
            [id, b.blockType, Number.isFinite(b.sortOrder) ? b.sortOrder : i, b.isEnabled !== false, JSON.stringify(b.config ?? {})],
          );
        }
        await manager.query(`UPDATE store_tablet_screen_sets SET updated_at = NOW() WHERE id = $1`, [id]);
      });
      const updated = await dataSource.query(`SELECT ${blockCols('')} FROM store_tablet_screen_blocks WHERE screen_set_id = $1 ORDER BY sort_order ASC`, [id]);
      res.json({ success: true, data: updated });
    } catch (error: any) {
      console.error('[SupplierScreenSet] PUT /:id/blocks error:', error);
      res.status(500).json({ success: false, error: 'Failed to save blocks', code: 'INTERNAL_ERROR' });
    }
  });

  // POST /:id/duplicate — 복제(새 draft, 값 복사, hub_target/상태 미승계)
  router.post('/:id/duplicate', requireAuth, async (req, res) => {
    const authReq = req as unknown as AuthRequest;
    const userId = authReq.user?.id || (authReq as any).authUser?.id;
    const supplierId = await requireSupplier(req, res); if (!supplierId) return;
    try {
      const src = await dataSource.query(
        `SELECT id, name, template_key AS "templateKey" FROM store_tablet_screen_sets
         WHERE id = $1 AND ${ownWhere.replace('$SUP', '$2').replace('$SVC', '$3')} LIMIT 1`,
        [req.params.id, supplierId, serviceKey],
      );
      const s = src?.[0];
      if (!s) { res.status(404).json({ success: false, error: 'Screen set not found', code: 'SCREEN_SET_NOT_FOUND' }); return; }
      let created: any = null;
      await dataSource.transaction(async (m) => {
        const ins = await m.query(
          `INSERT INTO store_tablet_screen_sets
             (organization_id, service_key, supplier_id, tablet_id, name, origin, status, hub_target_store_type, template_key, created_by_user_id)
           VALUES (NULL, $1, $2, NULL, $3, 'supplier', 'draft', NULL, $4, $5)
           RETURNING ${setCols('')}`,
          [serviceKey, supplierId, `${s.name} (사본)`.slice(0, 120), s.templateKey, userId],
        );
        created = firstReturnedRow(ins);
        await m.query(
          `INSERT INTO store_tablet_screen_blocks (screen_set_id, block_type, sort_order, is_visible, config)
           SELECT $1, block_type, sort_order, is_visible, config FROM store_tablet_screen_blocks WHERE screen_set_id = $2`,
          [created.id, s.id],
        );
      });
      res.status(201).json({ success: true, data: created });
    } catch (error: any) {
      console.error('[SupplierScreenSet] POST /:id/duplicate error:', error);
      res.status(500).json({ success: false, error: 'Failed to duplicate screen set', code: 'INTERNAL_ERROR' });
    }
  });

  // 상태 전환 공통(자기 소유 + 현재 상태 조건 검증 후 UPDATE).
  async function transition(
    req: Request, res: Response, supplierId: string,
    fromStatuses: string[], toStatus: string, extraSet: { sql: string; params: any[] } = { sql: '', params: [] },
  ): Promise<any | null> {
    const id = req.params.id;
    const owned = await dataSource.query(
      `SELECT id, status FROM store_tablet_screen_sets WHERE id = $1 AND ${ownWhere.replace('$SUP', '$2').replace('$SVC', '$3')} LIMIT 1`,
      [id, supplierId, serviceKey],
    );
    if (!owned?.[0]) { res.status(404).json({ success: false, error: 'Screen set not found', code: 'SCREEN_SET_NOT_FOUND' }); return null; }
    if (!fromStatuses.includes(owned[0].status)) {
      res.status(409).json({ success: false, error: `상태 전환 불가(현재: ${owned[0].status})`, code: 'INVALID_STATE_TRANSITION' }); return null;
    }
    const params: any[] = [toStatus, ...extraSet.params];
    const upd = await dataSource.query(
      `UPDATE store_tablet_screen_sets SET status = $1${extraSet.sql}, updated_at = NOW()
       WHERE id = $${params.length + 1} AND origin = 'supplier' AND supplier_id = $${params.length + 2} AND service_key = $${params.length + 3} AND deleted_at IS NULL
       RETURNING ${setCols('')}`,
      [...params, id, supplierId, serviceKey],
    );
    return firstReturnedRow(upd);
  }

  // POST /:id/publish — draft → active(HUB 게시). hub_target 필수 + 의약품 약국 전용 가드.
  router.post('/:id/publish', requireAuth, async (req, res) => {
    const supplierId = await requireSupplier(req, res); if (!supplierId) return;
    try {
      const id = req.params.id;
      const cur = await dataSource.query(
        `SELECT s.id, s.name, s.status, s.hub_target_store_type AS "hubTargetStoreType",
                (SELECT count(*)::int FROM store_tablet_screen_blocks b WHERE b.screen_set_id = s.id) AS "blockCount"
         FROM store_tablet_screen_sets s WHERE s.id = $1 AND ${ownWhere.replace('$SUP', '$2').replace('$SVC', '$3')} LIMIT 1`,
        [id, supplierId, serviceKey],
      );
      const s = cur?.[0];
      if (!s) { res.status(404).json({ success: false, error: 'Screen set not found', code: 'SCREEN_SET_NOT_FOUND' }); return; }
      if (s.status !== 'draft') { res.status(409).json({ success: false, error: `게시는 작성 중(draft)에서만 가능합니다(현재: ${s.status})`, code: 'INVALID_STATE_TRANSITION' }); return; }
      if (!s.name || !s.name.trim()) { res.status(400).json({ success: false, error: '이름이 필요합니다.', code: 'SCREEN_SET_NAME_REQUIRED' }); return; }
      if ((s.blockCount ?? 0) === 0) { res.status(400).json({ success: false, error: '화면 구성(블록)이 비어 있어 게시할 수 없습니다.', code: 'EMPTY_SCREEN_SET' }); return; }
      // 게시 대상: body 우선, 없으면 기존 값.
      const target = req.body?.hubTargetStoreType != null ? String(req.body.hubTargetStoreType) : (s.hubTargetStoreType ?? null);
      if (!target || !HUB_TARGET_STORE_TYPES.includes(target)) { res.status(400).json({ success: false, error: '게시 대상(pharmacy/non_pharmacy/all)을 선택해야 합니다.', code: 'HUB_TARGET_REQUIRED' }); return; }
      // 의약품 가드: 포함 상품 조사 → 의약품/미분류면 pharmacy 만 허용.
      const blocks = await dataSource.query(`SELECT block_type AS "blockType", config FROM store_tablet_screen_blocks WHERE screen_set_id = $1`, [id]);
      const med = await analyzeScreenSetMedication(dataSource, blocks);
      const allow = medicationPublishTargetAllowed(med, target);
      if (!allow.ok) { res.status(409).json({ success: false, error: allow.reason, code: 'MEDICATION_PHARMACY_ONLY' }); return; }
      const row = await transition(req, res, supplierId, ['draft'], 'active', { sql: ', hub_target_store_type = $2', params: [target] });
      if (row) res.json({ success: true, data: row });
    } catch (error: any) {
      console.error('[SupplierScreenSet] POST /:id/publish error:', error);
      if (!res.headersSent) res.status(500).json({ success: false, error: 'Failed to publish', code: 'INTERNAL_ERROR' });
    }
  });

  // POST /:id/unpublish — active → draft(게시 해제). hub_target 유지.
  router.post('/:id/unpublish', requireAuth, async (req, res) => {
    const supplierId = await requireSupplier(req, res); if (!supplierId) return;
    try {
      const row = await transition(req, res, supplierId, ['active'], 'draft');
      if (row) res.json({ success: true, data: row });
    } catch (error: any) {
      console.error('[SupplierScreenSet] POST /:id/unpublish error:', error);
      if (!res.headersSent) res.status(500).json({ success: false, error: 'Failed to unpublish', code: 'INTERNAL_ERROR' });
    }
  });

  // POST /:id/archive — draft|active → archived(보관). hub_target 유지.
  router.post('/:id/archive', requireAuth, async (req, res) => {
    const supplierId = await requireSupplier(req, res); if (!supplierId) return;
    try {
      const row = await transition(req, res, supplierId, ['draft', 'active'], 'archived');
      if (row) res.json({ success: true, data: row });
    } catch (error: any) {
      console.error('[SupplierScreenSet] POST /:id/archive error:', error);
      if (!res.headersSent) res.status(500).json({ success: false, error: 'Failed to archive', code: 'INTERNAL_ERROR' });
    }
  });

  // POST /:id/unarchive — archived → draft(보관 해제).
  router.post('/:id/unarchive', requireAuth, async (req, res) => {
    const supplierId = await requireSupplier(req, res); if (!supplierId) return;
    try {
      const row = await transition(req, res, supplierId, ['archived'], 'draft');
      if (row) res.json({ success: true, data: row });
    } catch (error: any) {
      console.error('[SupplierScreenSet] POST /:id/unarchive error:', error);
      if (!res.headersSent) res.status(500).json({ success: false, error: 'Failed to unarchive', code: 'INTERNAL_ERROR' });
    }
  });

  // DELETE /:id — 목록에서 제거(soft delete).
  router.delete('/:id', requireAuth, async (req, res) => {
    const supplierId = await requireSupplier(req, res); if (!supplierId) return;
    try {
      const id = req.params.id;
      const del = await dataSource.query(
        `UPDATE store_tablet_screen_sets SET deleted_at = NOW(), updated_at = NOW()
         WHERE id = $1 AND ${ownWhere.replace('$SUP', '$2').replace('$SVC', '$3')} RETURNING id`,
        [id, supplierId, serviceKey],
      );
      if (!firstReturnedRow(del)) { res.status(404).json({ success: false, error: 'Screen set not found', code: 'SCREEN_SET_NOT_FOUND' }); return; }
      res.json({ success: true, data: { id, deleted: true } });
    } catch (error: any) {
      console.error('[SupplierScreenSet] DELETE /:id error:', error);
      res.status(500).json({ success: false, error: 'Failed to remove screen set', code: 'INTERNAL_ERROR' });
    }
  });

  return router;
}

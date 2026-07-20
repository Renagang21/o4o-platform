/**
 * Operator Screen Set Controller — 운영자 Screen Set 원본 제작 API
 *
 * WO-O4O-OPERATOR-SCREEN-SET-AUTHORING-FOUNDATION-V1
 *   설계: ADR-O4O-SCREEN-SET-OWNER-SCOPE-MODEL-V1
 *   선행 스키마: WO-O4O-SCREEN-SET-OWNER-SCOPE-SCHEMA-MIGRATION-V1 (organization_id nullable + CHK_stss_owner_scope)
 *
 * 운영자가 매장 배포용 Screen Set **원본(operator_template)** 을 제작·수정·미리보기한다.
 * 매장(store) 제작 API(store-tablet.routes.ts /screen-sets)와 **별도 라우터** — 권한·소유권·URL prefix 가 다르며
 * 같은 store_tablet_screen_sets 테이블을 origin 으로 분리한다.
 *
 * 확정 소유권 계약(CHK_stss_owner_scope operator 브랜치):
 *   origin='operator' · organization_id=NULL · supplier_id=NULL · service_key=<주입> ·
 *   created_by_user_id=<작성자> · status='operator_template'
 *
 * 권한 (operator-blog.controller.ts 와 동일 패턴):
 *   {service}:operator / {service}:admin / platform:admin / platform:super_admin
 *   (supplier / store_owner / member 차단)
 *
 * 라우트 (router 내부, 외부 mount: /api/v1/{serviceKey}/operator/screen-sets):
 *   GET    /                                  — 같은 service_key 운영자 원본 목록
 *   GET    /:id                               — 단일 조회 + blocks
 *   POST   /                                  — 생성 (operator_template)
 *   PATCH  /:id                               — 이름·템플릿 수정
 *   PUT    /:id/blocks                        — 블록 전체 교체
 *   POST   /preview                           — 저장 전 draft 미리보기 (Operator ContentSourceAdapter)
 *   DELETE /:id                               — 목록에서 제거(soft delete)
 *   GET    /content-sources/o4o-descriptions  — O4O 표준 설명서 검색(콘텐츠 picker)
 *
 * 차단(WO 차단 조건 — 이 라우터에 존재하지 않음):
 *   매장·코너 직접 적용 / current_screen_set 지정 / 공개 타블렛 URL / Screen Set QR 생성 /
 *   매장 제작 콘텐츠 조회. (QR helper·corner 연결·tablet 배정 로직 미포함.)
 */

import { Router, Request, Response, RequestHandler } from 'express';
import { DataSource } from 'typeorm';
import type { AuthRequest } from '../../../types/auth.js';
import { hasAnyServiceRole } from '../../../utils/role.utils.js';
import type { PrefixedRole } from '../../../types/roles.js';
import { parseIdleMediaConfig, resolveIdleMediaItems } from '../../platform/store-tablet-idle-block.js';
import { parseContentListConfig } from '../../platform/store-tablet-content-list-block.js';
import { resolveContentListItems } from '../../platform/store-public/store-public-tablet-content-resolve.js';
import { createOperatorContentSourceAdapter } from '../../platform/store-public/store-public-tablet-content-source.js';
import { shapeStaticBlock, resolveTemplateKey } from '../../platform/store-public/store-public-tablet-screen.js';

// 저장 허용 block_type — 매장 API 와 동일(배포 CHECK 8종). product_list 는 배치 placeholder(운영자 원본엔 실상품 없음).
const OPERATOR_SET_BLOCK_TYPES = [
  'idle_media', 'product_list', 'product_content',
  'corner_description', 'health_info', 'staff_inquiry', 'qr_guide', 'content_list',
];
// 신규 선택 가능 템플릿 4종(WO). legacy idle_touch_video 는 신규 선택 제외(WO 제외 조건).
const OPERATOR_TEMPLATE_KEYS_ALLOWED = [
  'corner_information_basic_v1', // 기본 코너 안내형
  'product_focus',               // 상품 집중형
  'corner_overview_qr',          // 코너 소개형
  'product_grid_qr',             // 제품 진열형
];

// 응답 컬럼 — 매장 setCols 와 동일 shape(운영자 row: organization_id/supplier_id/tablet_id/public_qr_slug=NULL).
//   QR(publicQrSlug)은 항상 NULL(운영자 원본 QR 미발급). withQrLink/ensureScreenSetQr 호출하지 않는다.
const setCols = (p: string) =>
  `${p}id, ${p}organization_id AS "organizationId", ${p}service_key AS "serviceKey", ` +
  `${p}supplier_id AS "supplierId", ${p}tablet_id AS "tabletId", ${p}name, ${p}origin, ${p}status, ` +
  `COALESCE(${p}template_key, 'corner_information_basic_v1') AS "templateKey", ` +
  `${p}public_qr_slug AS "publicQrSlug", ` +
  `${p}created_by_user_id AS "createdByUserId", ${p}created_at AS "createdAt", ${p}updated_at AS "updatedAt"`;
const blockCols = (p: string) =>
  `${p}id, ${p}screen_set_id AS "screenSetId", ${p}block_type AS "blockType", ${p}sort_order AS "sortOrder", ` +
  `${p}is_visible AS "isEnabled", ${p}config, ${p}created_at AS "createdAt", ${p}updated_at AS "updatedAt"`;

function buildAllowedRoles(serviceKey: string): PrefixedRole[] {
  return [
    `${serviceKey}:admin` as PrefixedRole,
    `${serviceKey}:operator` as PrefixedRole,
    'platform:admin',
    'platform:super_admin',
  ];
}

export function createOperatorScreenSetController(
  dataSource: DataSource,
  requireAuth: RequestHandler,
  serviceKey: string,
): Router {
  const router = Router();
  const allowedRoles = buildAllowedRoles(serviceKey);

  /** operator/admin 권한 inline guard (operator-blog.controller.ts 와 동일 패턴). userId 반환 또는 null(응답 전송됨). */
  function requireOperator(req: Request, res: Response): string | null {
    const authReq = req as unknown as AuthRequest;
    const userId = authReq.user?.id || (authReq as any).authUser?.id;
    const roles = (authReq.user?.roles as string[] | undefined) ?? [];
    if (!userId) {
      res.status(401).json({ success: false, error: 'Authentication required', code: 'AUTH_REQUIRED' });
      return null;
    }
    if (!hasAnyServiceRole(roles, allowedRoles)) {
      res.status(403).json({ success: false, error: `Operator or administrator role required for ${serviceKey}`, code: 'FORBIDDEN' });
      return null;
    }
    return userId;
  }

  // 소유·격리 조건은 각 쿼리에 인라인: origin='operator' AND service_key=<주입> AND deleted_at IS NULL.
  //   다른 서비스·매장(origin='store')·공급자(origin='supplier') 원본 접근 차단.

  // GET / — 같은 service_key 운영자 원본 목록
  router.get('/', requireAuth, async (req, res) => {
    if (!requireOperator(req, res)) return;
    try {
      const rows = await dataSource.query(
        `SELECT ${setCols('s.')},
                (SELECT count(*)::int FROM store_tablet_screen_blocks b WHERE b.screen_set_id = s.id) AS "blockCount"
         FROM store_tablet_screen_sets s
         WHERE s.origin = 'operator' AND s.service_key = $1 AND s.deleted_at IS NULL
         ORDER BY s.updated_at DESC`,
        [serviceKey],
      );
      res.json({ success: true, data: rows });
    } catch (error: any) {
      console.error('[OperatorScreenSet] GET / error:', error);
      res.status(500).json({ success: false, error: 'Failed to fetch screen sets', code: 'INTERNAL_ERROR' });
    }
  });

  // GET /content-sources/o4o-descriptions?q= — O4O 표준 설명서(STORE canonical) 검색(콘텐츠 picker)
  //   매장 제작 콘텐츠(store-contents) 검색은 제공하지 않는다(WO 차단: 매장 콘텐츠 조회 제외).
  router.get('/content-sources/o4o-descriptions', requireAuth, async (req, res) => {
    if (!requireOperator(req, res)) return;
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
      console.error('[OperatorScreenSet] GET /content-sources/o4o-descriptions error:', error);
      res.status(500).json({ success: false, error: 'Failed to search o4o descriptions', code: 'INTERNAL_ERROR' });
    }
  });

  // POST /preview — 저장 전 draft blocks → sections(read-only). Operator ContentSourceAdapter(매장 콘텐츠 차단).
  //   매장 preview 와 동일 resolve 로직이나 content_list 원본 조회는 운영자 adapter(store content → null) 사용.
  //   운영자는 매장 org 없음 → resolveContentListItems 의 org 인자는 사용되지 않음(store item 은 adapter 가 null).
  router.post('/preview', requireAuth, async (req, res) => {
    if (!requireOperator(req, res)) return;
    try {
      let templateKey = resolveTemplateKey({ templateKey: req.body?.templateKey });
      if (!OPERATOR_TEMPLATE_KEYS_ALLOWED.includes(templateKey)) templateKey = 'corner_information_basic_v1';

      const rawBlocks = Array.isArray(req.body?.blocks) ? req.body.blocks : [];
      const visible = rawBlocks
        .map((b: any, i: number) => ({ b, i }))
        .filter(({ b }: any) => b && typeof b === 'object' && b.isEnabled !== false && OPERATOR_SET_BLOCK_TYPES.includes(b.blockType))
        .sort((x: any, y: any) => {
          const sx = Number.isFinite(x.b.sortOrder) ? x.b.sortOrder : x.i;
          const sy = Number.isFinite(y.b.sortOrder) ? y.b.sortOrder : y.i;
          return sx - sy;
        });

      const sections: Array<{ blockType: string; sortOrder: number; data: Record<string, unknown> }> = [];
      let order = 0;
      const contentSource = createOperatorContentSourceAdapter(dataSource);
      for (const { b } of visible) {
        const bt = b.blockType as string;
        const config = (b.config && typeof b.config === 'object' && !Array.isArray(b.config)) ? b.config : {};
        try {
          if (bt === 'content_list') {
            // org 인자는 store item 에만 쓰이며 operator adapter 가 store item 을 null 처리 → '' 전달.
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
            // 운영자 원본엔 실상품 없음 — 뷰어 상품은 매장 적용 시점에 결정. preview 에서 생략(매장 preview 와 동일).
            continue;
          } else {
            const data = shapeStaticBlock(bt, config);
            if (data) sections.push({ blockType: bt, sortOrder: order++, data });
          }
        } catch (blockErr) {
          console.warn(`[OperatorScreenSet] preview block resolve skipped (${bt}):`, (blockErr as any)?.message);
        }
      }

      res.json({ success: true, data: { mode: 'screen_set', templateKey, screenSet: { id: 'preview', name: '(미리보기)' }, sections, tabletId: null } });
    } catch (error: any) {
      console.error('[OperatorScreenSet] POST /preview error:', error);
      res.status(500).json({ success: false, error: 'Failed to build preview', code: 'INTERNAL_ERROR' });
    }
  });

  // POST / — 생성 (operator_template, org NULL, service_key 주입, created_by 강제)
  router.post('/', requireAuth, async (req, res) => {
    const userId = requireOperator(req, res);
    if (!userId) return;
    try {
      const name = typeof req.body?.name === 'string' ? req.body.name.trim() : '';
      if (!name) { res.status(400).json({ success: false, error: 'Screen set name is required', code: 'SCREEN_SET_NAME_REQUIRED' }); return; }
      if (name.length > 120) { res.status(400).json({ success: false, error: 'name too long (max 120)', code: 'VALIDATION_ERROR' }); return; }
      let templateKey: string | null = null;
      if (req.body?.templateKey != null) {
        templateKey = String(req.body.templateKey);
        if (!OPERATOR_TEMPLATE_KEYS_ALLOWED.includes(templateKey)) { res.status(400).json({ success: false, error: `invalid templateKey (allowed: ${OPERATOR_TEMPLATE_KEYS_ALLOWED.join(', ')})`, code: 'INVALID_TEMPLATE_KEY' }); return; }
      }
      // CHK_stss_owner_scope operator 브랜치: org NULL · supplier NULL · service_key/created_by NOT NULL. status=operator_template.
      const ins = await dataSource.query(
        `INSERT INTO store_tablet_screen_sets
           (organization_id, service_key, supplier_id, tablet_id, name, origin, status, template_key, created_by_user_id)
         VALUES (NULL, $1, NULL, NULL, $2, 'operator', 'operator_template', $3, $4)
         RETURNING ${setCols('')}`,
        [serviceKey, name, templateKey, userId],
      );
      res.status(201).json({ success: true, data: ins[0] });
    } catch (error: any) {
      console.error('[OperatorScreenSet] POST / error:', error);
      res.status(500).json({ success: false, error: 'Failed to create screen set', code: 'INTERNAL_ERROR' });
    }
  });

  // GET /:id — 단일 조회 + blocks (origin='operator' AND service_key 격리)
  router.get('/:id', requireAuth, async (req, res) => {
    if (!requireOperator(req, res)) return;
    try {
      const rows = await dataSource.query(
        `SELECT ${setCols('s.')} FROM store_tablet_screen_sets s
         WHERE s.id = $1 AND s.origin = 'operator' AND s.service_key = $2 AND s.deleted_at IS NULL LIMIT 1`,
        [req.params.id, serviceKey],
      );
      if (!rows?.[0]) { res.status(404).json({ success: false, error: 'Screen set not found', code: 'SCREEN_SET_NOT_FOUND' }); return; }
      const blocks = await dataSource.query(
        `SELECT ${blockCols('')} FROM store_tablet_screen_blocks WHERE screen_set_id = $1 ORDER BY sort_order ASC`,
        [req.params.id],
      );
      res.json({ success: true, data: { ...rows[0], blocks } });
    } catch (error: any) {
      console.error('[OperatorScreenSet] GET /:id error:', error);
      res.status(500).json({ success: false, error: 'Failed to fetch screen set', code: 'INTERNAL_ERROR' });
    }
  });

  // PATCH /:id — 이름·템플릿 수정 (status/organization/tablet 미지원 — 운영자 원본은 계약 고정)
  router.patch('/:id', requireAuth, async (req, res) => {
    if (!requireOperator(req, res)) return;
    try {
      const id = req.params.id;
      const owned = await dataSource.query(
        `SELECT id FROM store_tablet_screen_sets WHERE id = $1 AND origin = 'operator' AND service_key = $2 AND deleted_at IS NULL LIMIT 1`,
        [id, serviceKey],
      );
      if (!owned?.[0]) { res.status(404).json({ success: false, error: 'Screen set not found', code: 'SCREEN_SET_NOT_FOUND' }); return; }
      const sets: string[] = [];
      const params: any[] = [];
      if (typeof req.body?.name === 'string') {
        const nm = req.body.name.trim();
        if (!nm || nm.length > 120) { res.status(400).json({ success: false, error: 'invalid name', code: 'VALIDATION_ERROR' }); return; }
        params.push(nm); sets.push(`name = $${params.length}`);
      }
      if (req.body?.templateKey !== undefined) {
        const tk: string | null = req.body.templateKey == null ? null : String(req.body.templateKey);
        if (tk !== null && !OPERATOR_TEMPLATE_KEYS_ALLOWED.includes(tk)) { res.status(400).json({ success: false, error: `invalid templateKey (allowed: ${OPERATOR_TEMPLATE_KEYS_ALLOWED.join(', ')})`, code: 'INVALID_TEMPLATE_KEY' }); return; }
        params.push(tk); sets.push(`template_key = $${params.length}`);
      }
      if (sets.length === 0) { res.status(400).json({ success: false, error: 'no fields to update', code: 'VALIDATION_ERROR' }); return; }
      sets.push(`updated_at = NOW()`);
      params.push(id); params.push(serviceKey);
      const upd = await dataSource.query(
        `UPDATE store_tablet_screen_sets SET ${sets.join(', ')}
         WHERE id = $${params.length - 1} AND origin = 'operator' AND service_key = $${params.length} AND deleted_at IS NULL
         RETURNING ${setCols('')}`,
        params,
      );
      if (!upd?.[0]) { res.status(404).json({ success: false, error: 'Screen set not found', code: 'SCREEN_SET_NOT_FOUND' }); return; }
      res.json({ success: true, data: upd[0] });
    } catch (error: any) {
      console.error('[OperatorScreenSet] PATCH /:id error:', error);
      res.status(500).json({ success: false, error: 'Failed to update screen set', code: 'INTERNAL_ERROR' });
    }
  });

  // PUT /:id/blocks — 블록 전체 교체(매장 PUT 패턴). content_list 의 store_content 참조는 거부(매장 콘텐츠 차단).
  router.put('/:id/blocks', requireAuth, async (req, res) => {
    if (!requireOperator(req, res)) return;
    try {
      const id = req.params.id;
      const owned = await dataSource.query(
        `SELECT id FROM store_tablet_screen_sets WHERE id = $1 AND origin = 'operator' AND service_key = $2 AND deleted_at IS NULL LIMIT 1`,
        [id, serviceKey],
      );
      if (!owned?.[0]) { res.status(404).json({ success: false, error: 'Screen set not found', code: 'SCREEN_SET_NOT_FOUND' }); return; }
      const blocks = req.body?.blocks;
      if (!Array.isArray(blocks)) { res.status(400).json({ success: false, error: 'blocks must be an array', code: 'VALIDATION_ERROR' }); return; }
      for (let i = 0; i < blocks.length; i++) {
        const b = blocks[i];
        if (!b || typeof b !== 'object') { res.status(400).json({ success: false, error: `blocks[${i}] must be an object`, code: 'VALIDATION_ERROR' }); return; }
        if (!OPERATOR_SET_BLOCK_TYPES.includes(b.blockType)) { res.status(400).json({ success: false, error: `blocks[${i}].blockType invalid (allowed: ${OPERATOR_SET_BLOCK_TYPES.join(', ')})`, code: 'INVALID_BLOCK_TYPE' }); return; }
        if (b.config != null && (typeof b.config !== 'object' || Array.isArray(b.config))) { res.status(400).json({ success: false, error: `blocks[${i}].config must be an object`, code: 'INVALID_BLOCK_CONFIG' }); return; }
        if (b.blockType === 'idle_media') {
          const parsed = parseIdleMediaConfig(b.config);
          if (!parsed.ok && 'error' in parsed) { res.status(400).json({ success: false, error: `blocks[${i}].config: ${parsed.error}`, code: 'INVALID_BLOCK_CONFIG' }); return; }
        }
        if (b.blockType === 'content_list') {
          const parsed = parseContentListConfig(b.config);
          if (!parsed.ok && 'error' in parsed) { res.status(400).json({ success: false, error: `blocks[${i}].config: ${(parsed as any).error}`, code: 'INVALID_BLOCK_CONFIG' }); return; }
          // WO 차단: 운영자 원본은 매장 제작 콘텐츠(store_content)를 참조할 수 없다. o4o_product_description 만 허용.
          if (parsed.ok && parsed.value.items.some((it) => it.sourceType === 'store_content')) {
            res.status(400).json({ success: false, error: `blocks[${i}].config: 운영자 원본은 매장 제작 콘텐츠를 사용할 수 없습니다 (O4O 표준 설명서만 허용).`, code: 'OPERATOR_STORE_CONTENT_FORBIDDEN' }); return;
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
      console.error('[OperatorScreenSet] PUT /:id/blocks error:', error);
      res.status(500).json({ success: false, error: 'Failed to save blocks', code: 'INTERNAL_ERROR' });
    }
  });

  // DELETE /:id — 목록에서 제거(soft delete). 매장·코너 연결/QR 없음 → 별도 가드 불필요.
  router.delete('/:id', requireAuth, async (req, res) => {
    if (!requireOperator(req, res)) return;
    try {
      const id = req.params.id;
      const del = await dataSource.query(
        `UPDATE store_tablet_screen_sets SET deleted_at = NOW(), updated_at = NOW()
         WHERE id = $1 AND origin = 'operator' AND service_key = $2 AND deleted_at IS NULL RETURNING id`,
        [id, serviceKey],
      );
      if (!del?.[0]) { res.status(404).json({ success: false, error: 'Screen set not found', code: 'SCREEN_SET_NOT_FOUND' }); return; }
      res.json({ success: true, data: { id, deleted: true } });
    } catch (error: any) {
      console.error('[OperatorScreenSet] DELETE /:id error:', error);
      res.status(500).json({ success: false, error: 'Failed to remove screen set', code: 'INTERNAL_ERROR' });
    }
  });

  return router;
}

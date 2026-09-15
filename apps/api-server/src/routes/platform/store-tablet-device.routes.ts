/**
 * 실제 태블릿 기기(store_tablet_devices) · 연결(pairing) · 현장 runtime 관리 라우트
 *
 * WO-O4O-STORE-TABLET-LOCATION-CONTENT-RUNTIME-MANAGEMENT-V1
 *
 * 세 축: 위치(store_tablets) ≠ 실제 태블릿(store_tablet_devices) ≠ 콘텐츠(store_tablet_screen_sets).
 *
 * ┌────────────────────────────────────────────────────────────────────────────────┐
 * │ 매장 경영자(withStoreAuth · /api/v1/store 및 서비스 mount)                        │
 * │  GET    /tablet-devices                      — 실제 태블릿 목록(+연결 위치·마지막 접속)  │
 * │  POST   /tablets/:id/pairing-codes           — 위치에 태블릿 연결용 6자리 코드 발급     │
 * │  PATCH  /tablet-devices/:id                  — 이름/위치/활성 변경                     │
 * │  DELETE /tablet-devices/:id                  — 연결 해제(비활성 + 토큰 폐기)            │
 * │                                                                                │
 * │ 현장 직원(withTabletRuntimeAuth = 기존 로그인 + 기기 토큰 + 조직 멤버십)               │
 * │  GET    /tablet-runtime/device               — 이 기기·현재 위치·현재 콘텐츠·선택지     │
 * │  GET    /tablet-runtime/locations            — 매장 위치 목록                          │
 * │  GET    /tablet-runtime/locations/:id/contents — 위치에 연결된 콘텐츠 목록             │
 * │  POST   /tablet-runtime/devices/:id/location — 기기 위치 이동(current_location_id 만)  │
 * │  POST   /tablet-runtime/devices/:id/content  — 현재 위치의 콘텐츠 전환(current_screen_set_id) │
 * │  GET    /tablet-runtime/screen-sets/:id/product-list — 빠른 상품 수정 데이터           │
 * │  PUT    /tablet-runtime/screen-sets/:id/product-list — 빠른 상품 수정 저장             │
 * │                                                                                │
 * │ 공개(기기 · /api/v1/stores)                                                       │
 * │  POST   /tablet-pairing/lookup               — 코드 → 매장/위치 확인(상태 변경 없음)     │
 * │  POST   /tablet-pairing/claim                — 코드 사용 → 기기 토큰 발급              │
 * │  POST   /:slug/tablet/device/heartbeat       — 토큰 → 현재 위치/콘텐츠/version(폴링)    │
 * └────────────────────────────────────────────────────────────────────────────────┘
 *
 * 직원 권한: 새 PIN·직원 계정·태블릿 전용 identity 를 만들지 않는다. 기존 로그인 세션(requireAuth)에
 *   기기 토큰이 가리키는 매장(organization)의 organization_members(owner/admin/manager, left_at IS NULL)
 *   또는 그 매장의 store_owner(role_assignments) 인지만 확인한다. 상품·매장 설정 전체 권한은 주지 않는다.
 * 기기 토큰: 브라우저가 보관하는 원문의 sha256 hex 만 저장(원문 미저장).
 */
import { Router, type Request, type Response } from 'express';
import type { DataSource } from 'typeorm';
import crypto from 'crypto';
import rateLimit from 'express-rate-limit';
import { getTrustedClientIp } from '../../utils/trusted-client-ip.js';
import { isStoreOwner, type StoreOwnerServiceKey } from '../../utils/store-owner.utils.js';
import {
  applyScreenSetProductList,
  normalizeProductListInput,
  readProductListSelection,
  ScreenSetOpsError,
  type ProductListItem,
} from './store-tablet-screen-set-ops.js';

export const TABLET_DEVICE_TOKEN_HEADER = 'x-tablet-device-token';
const PAIRING_TTL_MS = 10 * 60 * 1000;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function hashDeviceToken(token: string): string {
  return crypto.createHash('sha256').update(token, 'utf8').digest('hex');
}

function generatePairingCode(): string {
  // 000000~999999 균등(6자리 zero-pad). crypto.randomInt 로 편향 없음.
  return String(crypto.randomInt(0, 1_000_000)).padStart(6, '0');
}

type DeviceRow = {
  id: string;
  organizationId: string;
  name: string;
  currentLocationId: string | null;
  lastSeenAt: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  pairingPending: boolean;
  pairingExpiresAt: string | null;
};

const deviceCols = (p: string) =>
  `${p}id, ${p}organization_id AS "organizationId", ${p}name, ${p}current_location_id AS "currentLocationId", ` +
  `${p}last_seen_at AS "lastSeenAt", ${p}is_active AS "isActive", ${p}created_at AS "createdAt", ${p}updated_at AS "updatedAt", ` +
  `(${p}device_token_hash IS NULL) AS "pairingPending", ${p}pairing_expires_at AS "pairingExpiresAt"`;

function respondOpsError(res: Response, error: unknown, fallback: string): boolean {
  if (error instanceof ScreenSetOpsError) {
    res.status(error.status).json({ success: false, error: error.message, code: error.code, ...(error.data ? { data: error.data } : {}) });
    return true;
  }
  console.error(`[StoreTabletDevice] ${fallback}:`, error);
  res.status(500).json({ success: false, error: fallback, code: 'INTERNAL_ERROR' });
  return true;
}

/** 위치(store_tablets) 목록 — 활성만. 이름은 `location`(위치 코드) + `name`(메모/표시명). */
async function listLocations(dataSource: DataSource, organizationId: string) {
  return dataSource.query(
    `SELECT t.id, t.name, t.location, t.current_screen_set_id AS "currentScreenSetId",
            s.name AS "currentScreenSetName",
            (SELECT count(*)::int FROM store_tablet_devices d WHERE d.current_location_id = t.id AND d.is_active = TRUE AND d.device_token_hash IS NOT NULL) AS "deviceCount"
       FROM store_tablets t
       LEFT JOIN store_tablet_screen_sets s ON s.id = t.current_screen_set_id AND s.deleted_at IS NULL
      WHERE t.organization_id = $1 AND t.is_active = TRUE
      ORDER BY t.location ASC NULLS LAST, t.name ASC, t.created_at ASC`,
    [organizationId],
  );
}

/** 위치에 연결된 콘텐츠(store_tablet_corner_contents) — 활성(active) set 만 전환 후보. */
async function listLocationContents(dataSource: DataSource, organizationId: string, locationId: string) {
  return dataSource.query(
    `SELECT s.id, s.name, s.description, s.status, s.updated_at AS "updatedAt",
            c.sort_order AS "sortOrder", c.is_visible AS "isVisible",
            (s.id = t.current_screen_set_id) AS "isCurrent",
            (SELECT count(*)::int FROM store_tablet_screen_blocks b WHERE b.screen_set_id = s.id) AS "blockCount"
       FROM store_tablet_corner_contents c
       JOIN store_tablets t ON t.id = c.tablet_id AND t.organization_id = c.organization_id
       JOIN store_tablet_screen_sets s ON s.id = c.screen_set_id AND s.organization_id = c.organization_id AND s.deleted_at IS NULL
      WHERE c.organization_id = $1 AND c.tablet_id = $2
      ORDER BY c.sort_order ASC, c.created_at ASC`,
    [organizationId, locationId],
  );
}

/** 빠른 상품 수정 데이터: 현재 선택 + 매장 상품 풀(이름만). 새 저장 형식 없음. */
async function loadProductListEditorData(dataSource: DataSource, organizationId: string, screenSetId: string) {
  const set = await dataSource.query(
    `SELECT id, name FROM store_tablet_screen_sets
      WHERE id = $1 AND organization_id = $2 AND origin = 'store' AND deleted_at IS NULL LIMIT 1`,
    [screenSetId, organizationId],
  );
  if (!set?.[0]) throw new ScreenSetOpsError(404, 'SCREEN_SET_NOT_FOUND', 'Screen set not found');
  const block = await dataSource.query(
    `SELECT id, config FROM store_tablet_screen_blocks
      WHERE screen_set_id = $1 AND block_type = 'product_list' ORDER BY sort_order ASC, created_at ASC LIMIT 1`,
    [screenSetId],
  );
  const selected: ProductListItem[] = block?.[0] ? readProductListSelection(block[0].config) : [];
  const [supplierProducts, localProducts] = await Promise.all([
    dataSource.query(
      `SELECT opl.id, pm.name AS "name"
         FROM organization_product_listings opl
         LEFT JOIN supplier_product_offers spo ON spo.id = opl.offer_id
         LEFT JOIN product_masters pm ON pm.id = COALESCE(spo.master_id, opl.master_id)
        WHERE opl.organization_id = $1 AND opl.is_active = true
        ORDER BY pm.name ASC, opl.created_at ASC`,
      [organizationId],
    ),
    dataSource.query(
      `SELECT id, name FROM store_local_products WHERE organization_id = $1 AND is_active = true ORDER BY sort_order ASC, name ASC`,
      [organizationId],
    ),
  ]);
  const nameOf = new Map<string, string>();
  for (const p of supplierProducts) nameOf.set(`supplier:${p.id}`, String(p.name ?? ''));
  for (const p of localProducts) nameOf.set(`local:${p.id}`, String(p.name ?? ''));
  return {
    screenSetId,
    screenSetName: set[0].name,
    blockId: block?.[0]?.id ?? null,
    hasProductListBlock: !!block?.[0],
    selected: selected.map((s) => ({ ...s, name: nameOf.get(`${s.productType}:${s.productId}`) ?? null })),
    pool: {
      supplierProducts: supplierProducts.map((p: any) => ({ productType: 'supplier', productId: p.id, name: p.name ?? '' })),
      localProducts: localProducts.map((p: any) => ({ productType: 'local', productId: p.id, name: p.name ?? '' })),
    },
  };
}

/**
 * 콘텐츠 전환(경영자 apply 와 같은 원자 규칙): 연결 보장 + current 변경. active set 만.
 * 라우터 내부 `POST /tablets/:id/current-screen-set` 과 동일 SQL — 현장 전환도 같은 불변식(current ∈ 연결)을 지킨다.
 */
async function applyLocationContent(dataSource: DataSource, organizationId: string, locationId: string, screenSetId: string) {
  const s = await dataSource.query(
    `SELECT id, status FROM store_tablet_screen_sets WHERE id = $1 AND organization_id = $2 AND origin = 'store' AND deleted_at IS NULL LIMIT 1`,
    [screenSetId, organizationId],
  );
  if (!s?.[0]) throw new ScreenSetOpsError(404, 'SCREEN_SET_NOT_FOUND', 'Screen set not found');
  if (s[0].status !== 'active') throw new ScreenSetOpsError(409, 'SCREEN_SET_NOT_ACTIVE', 'Screen set must be active to apply');
  await dataSource.transaction(async (manager) => {
    await manager.query(
      `INSERT INTO store_tablet_corner_contents (organization_id, tablet_id, screen_set_id, sort_order, is_visible)
       VALUES ($1, $2, $3, COALESCE((SELECT MAX(sort_order) + 10 FROM store_tablet_corner_contents WHERE tablet_id = $2), 0), TRUE)
       ON CONFLICT (tablet_id, screen_set_id) DO NOTHING`,
      [organizationId, locationId, screenSetId],
    );
    await manager.query(`UPDATE store_tablets SET current_screen_set_id = $1 WHERE id = $2 AND organization_id = $3`, [screenSetId, locationId, organizationId]);
  });
}

/** 폴링용 version: 위치·현재 set·set/blocks 최종 수정 시각을 합친 문자열(값이 바뀌면 재조회). */
async function computeRuntimeVersion(dataSource: DataSource, organizationId: string, locationId: string | null): Promise<{ currentScreenSetId: string | null; version: string }> {
  if (!locationId) return { currentScreenSetId: null, version: 'no-location' };
  const rows = await dataSource.query(
    `SELECT t.current_screen_set_id AS "currentScreenSetId",
            GREATEST(s.updated_at, (SELECT MAX(b.updated_at) FROM store_tablet_screen_blocks b WHERE b.screen_set_id = s.id)) AS "contentUpdatedAt",
            (SELECT count(*)::int || ':' || COALESCE(MAX(d.created_at)::text, '') FROM store_tablet_displays d WHERE d.tablet_id = t.id) AS "displaysSig"
       FROM store_tablets t
       LEFT JOIN store_tablet_screen_sets s ON s.id = t.current_screen_set_id AND s.deleted_at IS NULL
      WHERE t.id = $1 AND t.organization_id = $2 LIMIT 1`,
    [locationId, organizationId],
  );
  const r = rows?.[0];
  if (!r) return { currentScreenSetId: null, version: 'no-location' };
  const cu = r.contentUpdatedAt ? new Date(r.contentUpdatedAt).getTime() : 0;
  const du = String(r.displaysSig ?? '');
  return { currentScreenSetId: r.currentScreenSetId ?? null, version: `${locationId}:${r.currentScreenSetId ?? 'legacy'}:${cu}:${du}` };
}

// ─────────────────────────────────────────────────────────────────────────────
// 관리 라우터(/api/v1/store 및 서비스 mount) 등록
// ─────────────────────────────────────────────────────────────────────────────

type StoreHandler = (req: Request, res: Response, organizationId: string) => Promise<void>;

export function registerStoreTabletDeviceRoutes(
  router: Router,
  deps: {
    dataSource: DataSource;
    withStoreAuth: (handler: StoreHandler) => (req: Request, res: Response) => Promise<void>;
    getRequireAuth: () => Promise<import('express').RequestHandler>;
    storeOwnerServiceKey?: StoreOwnerServiceKey;
  },
): void {
  const { dataSource, withStoreAuth, getRequireAuth } = deps;

  // ─── 경영자: 실제 태블릿 관리 ───────────────────────────────────────────────

  router.get('/tablet-devices', withStoreAuth(async (_req, res, organizationId) => {
    try {
      const rows: DeviceRow[] = await dataSource.query(
        `SELECT ${deviceCols('d.')}, t.name AS "locationName", t.location AS "locationCode"
           FROM store_tablet_devices d
           LEFT JOIN store_tablets t ON t.id = d.current_location_id
          WHERE d.organization_id = $1
            AND (d.device_token_hash IS NOT NULL OR d.pairing_expires_at > NOW())
          ORDER BY d.created_at ASC`,
        [organizationId],
      );
      res.json({ success: true, data: rows });
    } catch (error) {
      respondOpsError(res, error, 'Failed to list tablet devices');
    }
  }));

  router.post('/tablets/:id/pairing-codes', withStoreAuth(async (req, res, organizationId) => {
    try {
      const locationId = req.params.id;
      const t = await dataSource.query(`SELECT id, name, location FROM store_tablets WHERE id = $1 AND organization_id = $2 AND is_active = TRUE LIMIT 1`, [locationId, organizationId]);
      if (!t?.[0]) { res.status(404).json({ success: false, error: 'Location not found', code: 'LOCATION_NOT_FOUND' }); return; }
      // 만료된 미연결 코드 row 정리(이 매장 것만). 연결 완료 기기는 건드리지 않는다.
      await dataSource.query(
        `DELETE FROM store_tablet_devices WHERE organization_id = $1 AND device_token_hash IS NULL AND pairing_expires_at IS NOT NULL AND pairing_expires_at < NOW()`,
        [organizationId],
      );
      let code = '';
      let row: any = null;
      for (let attempt = 0; attempt < 5 && !row; attempt += 1) {
        code = generatePairingCode();
        const dup = await dataSource.query(`SELECT 1 FROM store_tablet_devices WHERE pairing_code = $1 AND pairing_expires_at > NOW() LIMIT 1`, [code]);
        if (dup?.[0]) continue;
        const defaultName = String(t[0].location || t[0].name || '태블릿').slice(0, 90) + ' 태블릿';
        const ins = await dataSource.query(
          `INSERT INTO store_tablet_devices (organization_id, name, current_location_id, pairing_code, pairing_expires_at, is_active)
           VALUES ($1, $2, $3, $4, NOW() + ($5::int * interval '1 millisecond'), FALSE)
           RETURNING ${deviceCols('')}`,
          [organizationId, defaultName, locationId, code, PAIRING_TTL_MS],
        );
        row = ins?.[0] ?? null;
      }
      if (!row) { res.status(503).json({ success: false, error: 'Failed to allocate pairing code', code: 'PAIRING_CODE_UNAVAILABLE' }); return; }
      res.status(201).json({ success: true, data: { code, expiresAt: row.pairingExpiresAt, deviceId: row.id, locationId } });
    } catch (error) {
      respondOpsError(res, error, 'Failed to create pairing code');
    }
  }));

  router.patch('/tablet-devices/:id', withStoreAuth(async (req, res, organizationId) => {
    try {
      const id = req.params.id;
      const sets: string[] = [];
      const params: any[] = [];
      if (typeof req.body?.name === 'string') {
        const nm = req.body.name.trim();
        if (!nm || nm.length > 100) { res.status(400).json({ success: false, error: 'invalid name', code: 'VALIDATION_ERROR' }); return; }
        params.push(nm); sets.push(`name = $${params.length}`);
      }
      if (req.body?.currentLocationId !== undefined) {
        const lid: string | null = req.body.currentLocationId == null ? null : String(req.body.currentLocationId);
        if (lid) {
          const t = await dataSource.query(`SELECT id FROM store_tablets WHERE id = $1 AND organization_id = $2 AND is_active = TRUE LIMIT 1`, [lid, organizationId]);
          if (!t?.[0]) { res.status(400).json({ success: false, error: 'Location not found in this store', code: 'INVALID_LOCATION' }); return; }
        }
        params.push(lid); sets.push(`current_location_id = $${params.length}`);
      }
      if (typeof req.body?.isActive === 'boolean') { params.push(req.body.isActive); sets.push(`is_active = $${params.length}`); }
      if (sets.length === 0) { res.status(400).json({ success: false, error: 'no fields to update', code: 'VALIDATION_ERROR' }); return; }
      sets.push('updated_at = NOW()');
      params.push(id); params.push(organizationId);
      const upd = await dataSource.query(
        `UPDATE store_tablet_devices SET ${sets.join(', ')} WHERE id = $${params.length - 1} AND organization_id = $${params.length} RETURNING ${deviceCols('')}`,
        params,
      );
      const rows = Array.isArray(upd?.[0]) ? upd[0] : upd;
      if (!rows?.[0]) { res.status(404).json({ success: false, error: 'Device not found', code: 'DEVICE_NOT_FOUND' }); return; }
      res.json({ success: true, data: rows[0] });
    } catch (error) {
      respondOpsError(res, error, 'Failed to update tablet device');
    }
  }));

  router.delete('/tablet-devices/:id', withStoreAuth(async (req, res, organizationId) => {
    try {
      const upd = await dataSource.query(
        `UPDATE store_tablet_devices SET is_active = FALSE, device_token_hash = NULL, pairing_code = NULL, pairing_expires_at = NULL, updated_at = NOW()
          WHERE id = $1 AND organization_id = $2 RETURNING id`,
        [req.params.id, organizationId],
      );
      const rows = Array.isArray(upd?.[0]) ? upd[0] : upd;
      if (!rows?.[0]) { res.status(404).json({ success: false, error: 'Device not found', code: 'DEVICE_NOT_FOUND' }); return; }
      res.json({ success: true, data: { id: req.params.id, isActive: false } });
    } catch (error) {
      respondOpsError(res, error, 'Failed to disconnect tablet device');
    }
  }));

  // 경영자용 빠른 상품 수정(같은 helper — 권한만 다름)
  router.get('/screen-sets/:id/product-list', withStoreAuth(async (req, res, organizationId) => {
    try {
      res.json({ success: true, data: await loadProductListEditorData(dataSource, organizationId, req.params.id) });
    } catch (error) {
      respondOpsError(res, error, 'Failed to load product list');
    }
  }));
  router.put('/screen-sets/:id/product-list', withStoreAuth(async (req, res, organizationId) => {
    try {
      const products = normalizeProductListInput(req.body?.products);
      res.json({ success: true, data: await applyScreenSetProductList(dataSource, organizationId, req.params.id, products) });
    } catch (error) {
      respondOpsError(res, error, 'Failed to update product list');
    }
  }));

  // ─── 현장 직원 runtime ───────────────────────────────────────────────────────

  type RuntimeCtx = { userId: string; device: DeviceRow };
  type RuntimeHandler = (req: Request, res: Response, ctx: RuntimeCtx) => Promise<void>;

  /**
   * 직원 권한 게이트: 기존 로그인(requireAuth) → 기기 토큰(헤더) → 기기의 매장에 대한 멤버십.
   *   membership = organization_members(owner/admin/manager, left_at IS NULL) OR 그 매장 store_owner.
   *   store_owner 전용 withStoreAuth 를 넓히지 않는다(§ 직원은 상품/매장 설정 전체 권한 없음).
   */
  function withTabletRuntimeAuth(handler: RuntimeHandler) {
    return async (req: Request, res: Response): Promise<void> => {
      try {
        const auth = await getRequireAuth();
        await new Promise<void>((resolve, reject) => { (auth as any)(req, res, (err: any) => (err ? reject(err) : resolve())); });
      } catch { return; }
      if (res.headersSent) return;
      const userId: string | undefined = (req as any).user?.id;
      if (!userId) { res.status(401).json({ success: false, error: 'Authentication required', code: 'UNAUTHORIZED' }); return; }
      const rawToken = req.header(TABLET_DEVICE_TOKEN_HEADER);
      if (!rawToken || typeof rawToken !== 'string' || rawToken.length < 16 || rawToken.length > 256) {
        res.status(400).json({ success: false, error: 'Tablet device token required', code: 'DEVICE_TOKEN_REQUIRED' }); return;
      }
      const dev: DeviceRow[] = await dataSource.query(
        `SELECT ${deviceCols('')} FROM store_tablet_devices WHERE device_token_hash = $1 AND is_active = TRUE LIMIT 1`,
        [hashDeviceToken(rawToken)],
      );
      const device = dev?.[0];
      if (!device) { res.status(401).json({ success: false, error: 'Tablet device not connected', code: 'DEVICE_NOT_CONNECTED' }); return; }
      const member = await dataSource.query(
        `SELECT 1 FROM organization_members WHERE user_id = $1 AND organization_id = $2 AND role IN ('owner','admin','manager') AND left_at IS NULL LIMIT 1`,
        [userId, device.organizationId],
      );
      let allowed = !!member?.[0];
      if (!allowed) {
        try {
          const owner = await isStoreOwner(dataSource, userId, deps.storeOwnerServiceKey);
          allowed = owner.isOwner && owner.organizationId === device.organizationId;
        } catch { allowed = false; }
      }
      if (!allowed) { res.status(403).json({ success: false, error: '이 매장의 직원 권한이 없습니다.', code: 'STORE_STAFF_FORBIDDEN' }); return; }
      await handler(req, res, { userId, device });
    };
  }

  async function runtimeSnapshot(device: DeviceRow) {
    const org = device.organizationId;
    const [locations, contents, staff] = await Promise.all([
      listLocations(dataSource, org),
      device.currentLocationId ? listLocationContents(dataSource, org, device.currentLocationId) : Promise.resolve([]),
      dataSource.query(`SELECT name FROM organizations WHERE id = $1 LIMIT 1`, [org]),
    ]);
    const location = device.currentLocationId ? (locations as any[]).find((l) => l.id === device.currentLocationId) ?? null : null;
    const current = location?.currentScreenSetId ? (contents as any[]).find((c) => c.id === location.currentScreenSetId) ?? null : null;
    return {
      device: { id: device.id, name: device.name, lastSeenAt: device.lastSeenAt, isActive: device.isActive },
      store: { organizationId: org, name: staff?.[0]?.name ?? null },
      location,
      currentScreenSet: current ? { id: current.id, name: current.name, description: current.description } : null,
      locations,
      contents,
    };
  }

  router.get('/tablet-runtime/device', withTabletRuntimeAuth(async (_req, res, ctx) => {
    try { res.json({ success: true, data: await runtimeSnapshot(ctx.device) }); }
    catch (error) { respondOpsError(res, error, 'Failed to load tablet runtime'); }
  }));

  router.get('/tablet-runtime/locations', withTabletRuntimeAuth(async (_req, res, ctx) => {
    try { res.json({ success: true, data: await listLocations(dataSource, ctx.device.organizationId) }); }
    catch (error) { respondOpsError(res, error, 'Failed to list locations'); }
  }));

  router.get('/tablet-runtime/locations/:id/contents', withTabletRuntimeAuth(async (req, res, ctx) => {
    try {
      const t = await dataSource.query(`SELECT id FROM store_tablets WHERE id = $1 AND organization_id = $2 AND is_active = TRUE LIMIT 1`, [req.params.id, ctx.device.organizationId]);
      if (!t?.[0]) { res.status(404).json({ success: false, error: 'Location not found', code: 'LOCATION_NOT_FOUND' }); return; }
      res.json({ success: true, data: await listLocationContents(dataSource, ctx.device.organizationId, req.params.id) });
    } catch (error) { respondOpsError(res, error, 'Failed to list location contents'); }
  }));

  router.post('/tablet-runtime/devices/:id/location', withTabletRuntimeAuth(async (req, res, ctx) => {
    try {
      if (req.params.id !== ctx.device.id) { res.status(403).json({ success: false, error: 'Device mismatch', code: 'DEVICE_MISMATCH' }); return; }
      const locationId = req.body?.locationId;
      if (typeof locationId !== 'string' || !UUID_RE.test(locationId)) { res.status(400).json({ success: false, error: 'locationId is required', code: 'VALIDATION_ERROR' }); return; }
      const t = await dataSource.query(`SELECT id FROM store_tablets WHERE id = $1 AND organization_id = $2 AND is_active = TRUE LIMIT 1`, [locationId, ctx.device.organizationId]);
      if (!t?.[0]) { res.status(404).json({ success: false, error: 'Location not found', code: 'LOCATION_NOT_FOUND' }); return; }
      // 이동 = 기기의 current_location_id 만 변경. 위치·콘텐츠·연결은 무변경.
      await dataSource.query(`UPDATE store_tablet_devices SET current_location_id = $1, updated_at = NOW() WHERE id = $2 AND organization_id = $3`, [locationId, ctx.device.id, ctx.device.organizationId]);
      res.json({ success: true, data: await runtimeSnapshot({ ...ctx.device, currentLocationId: locationId }) });
    } catch (error) { respondOpsError(res, error, 'Failed to move device'); }
  }));

  router.post('/tablet-runtime/devices/:id/content', withTabletRuntimeAuth(async (req, res, ctx) => {
    try {
      if (req.params.id !== ctx.device.id) { res.status(403).json({ success: false, error: 'Device mismatch', code: 'DEVICE_MISMATCH' }); return; }
      if (!ctx.device.currentLocationId) { res.status(409).json({ success: false, error: '먼저 이 태블릿의 위치를 지정해 주세요.', code: 'DEVICE_NO_LOCATION' }); return; }
      const screenSetId = req.body?.screenSetId;
      if (typeof screenSetId !== 'string' || !UUID_RE.test(screenSetId)) { res.status(400).json({ success: false, error: 'screenSetId is required', code: 'VALIDATION_ERROR' }); return; }
      await applyLocationContent(dataSource, ctx.device.organizationId, ctx.device.currentLocationId, screenSetId);
      res.json({ success: true, data: await runtimeSnapshot(ctx.device) });
    } catch (error) { respondOpsError(res, error, 'Failed to switch content'); }
  }));

  router.get('/tablet-runtime/screen-sets/:id/product-list', withTabletRuntimeAuth(async (req, res, ctx) => {
    try { res.json({ success: true, data: await loadProductListEditorData(dataSource, ctx.device.organizationId, req.params.id) }); }
    catch (error) { respondOpsError(res, error, 'Failed to load product list'); }
  }));

  router.put('/tablet-runtime/screen-sets/:id/product-list', withTabletRuntimeAuth(async (req, res, ctx) => {
    try {
      const products = normalizeProductListInput(req.body?.products);
      res.json({ success: true, data: await applyScreenSetProductList(dataSource, ctx.device.organizationId, req.params.id, products) });
    } catch (error) { respondOpsError(res, error, 'Failed to update product list'); }
  }));
}

// ─────────────────────────────────────────────────────────────────────────────
// 공개(기기) 라우터 — /api/v1/stores 에 mount
// ─────────────────────────────────────────────────────────────────────────────

const pairingLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 20,
  message: { success: false, error: '요청이 너무 많습니다. 잠시 후 다시 시도해주세요.', code: 'RATE_LIMIT_EXCEEDED' },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req: any) => getTrustedClientIp(req),
});

async function findPendingByCode(dataSource: DataSource, code: string) {
  const rows = await dataSource.query(
    `SELECT d.id, d.organization_id AS "organizationId", d.current_location_id AS "currentLocationId", d.pairing_expires_at AS "pairingExpiresAt",
            o.name AS "storeName", ps.slug AS "storeSlug", ps.service_key AS "serviceKey"
       FROM store_tablet_devices d
       JOIN organizations o ON o.id = d.organization_id
       LEFT JOIN LATERAL (
         SELECT slug, service_key FROM platform_store_slugs
          WHERE store_id = d.organization_id AND is_active = TRUE
          ORDER BY updated_at DESC NULLS LAST LIMIT 1
       ) ps ON TRUE
      WHERE d.pairing_code = $1 AND d.device_token_hash IS NULL AND d.pairing_expires_at > NOW()
      LIMIT 1`,
    [code],
  );
  return rows?.[0] ?? null;
}

export function createStorePublicTabletDeviceRoutes(deps: { dataSource: DataSource }): Router {
  const router = Router();
  const { dataSource } = deps;

  const readCode = (req: Request): string | null => {
    const raw = typeof req.body?.code === 'string' ? req.body.code.replace(/\D/g, '') : '';
    return raw.length === 6 ? raw : null;
  };

  // POST /tablet-pairing/lookup — 코드 확인(상태 변경 없음): 매장 이름·위치 목록 → 화면에서 "이 매장이 맞나요?"
  router.post('/tablet-pairing/lookup', pairingLimiter as any, async (req: Request, res: Response): Promise<void> => {
    try {
      const code = readCode(req);
      if (!code) { res.status(400).json({ success: false, error: '6자리 연결 코드를 입력해 주세요.', code: 'VALIDATION_ERROR' }); return; }
      const pending = await findPendingByCode(dataSource, code);
      if (!pending) { res.status(404).json({ success: false, error: '유효하지 않거나 만료된 코드입니다.', code: 'PAIRING_CODE_INVALID' }); return; }
      if (!pending.storeSlug) { res.status(409).json({ success: false, error: '이 매장은 공개 태블릿 주소(slug)가 없어 연결할 수 없습니다.', code: 'STORE_SLUG_MISSING' }); return; }
      const locations = await listLocations(dataSource, pending.organizationId);
      res.json({
        success: true,
        data: {
          storeName: pending.storeName,
          storeSlug: pending.storeSlug,
          serviceKey: pending.serviceKey,
          defaultLocationId: pending.currentLocationId,
          expiresAt: pending.pairingExpiresAt,
          locations: (locations as any[]).map((l) => ({ id: l.id, name: l.name, location: l.location })),
        },
      });
    } catch (error) {
      respondOpsError(res, error, 'Failed to lookup pairing code');
    }
  });

  // POST /tablet-pairing/claim — 코드 사용: 기기 이름·위치 확정 + 토큰 발급(원문은 응답에만, 서버는 hash 저장)
  router.post('/tablet-pairing/claim', pairingLimiter as any, async (req: Request, res: Response): Promise<void> => {
    try {
      const code = readCode(req);
      if (!code) { res.status(400).json({ success: false, error: '6자리 연결 코드를 입력해 주세요.', code: 'VALIDATION_ERROR' }); return; }
      const deviceName = typeof req.body?.deviceName === 'string' ? req.body.deviceName.trim().slice(0, 100) : '';
      const requestedLocation = typeof req.body?.locationId === 'string' && UUID_RE.test(req.body.locationId) ? req.body.locationId : null;
      const pending = await findPendingByCode(dataSource, code);
      if (!pending) { res.status(404).json({ success: false, error: '유효하지 않거나 만료된 코드입니다.', code: 'PAIRING_CODE_INVALID' }); return; }
      if (!pending.storeSlug) { res.status(409).json({ success: false, error: '이 매장은 공개 태블릿 주소(slug)가 없어 연결할 수 없습니다.', code: 'STORE_SLUG_MISSING' }); return; }
      let locationId: string | null = pending.currentLocationId ?? null;
      if (requestedLocation) {
        const t = await dataSource.query(`SELECT id FROM store_tablets WHERE id = $1 AND organization_id = $2 AND is_active = TRUE LIMIT 1`, [requestedLocation, pending.organizationId]);
        if (!t?.[0]) { res.status(400).json({ success: false, error: 'Location not found in this store', code: 'INVALID_LOCATION' }); return; }
        locationId = requestedLocation;
      }
      const token = crypto.randomBytes(32).toString('hex');
      const upd = await dataSource.query(
        `UPDATE store_tablet_devices
            SET device_token_hash = $1, pairing_code = NULL, pairing_expires_at = NULL, is_active = TRUE,
                name = CASE WHEN $2 <> '' THEN $2 ELSE name END,
                current_location_id = $3, last_seen_at = NOW(), updated_at = NOW()
          WHERE id = $4 AND device_token_hash IS NULL AND pairing_code = $5 AND pairing_expires_at > NOW()
          RETURNING ${deviceCols('')}`,
        [hashDeviceToken(token), deviceName, locationId, pending.id, code],
      );
      const rows = Array.isArray(upd?.[0]) ? upd[0] : upd;
      if (!rows?.[0]) { res.status(409).json({ success: false, error: '코드가 이미 사용되었습니다. 새 코드를 발급받아 주세요.', code: 'PAIRING_CODE_CONSUMED' }); return; }
      res.status(201).json({
        success: true,
        data: { deviceToken: token, deviceId: rows[0].id, deviceName: rows[0].name, storeSlug: pending.storeSlug, storeName: pending.storeName, locationId },
      });
    } catch (error) {
      respondOpsError(res, error, 'Failed to claim pairing code');
    }
  });

  // POST /:slug/tablet/device/heartbeat — 기기 폴링(10~30s): 현재 위치/콘텐츠/version + last_seen_at 갱신
  router.post('/:slug/tablet/device/heartbeat', async (req: Request, res: Response): Promise<void> => {
    try {
      const rawToken = req.header(TABLET_DEVICE_TOKEN_HEADER);
      if (!rawToken || rawToken.length < 16 || rawToken.length > 256) { res.status(401).json({ success: false, error: 'Device token required', code: 'DEVICE_TOKEN_REQUIRED' }); return; }
      const upd = await dataSource.query(
        `UPDATE store_tablet_devices d SET last_seen_at = NOW()
          WHERE d.device_token_hash = $1 AND d.is_active = TRUE
            AND EXISTS (SELECT 1 FROM platform_store_slugs ps WHERE ps.store_id = d.organization_id AND ps.slug = $2 AND ps.is_active = TRUE)
          RETURNING ${deviceCols('d.')}`,
        [hashDeviceToken(rawToken), req.params.slug],
      );
      const rows: DeviceRow[] = Array.isArray(upd?.[0]) ? upd[0] : upd;
      const device = rows?.[0];
      if (!device) { res.status(401).json({ success: false, error: 'Tablet device not connected', code: 'DEVICE_NOT_CONNECTED' }); return; }
      let location: any = null;
      if (device.currentLocationId) {
        const l = await dataSource.query(`SELECT id, name, location FROM store_tablets WHERE id = $1 AND organization_id = $2 AND is_active = TRUE LIMIT 1`, [device.currentLocationId, device.organizationId]);
        location = l?.[0] ?? null;
      }
      const ver = await computeRuntimeVersion(dataSource, device.organizationId, location?.id ?? null);
      res.json({
        success: true,
        data: {
          deviceId: device.id,
          deviceName: device.name,
          locationId: location?.id ?? null,
          location,
          currentScreenSetId: ver.currentScreenSetId,
          version: ver.version,
        },
      });
    } catch (error) {
      respondOpsError(res, error, 'Failed to heartbeat');
    }
  });

  return router;
}

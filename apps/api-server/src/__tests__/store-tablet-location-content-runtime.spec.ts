/**
 * WO-O4O-STORE-TABLET-LOCATION-CONTENT-RUNTIME-MANAGEMENT-V1
 *
 * 위치 ≠ 실제 태블릿 ≠ 콘텐츠 세 축 runtime 계약 (DB 없이 DataSource.query stub).
 *  - 연결 코드(lookup/claim): 원문 토큰은 응답에만, 서버 저장은 sha256 hash.
 *  - heartbeat: 토큰 불일치 401 · 일치 시 위치/현재 콘텐츠/version.
 *  - 직원 runtime 게이트: 로그인 + 기기 토큰 + 그 매장 organization_members(owner/admin/manager).
 *    store_owner 가 아닌 manager 도 통과, 무관 사용자는 403. 기기 불일치 403.
 *  - 위치 이동 = store_tablet_devices.current_location_id 만 UPDATE.
 *  - 콘텐츠 전환 = active set 만 · 연결 보장 + current 변경.
 *  - 빠른 상품 수정: canonical product_list config 만 갱신 · 매장 밖 상품 400.
 *  - 복제: 새 row draft · blocks 복사 · 위치 연결/current 미복사.
 */

import express from 'express';
import request from 'supertest';
import crypto from 'crypto';

let CURRENT_USER: { id: string; roles: string[]; memberships: any[] } | null = { id: 'user-manager', roles: [], memberships: [] };

jest.mock('../middleware/auth.middleware.js', () => ({
  requireAuth: (req: any, res: any, next: any) => {
    if (!CURRENT_USER) { res.status(401).json({ success: false, code: 'UNAUTHORIZED' }); return; }
    req.user = CURRENT_USER;
    next();
  },
}));

import { createStoreTabletRoutes } from '../routes/platform/store-tablet.routes.js';
import { createStorePublicTabletDeviceRoutes, hashDeviceToken } from '../routes/platform/store-tablet-device.routes.js';
import { normalizeProductListInput, applyScreenSetProductList, ScreenSetOpsError } from '../routes/platform/store-tablet-screen-set-ops.js';

const ORG = '11111111-1111-4111-8111-111111111111';
const LOC_A = '22222222-2222-4222-8222-222222222222';
const LOC_B = '33333333-3333-4333-8333-333333333333';
const SET_ACTIVE = '44444444-4444-4444-8444-444444444444';
const SET_DRAFT = '55555555-5555-4555-8555-555555555555';
const DEVICE_ID = '66666666-6666-4666-8666-666666666666';
const RAW_TOKEN = 'a'.repeat(64);
const TOKEN_HASH = hashDeviceToken(RAW_TOKEN);

type State = {
  device: { id: string; organization_id: string; name: string; current_location_id: string | null; device_token_hash: string | null; pairing_code: string | null; pairing_expired: boolean; is_active: boolean };
  members: Array<{ user_id: string; organization_id: string; role: string }>;
  calls: Array<{ sql: string; params: any[] }>;
};

function makeState(): State {
  return {
    device: { id: DEVICE_ID, organization_id: ORG, name: 'A-01 태블릿', current_location_id: LOC_A, device_token_hash: TOKEN_HASH, pairing_code: null, pairing_expired: false, is_active: true },
    members: [{ user_id: 'user-manager', organization_id: ORG, role: 'manager' }],
    calls: [],
  };
}

const deviceRow = (d: State['device']) => ({
  id: d.id, organizationId: d.organization_id, name: d.name, currentLocationId: d.current_location_id,
  lastSeenAt: null, isActive: d.is_active, createdAt: 'x', updatedAt: 'x', pairingPending: d.device_token_hash == null, pairingExpiresAt: null,
});

function makeDataSource(state: State) {
  const query = jest.fn(async (sql: string, params: any[] = []) => {
    state.calls.push({ sql, params });
    const s = sql.replace(/\s+/g, ' ');
    // ── 기기 ──
    if (s.includes('FROM store_tablet_devices') && s.includes('device_token_hash = $1')) {
      const d = state.device;
      return d.device_token_hash === params[0] && d.is_active ? [deviceRow(d)] : [];
    }
    if (s.startsWith('UPDATE store_tablet_devices d SET last_seen_at')) {
      const d = state.device;
      return d.device_token_hash === params[0] && d.is_active && params[1] === 'demo-store' ? [deviceRow(d)] : [];
    }
    if (s.includes('FROM store_tablet_devices d JOIN organizations o')) {
      const d = state.device;
      if (d.pairing_code === params[0] && d.device_token_hash == null && !d.pairing_expired) {
        return [{ id: d.id, organizationId: ORG, currentLocationId: d.current_location_id, pairingExpiresAt: 'later', storeName: '데모약국', storeSlug: 'demo-store', serviceKey: 'kpa' }];
      }
      return [];
    }
    if (s.startsWith('UPDATE store_tablet_devices SET device_token_hash = $1')) {
      const d = state.device;
      if (d.id === params[3] && d.device_token_hash == null && d.pairing_code === params[4]) {
        d.device_token_hash = params[0]; d.pairing_code = null; d.is_active = true;
        if (params[1]) d.name = params[1];
        d.current_location_id = params[2];
        return [deviceRow(d)];
      }
      return [];
    }
    if (s.startsWith('UPDATE store_tablet_devices SET current_location_id = $1')) {
      if (state.device.id === params[1] && state.device.organization_id === params[2]) state.device.current_location_id = params[0];
      return [];
    }
    if (s.includes('SELECT 1 FROM store_tablet_devices WHERE pairing_code')) return [];
    if (s.startsWith('DELETE FROM store_tablet_devices')) return [];
    if (s.startsWith('INSERT INTO store_tablet_devices')) {
      state.device = { id: DEVICE_ID, organization_id: params[0], name: params[1], current_location_id: params[2], device_token_hash: null, pairing_code: params[3], pairing_expired: false, is_active: false };
      return [{ ...deviceRow(state.device), pairingExpiresAt: 'later' }];
    }
    // ── 권한 ──
    if (s.includes('FROM organization_members WHERE user_id = $1 AND organization_id = $2')) {
      return state.members.some((m) => m.user_id === params[0] && m.organization_id === params[1] && ['owner', 'admin', 'manager'].includes(m.role)) ? [{ '?column?': 1 }] : [];
    }
    if (s.includes('role_assignments')) return [];
    if (s.includes('service_memberships')) return [];
    if (s.includes('organization_service_enrollments')) return [];
    if (s.includes('FROM organization_members')) return []; // store-owner resolver back-compat
    if (s.includes('FROM organizations WHERE id')) return [{ name: '데모약국' }];
    // ── 위치 / 콘텐츠 ──
    if (s.includes('FROM store_tablets t LEFT JOIN store_tablet_screen_sets s')) {
      return [
        { id: LOC_A, name: '입구 진열대', location: 'A-01', currentScreenSetId: SET_ACTIVE, currentScreenSetName: '봄 프로모션', deviceCount: 1 },
        { id: LOC_B, name: '카운터', location: 'B-01', currentScreenSetId: null, currentScreenSetName: null, deviceCount: 0 },
      ];
    }
    if (s.includes('FROM store_tablets WHERE id = $1 AND organization_id = $2')) {
      return [LOC_A, LOC_B].includes(params[0]) && params[1] === ORG ? [{ id: params[0], name: 'n', location: 'A-01' }] : [];
    }
    if (s.includes('FROM store_tablet_corner_contents c')) {
      if (params[1] !== LOC_A) return [];
      return [
        { id: SET_ACTIVE, name: '봄 프로모션', description: '입구용', status: 'active', updatedAt: 'x', sortOrder: 0, isVisible: true, isCurrent: true, blockCount: 3 },
        { id: SET_DRAFT, name: '초안', description: null, status: 'draft', updatedAt: 'x', sortOrder: 10, isVisible: true, isCurrent: false, blockCount: 1 },
      ];
    }
    if (s.includes('SELECT id, status FROM store_tablet_screen_sets')) {
      if (params[0] === SET_ACTIVE) return [{ id: SET_ACTIVE, status: 'active' }];
      if (params[0] === SET_DRAFT) return [{ id: SET_DRAFT, status: 'draft' }];
      return [];
    }
    if (s.includes('SELECT id FROM store_tablet_screen_sets') || s.includes('SELECT id, name FROM store_tablet_screen_sets')) {
      return [SET_ACTIVE, SET_DRAFT].includes(params[0]) && params[1] === ORG ? [{ id: params[0], name: 'set' }] : [];
    }
    if (s.includes('SELECT id, name, description, template_key AS "templateKey" FROM store_tablet_screen_sets')) {
      return params[0] === SET_ACTIVE ? [{ id: SET_ACTIVE, name: '봄 프로모션', description: '입구용', templateKey: null }] : [];
    }
    if (s.startsWith('INSERT INTO store_tablet_screen_sets')) {
      return [{ id: '77777777-7777-4777-8777-777777777777', name: params[1], description: params[2], status: 'draft', origin: 'store', publicQrSlug: null }];
    }
    if (s.includes('FROM store_tablets t LEFT JOIN store_tablet_screen_sets s ON s.id = t.current_screen_set_id AND s.deleted_at IS NULL WHERE t.id = $1')) {
      return [{ currentScreenSetId: SET_ACTIVE, contentUpdatedAt: '2026-09-15T00:00:00Z', displaysSig: '0:' }];
    }
    if (s.includes('GREATEST(s.updated_at')) {
      return [{ currentScreenSetId: SET_ACTIVE, contentUpdatedAt: '2026-09-15T00:00:00Z', displaysSig: '0:' }];
    }
    // ── product_list ──
    if (s.includes('FROM store_tablet_screen_blocks WHERE screen_set_id = $1 AND block_type = \'product_list\'')) {
      return [{ id: 'blk-1', config: { source: 'selected_products', products: [{ productType: 'supplier', productId: '88888888-8888-4888-8888-888888888888' }] } }];
    }
    if (s.includes('FROM organization_product_listings WHERE organization_id = $1 AND id = ANY')) {
      return (params[1] as string[]).filter((id) => id === '88888888-8888-4888-8888-888888888888').map((id) => ({ id }));
    }
    if (s.includes('FROM store_local_products WHERE organization_id = $1 AND id = ANY')) return [];
    if (s.includes('FROM organization_product_listings opl')) return [{ id: '88888888-8888-4888-8888-888888888888', name: '비타민C' }];
    if (s.includes('FROM store_local_products')) return [];
    if (s.includes('store_qr_codes') || s.includes('platform_store_slugs')) return [];
    return [];
  });
  const dataSource: any = {
    query,
    transaction: async (fn: (m: any) => Promise<void>) => fn({ query }),
  };
  return dataSource;
}

function makeApps(state: State) {
  const dataSource = makeDataSource(state);
  const app = express();
  app.use(express.json());
  app.use('/store', createStoreTabletRoutes(dataSource, { storeOwnerServiceKey: 'kpa' }));
  app.use('/stores', createStorePublicTabletDeviceRoutes({ dataSource }));
  return { app, dataSource };
}

const hdr = (token = RAW_TOKEN) => ({ 'x-tablet-device-token': token });

beforeEach(() => { CURRENT_USER = { id: 'user-manager', roles: [], memberships: [] }; });

describe('연결 코드(pairing) — 공개 기기 경로', () => {
  it('lookup: 유효하지 않은 코드 → 404 PAIRING_CODE_INVALID', async () => {
    const state = makeState();
    const { app } = makeApps(state);
    const res = await request(app).post('/stores/tablet-pairing/lookup').send({ code: '000000' });
    expect(res.status).toBe(404);
    expect(res.body.code).toBe('PAIRING_CODE_INVALID');
  });

  it('lookup → claim: 매장 확인 후 토큰 발급, 서버에는 sha256 hash 만 저장', async () => {
    const state = makeState();
    state.device = { ...state.device, device_token_hash: null, pairing_code: '123456', is_active: false };
    const { app } = makeApps(state);
    const look = await request(app).post('/stores/tablet-pairing/lookup').send({ code: '123-456' });
    expect(look.status).toBe(200);
    expect(look.body.data.storeSlug).toBe('demo-store');
    expect(look.body.data.defaultLocationId).toBe(LOC_A);
    expect(look.body.data.locations).toHaveLength(2);

    const claim = await request(app).post('/stores/tablet-pairing/claim').send({ code: '123456', deviceName: '입구 태블릿', locationId: LOC_B });
    expect(claim.status).toBe(201);
    const token: string = claim.body.data.deviceToken;
    expect(token).toHaveLength(64);
    expect(state.device.device_token_hash).toBe(crypto.createHash('sha256').update(token).digest('hex'));
    expect(state.device.pairing_code).toBeNull();
    expect(state.device.current_location_id).toBe(LOC_B);
    expect(state.device.name).toBe('입구 태블릿');

    // 같은 코드 재사용 불가
    const again = await request(app).post('/stores/tablet-pairing/claim').send({ code: '123456' });
    expect(again.status).toBe(404);
  });

  it('heartbeat: 토큰 불일치 401 · 일치 시 위치/현재 콘텐츠/version', async () => {
    const state = makeState();
    const { app } = makeApps(state);
    const bad = await request(app).post('/stores/demo-store/tablet/device/heartbeat').set(hdr('b'.repeat(64)));
    expect(bad.status).toBe(401);
    expect(bad.body.code).toBe('DEVICE_NOT_CONNECTED');
    const ok = await request(app).post('/stores/demo-store/tablet/device/heartbeat').set(hdr());
    expect(ok.status).toBe(200);
    expect(ok.body.data.locationId).toBe(LOC_A);
    expect(ok.body.data.currentScreenSetId).toBe(SET_ACTIVE);
    expect(ok.body.data.version).toContain(SET_ACTIVE);
    // 다른 매장 slug 로는 해석되지 않는다
    const other = await request(app).post('/stores/other-store/tablet/device/heartbeat').set(hdr());
    expect(other.status).toBe(401);
  });
});

describe('직원 runtime 게이트 — 기존 로그인 + 기기 토큰 + 조직 멤버십', () => {
  it('미로그인 401 · 토큰 없음 400 · 무관 사용자 403 · manager 200', async () => {
    const state = makeState();
    const { app } = makeApps(state);
    CURRENT_USER = null;
    expect((await request(app).get('/store/tablet-runtime/device').set(hdr())).status).toBe(401);
    CURRENT_USER = { id: 'user-manager', roles: [], memberships: [] };
    const noTok = await request(app).get('/store/tablet-runtime/device');
    expect(noTok.status).toBe(400);
    expect(noTok.body.code).toBe('DEVICE_TOKEN_REQUIRED');
    CURRENT_USER = { id: 'user-stranger', roles: [], memberships: [] };
    const forbidden = await request(app).get('/store/tablet-runtime/device').set(hdr());
    expect(forbidden.status).toBe(403);
    expect(forbidden.body.code).toBe('STORE_STAFF_FORBIDDEN');
    CURRENT_USER = { id: 'user-manager', roles: [], memberships: [] };
    const ok = await request(app).get('/store/tablet-runtime/device').set(hdr());
    expect(ok.status).toBe(200);
    expect(ok.body.data.device.id).toBe(DEVICE_ID);
    expect(ok.body.data.location.id).toBe(LOC_A);
    expect(ok.body.data.currentScreenSet).toEqual({ id: SET_ACTIVE, name: '봄 프로모션', description: '입구용' });
    expect(ok.body.data.locations).toHaveLength(2);
    expect(ok.body.data.contents.map((c: any) => c.id)).toEqual([SET_ACTIVE, SET_DRAFT]);
  });

  it('manager 는 경영자 전용 매장 API(withStoreAuth)에는 들어갈 수 없다', async () => {
    const state = makeState();
    const { app } = makeApps(state);
    const res = await request(app).get('/store/tablets');
    expect(res.status).toBe(403);
  });

  it('위치 이동: 기기 current_location_id 만 바뀐다 · 기기 불일치 403', async () => {
    const state = makeState();
    const { app } = makeApps(state);
    const mismatch = await request(app).post(`/store/tablet-runtime/devices/${LOC_A}/location`).set(hdr()).send({ locationId: LOC_B });
    expect(mismatch.status).toBe(403);
    const res = await request(app).post(`/store/tablet-runtime/devices/${DEVICE_ID}/location`).set(hdr()).send({ locationId: LOC_B });
    expect(res.status).toBe(200);
    expect(state.device.current_location_id).toBe(LOC_B);
    expect(res.body.data.location.id).toBe(LOC_B);
    const writes = state.calls.filter((c) => /^(UPDATE|INSERT|DELETE)/.test(c.sql.trim()));
    expect(writes).toHaveLength(1);
    expect(writes[0].sql).toContain('UPDATE store_tablet_devices SET current_location_id');
  });

  it('콘텐츠 전환: draft 는 409 · active 는 연결 보장 + current 변경(원자)', async () => {
    const state = makeState();
    const { app } = makeApps(state);
    const draft = await request(app).post(`/store/tablet-runtime/devices/${DEVICE_ID}/content`).set(hdr()).send({ screenSetId: SET_DRAFT });
    expect(draft.status).toBe(409);
    expect(draft.body.code).toBe('SCREEN_SET_NOT_ACTIVE');
    const ok = await request(app).post(`/store/tablet-runtime/devices/${DEVICE_ID}/content`).set(hdr()).send({ screenSetId: SET_ACTIVE });
    expect(ok.status).toBe(200);
    const writes = state.calls.filter((c) => /^(UPDATE|INSERT)/.test(c.sql.trim())).map((c) => c.sql.replace(/\s+/g, ' '));
    expect(writes.some((w) => w.startsWith('INSERT INTO store_tablet_corner_contents') && w.includes('ON CONFLICT (tablet_id, screen_set_id) DO NOTHING'))).toBe(true);
    expect(writes.some((w) => w.startsWith('UPDATE store_tablets SET current_screen_set_id = $1'))).toBe(true);
    const cur = state.calls.find((c) => c.sql.includes('UPDATE store_tablets SET current_screen_set_id'))!;
    expect(cur.params).toEqual([SET_ACTIVE, LOC_A, ORG]);
  });

  it('빠른 상품 수정: 현재 선택 + 풀 조회 · canonical config 로 저장 · 매장 밖 상품 400', async () => {
    const state = makeState();
    const { app } = makeApps(state);
    const get = await request(app).get(`/store/tablet-runtime/screen-sets/${SET_ACTIVE}/product-list`).set(hdr());
    expect(get.status).toBe(200);
    expect(get.body.data.selected).toEqual([{ productType: 'supplier', productId: '88888888-8888-4888-8888-888888888888', qrCodeId: null, name: '비타민C' }]);
    expect(get.body.data.pool.supplierProducts).toHaveLength(1);

    const bad = await request(app).put(`/store/tablet-runtime/screen-sets/${SET_ACTIVE}/product-list`).set(hdr())
      .send({ products: [{ productType: 'supplier', productId: '99999999-9999-4999-8999-999999999999' }] });
    expect(bad.status).toBe(400);
    expect(bad.body.code).toBe('PRODUCT_NOT_IN_STORE');

    const ok = await request(app).put(`/store/tablet-runtime/screen-sets/${SET_ACTIVE}/product-list`).set(hdr())
      .send({ products: [{ productType: 'supplier', productId: '88888888-8888-4888-8888-888888888888' }] });
    expect(ok.status).toBe(200);
    const upd = state.calls.find((c) => c.sql.includes('UPDATE store_tablet_screen_blocks SET config'))!;
    expect(JSON.parse(upd.params[0])).toEqual({ source: 'selected_products', products: [{ productType: 'supplier', productId: '88888888-8888-4888-8888-888888888888', qrCodeId: null }] });
  });
});

describe('product_list 정규화 (pure)', () => {
  it('중복 제거·순서 보존·qrCodeId 유지·잘못된 항목 거부', () => {
    const a = '88888888-8888-4888-8888-888888888888';
    const b = '99999999-9999-4999-8999-999999999999';
    const q = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
    expect(normalizeProductListInput([
      { productType: 'local', productId: b },
      { productType: 'supplier', productId: a, qrCodeId: q },
      { productType: 'supplier', productId: a },
    ])).toEqual([
      { productType: 'local', productId: b, qrCodeId: null },
      { productType: 'supplier', productId: a, qrCodeId: q },
    ]);
    expect(() => normalizeProductListInput('x')).toThrow(ScreenSetOpsError);
    expect(() => normalizeProductListInput([{ productType: 'other', productId: a }])).toThrow(ScreenSetOpsError);
    expect(() => normalizeProductListInput([{ productType: 'supplier', productId: 'not-uuid' }])).toThrow(ScreenSetOpsError);
  });

  it('applyScreenSetProductList: 없는 세트 404', async () => {
    const state = makeState();
    const ds = makeDataSource(state);
    await expect(applyScreenSetProductList(ds, ORG, '00000000-0000-4000-8000-000000000000', [])).rejects.toMatchObject({ status: 404, code: 'SCREEN_SET_NOT_FOUND' });
  });
});

describe('경영자 — 복제 · description', () => {
  beforeEach(() => {
    // withStoreAuth(kpa:store_owner) 통과를 위해 role_assignments/enrollment stub 을 소유자 문맥으로.
    CURRENT_USER = { id: 'user-owner', roles: ['kpa:store_owner'], memberships: [{ serviceKey: 'kpa-society', status: 'active' }] };
  });

  function ownerDataSource(state: State) {
    const ds = makeDataSource(state);
    const inner = ds.query;
    ds.query = jest.fn(async (sql: string, params: any[] = []) => {
      const s = sql.replace(/\s+/g, ' ');
      if (s.includes('service_memberships')) return [{ ok: 1 }];
      if (s.includes('role_assignments')) return [{ ok: 1 }];
      if (s.includes('organization_service_enrollments')) return [{ organization_id: ORG, role: 'owner' }];
      if (s.includes('FROM organization_members') && !s.includes('user_id = $1 AND organization_id = $2')) return [{ organization_id: ORG, role: 'owner', is_primary: true, joined_at: '2025-01-01' }];
      return inner(sql, params);
    });
    ds.transaction = async (fn: (m: any) => Promise<void>) => fn({ query: ds.query });
    return ds;
  }

  it('POST /screen-sets/:id/duplicate → 새 draft row + blocks 복사, 위치 연결/current 미복사', async () => {
    const state = makeState();
    const ds = ownerDataSource(state);
    const app = express();
    app.use(express.json());
    app.use('/store', createStoreTabletRoutes(ds, { storeOwnerServiceKey: 'kpa' }));
    const res = await request(app).post(`/store/screen-sets/${SET_ACTIVE}/duplicate`).send({});
    expect(res.status).toBe(201);
    expect(res.body.data.name).toBe('봄 프로모션 (복사)');
    expect(res.body.data.status).toBe('draft');
    const writes = state.calls.map((c) => c.sql.replace(/\s+/g, ' ')).filter((w) => /^(INSERT|UPDATE)/.test(w));
    expect(writes.some((w) => w.startsWith('INSERT INTO store_tablet_screen_sets') && w.includes("'draft'"))).toBe(true);
    expect(writes.some((w) => w.startsWith('INSERT INTO store_tablet_screen_blocks') && w.includes('SELECT $1, block_type, sort_order, is_visible, config'))).toBe(true);
    expect(writes.some((w) => w.includes('store_tablet_corner_contents'))).toBe(false);
    expect(writes.some((w) => w.includes('current_screen_set_id'))).toBe(false);
    const notFound = await request(app).post(`/store/screen-sets/${SET_DRAFT}/duplicate`).send({});
    expect(notFound.status).toBe(404);
  });
});

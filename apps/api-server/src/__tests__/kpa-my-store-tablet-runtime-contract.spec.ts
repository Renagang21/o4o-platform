/**
 * WO-O4O-KPA-MY-STORE-RUNTIME-CONTRACT-QUALITY-CLOSURE-V1 §12
 *
 * 축 A — 편집기 상품 풀 ↔ 공개 태블릿 런타임 노출 조건의 **차이를 사실대로 드러내는지**.
 *        런타임 게이트(TABLET 채널 승인 · OPC 연결 · 공급 상태 · service_key)는 완화하지 않는다.
 * 축 B — `/store/tablets|/product-pool|/screen-sets` 의 조직 해석이 같은 My Store 문맥의
 *        local-products 와 **같은 organization** 을 고르는지.
 *
 * DB 는 붙이지 않는다 — DataSource.query 를 stub 으로 대체한다.
 */

import request from 'supertest';

jest.mock('../middleware/auth.middleware.js', () => ({
  requireAuth: (req: any, _res: any, next: any) => {
    req.user = { id: 'user-multi', roles: CURRENT_ROLES, memberships: CURRENT_MEMBERSHIPS };
    next();
  },
}));

import { annotateTabletVisibility } from '../routes/platform/store-tablet-product-visibility.js';
import {
  ORG_KPA, ORG_COS, ORG_NETURE,
  NETURE_PRIMARY_MEMBERSHIP, KPA_MEMBERSHIP, COS_MEMBERSHIP,
  makeStoreTabletDataSource, makeStoreTabletApp,
} from './helpers/store-tablet-org-stub.js';

let CURRENT_ROLES: string[] = ['kpa:store_owner', 'cosmetics:store_owner'];
let CURRENT_MEMBERSHIPS: Array<{ serviceKey: string; status: string }> = [
  { serviceKey: 'kpa-society', status: 'active' },
  { serviceKey: 'k-cosmetics', status: 'active' },
];

/** KPA 시나리오: 매장 slug 있음 · TABLET 채널 승인 · 상품 노출 조건 충족 */
const makeDataSource = () => makeStoreTabletDataSource({
  memberships: [NETURE_PRIMARY_MEMBERSHIP, KPA_MEMBERSHIP, COS_MEMBERSHIP],
  currentRoles: () => CURRENT_ROLES,
  storeSlugRows: [{ serviceKey: 'kpa' }],
  channelRows: [{ status: 'APPROVED' }],
  poolServiceKey: 'kpa-society',
});

const makeApp = makeStoreTabletApp;

beforeEach(() => {
  CURRENT_ROLES = ['kpa:store_owner', 'cosmetics:store_owner'];
  CURRENT_MEMBERSHIPS = [
    { serviceKey: 'kpa-society', status: 'active' },
    { serviceKey: 'k-cosmetics', status: 'active' },
  ];
});

describe('축 B — store tablet routes: service-scoped organization resolution', () => {
  it('A. serviceKey 없는 서비스 중립 mount 는 타 서비스 조직(Neture)을 고른다 (회귀 대상 현상)', async () => {
    const { dataSource, poolOrgParams } = makeDataSource();
    const res = await request(makeApp(dataSource)).get('/store/product-pool');
    expect(res.status).toBe(200);
    expect(poolOrgParams[0]).toBe(ORG_NETURE);
  });

  it('B. storeOwnerServiceKey="kpa" mount 는 KPA 약국 조직을 고른다', async () => {
    const { dataSource, poolOrgParams } = makeDataSource();
    const res = await request(makeApp(dataSource, 'kpa')).get('/store/product-pool');
    expect(res.status).toBe(200);
    expect(poolOrgParams[0]).toBe(ORG_KPA);
  });

  it('C. cosmetics mount 는 KCos 조직을 고른다 (타 서비스 fallback 0)', async () => {
    const { dataSource, poolOrgParams } = makeDataSource();
    await request(makeApp(dataSource, 'cosmetics')).get('/store/product-pool');
    expect(poolOrgParams[0]).toBe(ORG_COS);
  });

  it('D. 정지된 membership 은 KPA mount 에서 차단된다', async () => {
    CURRENT_MEMBERSHIPS = [{ serviceKey: 'kpa-society', status: 'suspended' }];
    const { dataSource } = makeDataSource();
    const res = await request(makeApp(dataSource, 'kpa')).get('/store/product-pool');
    expect(res.status).toBe(403);
    expect(res.body.code).toBe('MEMBERSHIP_NOT_ACTIVE');
  });
});

describe('축 A — 상품 풀의 런타임 노출 판정(annotation)', () => {
  function visibilityDataSource(opts: {
    channels: Array<{ status: string }>;
    flags: Record<string, { service_ok: boolean; offer_ok: boolean; linked_approved: boolean; linked_any: boolean }>;
  }) {
    return {
      query: jest.fn(async (sql: string, params: any[] = []) => {
        if (sql.includes('FROM organization_channels')) return opts.channels;
        if (sql.includes('linked_approved')) {
          return (params[2] as string[])
            .filter((id) => opts.flags[id])
            .map((id) => ({ id, ...opts.flags[id] }));
        }
        return [];
      }),
    } as any;
  }

  const OK = { service_ok: true, offer_ok: true, linked_approved: true, linked_any: true };

  it('노출 가능 상품은 tabletVisible=true', async () => {
    const ds = visibilityDataSource({ channels: [{ status: 'APPROVED' }], flags: { a: OK } });
    const out = await annotateTabletVisibility(ds, ORG_KPA, 'kpa', [{ id: 'a' }]);
    expect(out[0]).toMatchObject({ tabletVisible: true, tabletVisibilityReason: 'visible' });
  });

  it('TABLET 채널이 없으면 no_tablet_channel', async () => {
    const ds = visibilityDataSource({
      channels: [],
      flags: { a: { ...OK, linked_approved: false, linked_any: false } },
    });
    const out = await annotateTabletVisibility(ds, ORG_KPA, 'kpa', [{ id: 'a' }]);
    expect(out[0]).toMatchObject({ tabletVisible: false, tabletVisibilityReason: 'no_tablet_channel' });
  });

  it('TABLET 채널이 미승인이면 channel_not_approved', async () => {
    const ds = visibilityDataSource({
      channels: [{ status: 'PENDING' }],
      flags: { a: { ...OK, linked_approved: false, linked_any: true } },
    });
    const out = await annotateTabletVisibility(ds, ORG_KPA, 'kpa', [{ id: 'a' }]);
    expect(out[0]).toMatchObject({ tabletVisible: false, tabletVisibilityReason: 'channel_not_approved' });
  });

  it('승인 채널은 있으나 상품이 채널에 연결되지 않으면 not_linked_to_channel', async () => {
    const ds = visibilityDataSource({
      channels: [{ status: 'APPROVED' }],
      flags: { a: { ...OK, linked_approved: false, linked_any: false } },
    });
    const out = await annotateTabletVisibility(ds, ORG_KPA, 'kpa', [{ id: 'a' }]);
    expect(out[0]).toMatchObject({ tabletVisible: false, tabletVisibilityReason: 'not_linked_to_channel' });
  });

  it('offer 없음/비활성(취급 등록만)은 offer_inactive', async () => {
    const ds = visibilityDataSource({
      channels: [{ status: 'APPROVED' }],
      flags: { a: { ...OK, offer_ok: false } },
    });
    const out = await annotateTabletVisibility(ds, ORG_KPA, 'kpa', [{ id: 'a' }]);
    expect(out[0]).toMatchObject({ tabletVisible: false, tabletVisibilityReason: 'offer_inactive' });
  });

  it('service_key 불일치는 service_scope_mismatch (kpa → kpa/kpa-society 만 통과)', async () => {
    const ds = visibilityDataSource({
      channels: [{ status: 'APPROVED' }],
      flags: { a: { ...OK, service_ok: false } },
    });
    const out = await annotateTabletVisibility(ds, ORG_KPA, 'kpa', [{ id: 'a' }]);
    expect(out[0]).toMatchObject({ tabletVisible: false, tabletVisibilityReason: 'service_scope_mismatch' });
  });

  it('빈 목록은 추가 질의 없이 빈 배열', async () => {
    const ds = visibilityDataSource({ channels: [], flags: {} });
    expect(await annotateTabletVisibility(ds, ORG_KPA, 'kpa', [])).toEqual([]);
    expect(ds.query).not.toHaveBeenCalled();
  });
});

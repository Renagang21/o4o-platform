/**
 * WO-O4O-CROSS-SERVICE-MY-STORE-RUNTIME-CONTRACT-COMMONIZATION-V1 §18
 *
 * 축 A(조직 해석 스코프) — K-Cosmetics / GlycoPharm 의 태블릿 진열 화면이
 * 서비스 중립 `/api/v1/store/tablets` 를 호출해 **타 서비스 조직**을 고르던 결함.
 * KPA(`storeOwnerServiceKey: 'kpa'`) · PharmacyHub(`resolveOrganizationId`) 와 같은
 * seam 을 재사용해 서비스 축으로 스코프한다 — 새 resolver 를 만들지 않는다.
 *
 * 축 B(노출 사유 계약) — backend 가 붙여 주는 `tabletVisible/tabletVisibilityReason`,
 * `tabletChannel` 을 KCos/GP 가 공유하는 `@o4o/store-ui-core` 태블릿 화면이
 * 실제로 표시하는지(문구는 `@o4o/tablet-screen-set-editor` 와 동일).
 *
 * DB 는 붙이지 않는다 — DataSource.query stub + raw-source 단언.
 */

import express from 'express';
import request from 'supertest';
import fs from 'fs';
import path from 'path';

jest.mock('../middleware/auth.middleware.js', () => ({
  requireAuth: (req: any, _res: any, next: any) => {
    req.user = { id: 'user-multi', roles: CURRENT_ROLES, memberships: CURRENT_MEMBERSHIPS };
    next();
  },
}));

import { createStoreTabletRoutes } from '../routes/platform/store-tablet.routes.js';
import type { StoreOwnerServiceKey } from '../utils/store-organization.resolver.js';

let CURRENT_ROLES: string[] = [
  'kpa:store_owner',
  'cosmetics:store_owner',
  'glycopharm:store_owner',
];

let CURRENT_MEMBERSHIPS: Array<{ serviceKey: string; status: string }> = [
  { serviceKey: 'kpa-society', status: 'active' },
  { serviceKey: 'k-cosmetics', status: 'active' },
  { serviceKey: 'glycopharm', status: 'active' },
];

const ORG_KPA = 'org-kpa';
const ORG_COS = 'org-cos';
const ORG_GP = 'org-gp';
const ORG_NETURE = 'org-neture';

/** Neture 공급자 조직이 is_primary + 최초 가입 → back-compat 정렬에서 1순위가 된다. */
const MEMBERSHIPS = [
  { organizationId: ORG_NETURE, role: 'owner', isPrimary: true, joinedAt: '2024-01-01', enrollments: ['neture'], slugKeys: [] as string[] },
  { organizationId: ORG_KPA, role: 'owner', isPrimary: false, joinedAt: '2025-03-01', enrollments: ['kpa-society'], slugKeys: ['kpa'] },
  { organizationId: ORG_COS, role: 'owner', isPrimary: false, joinedAt: '2025-04-01', enrollments: ['k-cosmetics'], slugKeys: [] },
  { organizationId: ORG_GP, role: 'owner', isPrimary: false, joinedAt: '2025-05-01', enrollments: ['glycopharm'], slugKeys: [] },
];

function makeDataSource() {
  const poolOrgParams: string[] = [];
  const dataSource = {
    query: jest.fn(async (sql: string, params: any[] = []) => {
      if (sql.includes('service_memberships')) return [{ ok: 1 }];
      if (sql.includes('role_assignments')) {
        const allowed = params[1] as string[];
        return CURRENT_ROLES.some((r) => allowed.includes(r)) ? [{ ok: 1 }] : [];
      }
      if (sql.includes('organization_service_enrollments')) {
        const roles = params[1] as string[];
        const enrollmentCodes = params[2] as string[];
        const slugKeys = params[3] as string[];
        return MEMBERSHIPS
          .filter((m) => roles.includes(m.role)
            && (m.enrollments.some((e) => enrollmentCodes.includes(e)) || m.slugKeys.some((s) => slugKeys.includes(s))))
          .map((m) => ({ organization_id: m.organizationId, role: m.role }));
      }
      if (sql.includes('organization_members')) {
        const roles = params[1] as string[];
        return MEMBERSHIPS
          .filter((m) => roles.includes(m.role))
          .map((m) => ({ organization_id: m.organizationId, role: m.role, is_primary: m.isPrimary, joined_at: m.joinedAt }));
      }
      if (sql.includes('platform_store_slugs')) return [];
      if (sql.includes('FROM organization_channels')) return [{ status: 'PENDING' }];
      if (sql.includes('linked_approved')) {
        return (params[2] as string[]).map((id) => ({
          id, service_ok: true, offer_ok: true, linked_approved: false, linked_any: true,
        }));
      }
      if (sql.includes('organization_product_listings')) {
        poolOrgParams.push(params[0] as string);
        return [{
          id: 'listing-1', offer_id: 'offer-1', product_name: 'P', retail_price: '1000',
          is_active: true, created_at: '2025-01-01', service_key: 'k-cosmetics',
        }];
      }
      if (sql.includes('store_local_products')) return [];
      return [];
    }),
  };
  return { dataSource: dataSource as any, poolOrgParams };
}

function makeApp(dataSource: any, storeOwnerServiceKey?: StoreOwnerServiceKey) {
  const app = express();
  app.use(express.json());
  app.use('/store', createStoreTabletRoutes(
    dataSource,
    storeOwnerServiceKey
      ? { storeOwnerServiceKey, qrServiceKey: storeOwnerServiceKey, operatorTemplateServiceKey: storeOwnerServiceKey }
      : {},
  ));
  return app;
}

beforeEach(() => {
  CURRENT_ROLES = ['kpa:store_owner', 'cosmetics:store_owner', 'glycopharm:store_owner'];
  CURRENT_MEMBERSHIPS = [
    { serviceKey: 'kpa-society', status: 'active' },
    { serviceKey: 'k-cosmetics', status: 'active' },
    { serviceKey: 'glycopharm', status: 'active' },
  ];
});

describe('축 A — KCos / GP 태블릿 라우트의 서비스 스코프 조직 해석', () => {
  it('A. serviceKey 없는 서비스 중립 mount 는 Neture 조직을 고른다 (회귀 대상 현상)', async () => {
    const { dataSource, poolOrgParams } = makeDataSource();
    const res = await request(makeApp(dataSource)).get('/store/product-pool');
    expect(res.status).toBe(200);
    expect(poolOrgParams[0]).toBe(ORG_NETURE);
  });

  it('B. cosmetics mount 는 KCos 조직을 고른다', async () => {
    const { dataSource, poolOrgParams } = makeDataSource();
    const res = await request(makeApp(dataSource, 'cosmetics')).get('/store/product-pool');
    expect(res.status).toBe(200);
    expect(poolOrgParams[0]).toBe(ORG_COS);
  });

  it('C. glycopharm mount 는 GP 조직을 고른다', async () => {
    const { dataSource, poolOrgParams } = makeDataSource();
    const res = await request(makeApp(dataSource, 'glycopharm')).get('/store/product-pool');
    expect(res.status).toBe(200);
    expect(poolOrgParams[0]).toBe(ORG_GP);
  });

  it('D. 해당 서비스 store_owner role 이 없으면 403 (게이트 완화 없음)', async () => {
    CURRENT_ROLES = ['kpa:store_owner'];
    const { dataSource } = makeDataSource();
    const res = await request(makeApp(dataSource, 'cosmetics')).get('/store/product-pool');
    expect(res.status).toBe(403);
  });

  it('D-2. KCos membership 이 정지되면 MEMBERSHIP_NOT_ACTIVE (KPA 와 같은 계약)', async () => {
    CURRENT_MEMBERSHIPS = [{ serviceKey: 'k-cosmetics', status: 'suspended' }];
    const { dataSource } = makeDataSource();
    const res = await request(makeApp(dataSource, 'cosmetics')).get('/store/product-pool');
    expect(res.status).toBe(403);
    expect(res.body.code).toBe('MEMBERSHIP_NOT_ACTIVE');
  });

  it('E. 상품 풀 응답에 노출 판정과 채널 상태가 함께 실린다 (KPA 와 같은 계약)', async () => {
    const { dataSource } = makeDataSource();
    const res = await request(makeApp(dataSource, 'cosmetics')).get('/store/product-pool');
    expect(res.status).toBe(200);
    expect(res.body.data.supplierProducts[0]).toMatchObject({
      tabletVisible: false,
      tabletVisibilityReason: 'channel_not_approved',
    });
    expect(res.body.data.tabletChannel).toMatchObject({
      hasTabletChannel: true,
      hasApprovedTabletChannel: false,
    });
  });
});

describe('mount · client 계약 (raw source)', () => {
  const apiSrc = path.resolve(__dirname, '..');
  const repo = path.resolve(__dirname, '..', '..', '..', '..');
  const read = (p: string) => fs.readFileSync(p, 'utf8');

  it('F. KCos / GP 서비스 라우터가 태블릿 라우트를 서비스 축으로 mount 한다', () => {
    for (const [file, key] of [
      ['routes/cosmetics/cosmetics.routes.ts', 'cosmetics'],
      ['routes/glycopharm/glycopharm.routes.ts', 'glycopharm'],
    ]) {
      const text = read(path.join(apiSrc, file));
      expect(text).toContain('createStoreTabletRoutes(dataSource, {');
      expect(text).toContain(`storeOwnerServiceKey: '${key}'`);
    }
  });

  it('G. KPA mount 와 서비스 중립 back-compat mount 는 유지된다', () => {
    expect(read(path.join(apiSrc, 'routes/kpa/kpa.routes.ts')))
      .toContain("createStoreTabletRoutes(dataSource, { storeOwnerServiceKey: 'kpa' })");
    expect(read(path.join(apiSrc, 'bootstrap/register-routes.ts')))
      .toContain('createStoreTabletRoutes(dataSource)');
  });

  it('H. KCos / GP 프론트 태블릿 client 는 서비스 스코프 경로를 쓴다', () => {
    const kcos = read(path.join(repo, 'services/web-k-cosmetics/src/services/tabletDisplayApi.ts'));
    expect(kcos).toContain("const BASE = '/cosmetics/store';");
    const gp = read(path.join(repo, 'services/web-glycopharm/src/api/tabletDisplays.ts'));
    expect(gp).toContain("const BASE = '/glycopharm/store';");
    const gpInterest = read(path.join(repo, 'services/web-glycopharm/src/api/tabletInterest.ts'));
    expect(gpInterest).toContain('/glycopharm/store/interest/');
    for (const text of [kcos, gp, gpInterest]) {
      expect(text).not.toMatch(/['"`]\/store\/(tablets|interest)/);
    }
  });

  it('I. 공통 태블릿 화면(@o4o/store-ui-core)이 노출 사유를 표시한다', () => {
    const core = path.join(repo, 'packages/store-ui-core/src/components/tablet');
    const types = read(path.join(core, 'types.ts'));
    const editor = read(path.join(repo, 'packages/tablet-screen-set-editor/src/index.tsx'));
    // 문구는 편집기와 동일해야 한다 (같은 사유 → 같은 안내).
    for (const reason of [
      'no_tablet_channel', 'channel_not_approved', 'not_linked_to_channel',
      'offer_inactive', 'service_scope_mismatch',
    ]) {
      const m = new RegExp(`${reason}: '([^']+)'`);
      const inTypes = types.match(m);
      const inEditor = editor.match(m);
      expect(inTypes).not.toBeNull();
      expect(inEditor).not.toBeNull();
      expect(inTypes![1]).toBe(inEditor![1]);
    }
    expect(read(path.join(core, 'tabletHelpers.ts'))).toContain('visibilityNotice');
    expect(read(path.join(core, 'TabletProductPoolPanel.tsx'))).toContain('노출 불가');
    expect(read(path.join(core, 'StoreTabletDisplaysView.tsx'))).toContain('hasApprovedTabletChannel');
  });
});

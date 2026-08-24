/**
 * WO-O4O-STORE-LOCAL-PRODUCTS-SERVICE-SCOPED-ORGANIZATION-RESOLUTION-V1 §9
 *
 * `/store/local-products` 의 조직 해석이 **같은 My Store 문맥의 handled-products 와
 * 동일한 organization** 을 고르는지 검증한다.
 *
 * 배경(프로덕션 실측): 다중 조직 사용자에서 serviceKey 없는 back-compat 해석은
 * `is_primary DESC → joined_at ASC` 로 **다른 서비스의 조직**(Neture 공급자 조직)을
 * 골랐고, handled-products(serviceKey='kpa')는 약국 조직을 골랐다.
 * → 취급제품에는 local 항목이 보이는데 자체상품 목록은 0건.
 *
 * DB 는 붙이지 않는다 — DataSource.query 를 stub 으로 대체해 조직 해석 SQL 과
 * 실제 선택된 organization_id 만 본다.
 */

import express from 'express';
import request from 'supertest';
import fs from 'fs';
import path from 'path';

jest.mock('../middleware/auth.middleware.js', () => ({
  requireAuth: (req: any, _res: any, next: any) => {
    req.user = { id: CURRENT_USER, roles: CURRENT_ROLES };
    next();
  },
}));

import { createStoreLocalProductRoutes } from '../routes/platform/store-local-product.routes.js';
import { resolveStoreAccess } from '../utils/store-owner.utils.js';
import type { StoreOwnerServiceKey } from '../utils/store-organization.resolver.js';

let CURRENT_USER = 'user-multi';
let CURRENT_ROLES: string[] = ['kpa:store_owner', 'cosmetics:store_owner', 'glycopharm:store_owner'];

const ORG_KPA = 'org-kpa';
const ORG_COS = 'org-cos';
const ORG_GP = 'org-gp';
const ORG_NETURE = 'org-neture';

interface Membership {
  organizationId: string;
  role: string;
  isPrimary: boolean;
  joinedAt: string;
  /** organization_service_enrollments.service_code (status='active') */
  enrollments: string[];
  /** platform_store_slugs.service_key (is_active) */
  slugKeys: string[];
}

/**
 * 프로덕션 실측 구조를 축약한 다중 조직 사용자.
 * Neture 공급자 조직이 is_primary + 최초 가입이라 back-compat 정렬에서 1순위가 된다.
 */
const MEMBERSHIPS: Membership[] = [
  {
    organizationId: ORG_NETURE,
    role: 'owner',
    isPrimary: true,
    joinedAt: '2024-01-01',
    enrollments: ['neture'],
    slugKeys: [],
  },
  {
    organizationId: ORG_KPA,
    role: 'owner',
    isPrimary: false,
    joinedAt: '2025-03-01',
    enrollments: ['kpa-society'],
    slugKeys: ['kpa'],
  },
  {
    organizationId: ORG_COS,
    role: 'owner',
    isPrimary: false,
    joinedAt: '2025-04-01',
    enrollments: ['k-cosmetics'],
    slugKeys: [],
  },
  {
    organizationId: ORG_GP,
    role: 'owner',
    isPrimary: false,
    joinedAt: '2025-05-01',
    enrollments: ['glycopharm'],
    slugKeys: [],
  },
];

/** organization_id → 자체상품 건수 (KPA 약국에만 있다 — 프로덕션과 같은 모양) */
const LOCAL_PRODUCTS: Record<string, number> = { [ORG_KPA]: 8 };

let memberships: Membership[] = MEMBERSHIPS;
let activeRoles: string[] = [];

function makeDataSource() {
  const listOrgParams: string[] = [];
  const dataSource = {
    query: jest.fn(async (sql: string, params: any[] = []) => {
      // 0) membership 게이트
      //    WO-O4O-CROSSSERVICE-MEMBERSHIP-SUSPENSION-ROLE-LIFECYCLE-CONTRACT-V1 §7:
      //    isStoreOwner() 가 role 조회 앞에서 active membership 을 확인한다.
      //    이 fixture 의 계정은 4개 서비스 모두 active 회원이므로 항상 통과시킨다
      //    (정지 계약 자체는 store-owner 가드 회귀 테스트가 따로 고정한다).
      if (sql.includes('service_memberships')) {
        return [{ ok: 1 }];
      }

      // 1) role 게이트
      if (sql.includes('role_assignments')) {
        const allowed = params[1] as string[];
        return activeRoles.some((r) => allowed.includes(r)) ? [{ ok: 1 }] : [];
      }

      // 2) service-scoped 후보 (serviceKey 지정 경로)
      if (sql.includes('organization_service_enrollments')) {
        const roles = params[1] as string[];
        const enrollmentCodes = params[2] as string[];
        const slugKeys = params[3] as string[];
        return memberships
          .filter(
            (m) =>
              roles.includes(m.role) &&
              (m.enrollments.some((e) => enrollmentCodes.includes(e)) ||
                m.slugKeys.some((s) => slugKeys.includes(s))),
          )
          .map((m) => ({ organization_id: m.organizationId, role: m.role }));
      }

      // 3) back-compat 후보 (서비스 조건 없음)
      if (sql.includes('organization_members')) {
        const roles = params[1] as string[];
        return memberships
          .filter((m) => roles.includes(m.role))
          .map((m) => ({
            organization_id: m.organizationId,
            role: m.role,
            is_primary: m.isPrimary,
            joined_at: m.joinedAt,
          }));
      }

      // 4) 자체상품 목록/카운트
      if (sql.includes('store_local_products')) {
        const orgId = params[0] as string;
        listOrgParams.push(orgId);
        const count = LOCAL_PRODUCTS[orgId] ?? 0;
        if (sql.includes('COUNT(*)')) return [{ count }];
        return Array.from({ length: count }, (_v, i) => ({ id: `${orgId}-item-${i}` }));
      }

      return [];
    }),
  };
  return { dataSource: dataSource as any, listOrgParams };
}

function makeApp(dataSource: any, serviceKey?: StoreOwnerServiceKey) {
  const app = express();
  app.use(express.json());
  app.use('/store', createStoreLocalProductRoutes(dataSource, serviceKey));
  return app;
}

beforeEach(() => {
  CURRENT_USER = 'user-multi';
  CURRENT_ROLES = ['kpa:store_owner', 'cosmetics:store_owner', 'glycopharm:store_owner'];
  memberships = MEMBERSHIPS;
  activeRoles = [
    'kpa:store_owner',
    'cosmetics:store_owner',
    'glycopharm:store_owner',
    'pharmacy-hub:store_owner',
  ];
});

describe('local-products — service-scoped organization resolution', () => {
  it('A. serviceKey 없는 mount 는 다른 서비스 조직을 골라 0건이 된다 (회귀 대상 현상)', async () => {
    const { dataSource, listOrgParams } = makeDataSource();
    const res = await request(makeApp(dataSource)).get('/store/local-products');

    expect(res.status).toBe(200);
    expect(listOrgParams[0]).toBe(ORG_NETURE); // is_primary DESC → joined_at ASC
    expect(res.body.data.total).toBe(0);
  });

  it('B. serviceKey="kpa" mount 는 KPA 약국 조직을 골라 자체상품이 보인다', async () => {
    const { dataSource, listOrgParams } = makeDataSource();
    const res = await request(makeApp(dataSource, 'kpa')).get('/store/local-products');

    expect(res.status).toBe(200);
    expect(listOrgParams[0]).toBe(ORG_KPA);
    expect(res.body.data.total).toBe(8);
  });

  it('C. handled-products 와 local-products 의 organization 해석이 같다 (WO 핵심 완료 기준)', async () => {
    const { dataSource, listOrgParams } = makeDataSource();

    // handled-products 는 serviceKey='kpa' 로 고정 해석한다 (store-handled-products.routes.ts)
    const handledOrg = await resolveStoreAccess(dataSource, CURRENT_USER, CURRENT_ROLES, 'kpa');

    await request(makeApp(dataSource, 'kpa')).get('/store/local-products');
    const localOrg = listOrgParams[0];

    expect(handledOrg).toBe(ORG_KPA);
    expect(localOrg).toBe(handledOrg);
  });

  it('D. KCos / GP mount 는 각자 서비스 조직을 고른다 (타 서비스 조직 fallback 0)', async () => {
    for (const [serviceKey, expected] of [
      ['cosmetics', ORG_COS],
      ['glycopharm', ORG_GP],
    ] as Array<[StoreOwnerServiceKey, string]>) {
      const { dataSource, listOrgParams } = makeDataSource();
      await request(makeApp(dataSource, serviceKey)).get('/store/local-products');
      expect(listOrgParams[0]).toBe(expected);
    }
  });

  it('E. 타 서비스 조직만 가진 사용자는 그 서비스에서 후보 0 → 쓰기 403', async () => {
    memberships = [MEMBERSHIPS[2]]; // K-Cosmetics 조직만 보유
    const { dataSource, listOrgParams } = makeDataSource();

    const res = await request(makeApp(dataSource, 'kpa'))
      .post('/store/local-products')
      .send({ name: '테스트 상품' });

    expect(res.status).toBe(403);
    expect(res.body.code).toBe('FORBIDDEN');
    expect(listOrgParams).toHaveLength(0); // 다른 서비스 조직으로 새지 않는다
  });

  it('F. store_owner role 이 비활성이면 조직 해석 자체를 하지 않는다', async () => {
    activeRoles = []; // role_assignments.is_active = true 인 행 없음
    const { dataSource, listOrgParams } = makeDataSource();

    const res = await request(makeApp(dataSource, 'kpa'))
      .post('/store/local-products')
      .send({ name: '테스트 상품' });

    expect(res.status).toBe(403);
    expect(listOrgParams).toHaveLength(0);
  });

  it('G. 같은 서비스 후보 2개면 임의 선택 없이 차단한다 (ambiguity 계약 유지)', async () => {
    memberships = [
      MEMBERSHIPS[1],
      { ...MEMBERSHIPS[1], organizationId: 'org-kpa-2', role: 'manager' },
    ];
    const { dataSource, listOrgParams } = makeDataSource();

    const res = await request(makeApp(dataSource, 'kpa'))
      .post('/store/local-products')
      .send({ name: '테스트 상품' });

    expect(res.status).toBe(403);
    expect(listOrgParams).toHaveLength(0);
  });

  it('H. pharmacy-hub 는 자체 해석기를 쓰므로 공통 linkage 로는 후보가 잡히지 않는다', async () => {
    const { dataSource } = makeDataSource();
    const org = await resolveStoreAccess(dataSource, CURRENT_USER, CURRENT_ROLES, 'pharmacy-hub');
    expect(org).toBeNull();
  });
});

describe('local-products — mount 계약', () => {
  const src = path.resolve(__dirname, '..');

  it('I. 서비스 라우터는 serviceKey 를 명시해 mount 한다', () => {
    for (const [file, key] of [
      ['routes/kpa/kpa.routes.ts', 'kpa'],
      ['routes/cosmetics/cosmetics.routes.ts', 'cosmetics'],
      ['routes/glycopharm/glycopharm.routes.ts', 'glycopharm'],
    ]) {
      const text = fs.readFileSync(path.join(src, file), 'utf8');
      expect(text).toContain(`createStoreLocalProductRoutes(dataSource, '${key}')`);
    }
  });

  it('J. 서비스 중립 mount 는 back-compat 로 유지된다', () => {
    const text = fs.readFileSync(path.join(src, 'bootstrap/register-routes.ts'), 'utf8');
    expect(text).toContain("app.use('/api/v1/store', createStoreLocalProductRoutes(dataSource))");
  });
});

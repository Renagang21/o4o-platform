/**
 * WO-O4O-STORE-OWNER-BACKCOMPAT-SERVICEKEY-MIGRATION-V1 §6
 *
 * store-owner.utils.ts 의 **serviceKey 없는 back-compat 경로**를 사용하는 소비처를
 * 전수조사해, 서비스가 명확한 호출부를 명시 serviceKey 로 전환한 결과를 고정한다.
 *
 * 이 spec 이 지키는 것은 두 가지다.
 *
 *   (1) 계약  — serviceKey 를 넘긴 가드가 서비스별로 정확히 판정하는가
 *               (일치 membership → PASS / 타 서비스 membership → FAIL).
 *   (2) census — 전환한 호출부가 다시 back-compat 로 돌아가지 않고,
 *                남겨둔 SERVICE_NEUTRAL_BACKCOMPAT 집합이 조용히 늘지 않는가.
 *
 * (2) 는 정적 분석이다. DB·네트워크가 없다.
 *
 * 조직 해석(resolveStoreOrganization) 자체의 A~F 케이스는
 * store-owner-service-scoped-org.spec.ts 가 이미 고정한다. 여기서는 중복하지 않는다.
 */

import fs from 'fs';
import path from 'path';
import { createRequireStoreOwner } from '../utils/store-owner.utils.js';
import type { StoreOwnerServiceKey } from '../utils/store-organization.resolver.js';

const API_SERVER_SRC = path.resolve(__dirname, '..');

function makeDataSource(responses: Record<string, unknown>[][]) {
  const queue = [...responses];
  return {
    query: jest.fn(async () => queue.shift() ?? []),
  } as any;
}

function makeRes() {
  const res: any = {};
  res.status = jest.fn(() => res);
  res.json = jest.fn(() => res);
  return res;
}

const ROLE_ROW = [{ '?column?': 1 }];
/**
 * WO-O4O-CROSSSERVICE-MEMBERSHIP-SUSPENSION-ROLE-LIFECYCLE-CONTRACT-V1 §7:
 *   isStoreOwner() 가 role 조회 **앞에** active membership 을 DB 로 확인한다.
 *   fake dataSource 는 순서 큐이므로 membership 응답이 먼저 와야 한다.
 */
const MEMBERSHIP_ROW = [{ '?column?': 1 }];

/** role-prefix 축 serviceKey → service_memberships canonical key. */
const CANONICAL: Record<StoreOwnerServiceKey, string> = {
  kpa: 'kpa-society',
  cosmetics: 'k-cosmetics',
  glycopharm: 'glycopharm',
  'pharmacy-hub': 'pharmacy-hub',
};

describe('§6 서비스별 store_owner 가드 — 일치 membership 만 통과한다', () => {
  const services = Object.keys(CANONICAL) as StoreOwnerServiceKey[];

  it.each(services)('%s store_owner + 같은 서비스 active membership → PASS', async (svc) => {
    const dataSource = makeDataSource([MEMBERSHIP_ROW, ROLE_ROW, [{ organization_id: 'org-' + svc, role: 'owner' }]]);
    const guard = createRequireStoreOwner(dataSource, svc);
    const res = makeRes();
    const next = jest.fn();
    const req: any = {
      user: { id: 'u1', memberships: [{ serviceKey: CANONICAL[svc], status: 'active' }] },
    };

    await guard(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(req.organizationId).toBe('org-' + svc);
    expect(res.status).not.toHaveBeenCalled();
  });

  it.each(services)('%s route + 타 서비스 membership 만 보유 → 403 MEMBERSHIP_NOT_FOUND', async (svc) => {
    const other = services.find((s) => s !== svc)!;
    const dataSource = makeDataSource([MEMBERSHIP_ROW, ROLE_ROW, [{ organization_id: 'org-x', role: 'owner' }]]);
    const guard = createRequireStoreOwner(dataSource, svc);
    const res = makeRes();
    const next = jest.fn();

    await guard(
      { user: { id: 'u1', memberships: [{ serviceKey: CANONICAL[other], status: 'active' }] } } as any,
      res,
      next,
    );

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json.mock.calls[0][0].code).toBe('MEMBERSHIP_NOT_FOUND');
  });

  it('multi-service 계정이라도 현재 route 의 serviceKey 조직만 후보로 조회한다', async () => {
    const dataSource = makeDataSource([MEMBERSHIP_ROW, ROLE_ROW, [{ organization_id: 'org-gp', role: 'owner' }]]);
    const guard = createRequireStoreOwner(dataSource, 'glycopharm');
    const req: any = {
      user: {
        id: 'u1',
        memberships: [
          { serviceKey: 'kpa-society', status: 'active' },
          { serviceKey: 'glycopharm', status: 'active' },
          { serviceKey: 'k-cosmetics', status: 'active' },
        ],
      },
    };

    await guard(req, makeRes(), jest.fn());

    expect(req.organizationId).toBe('org-gp');
    // 조직 후보 조회 SQL 에 glycopharm linkage 만 들어간다 (타 서비스 조직 fallback 금지)
    const orgCall = dataSource.query.mock.calls[2];
    expect(orgCall[0]).toContain('organization_service_enrollments');
    expect(JSON.stringify(orgCall[1])).toContain('glycopharm');
    expect(JSON.stringify(orgCall[1])).not.toContain('kpa');
  });

  it('inactive membership 은 serviceKey 경로에서도 통과하지 못한다', async () => {
    const dataSource = makeDataSource([]);
    const guard = createRequireStoreOwner(dataSource, 'kpa');
    const res = makeRes();
    const next = jest.fn();

    await guard(
      { user: { id: 'u1', memberships: [{ serviceKey: 'kpa-society', status: 'suspended' }] } } as any,
      res,
      next,
    );

    expect(next).not.toHaveBeenCalled();
    expect(res.json.mock.calls[0][0].code).toBe('MEMBERSHIP_NOT_ACTIVE');
  });
});

/* ────────────────────────────────────────────────────────────────────────── */

function read(rel: string): string {
  return fs.readFileSync(path.join(API_SERVER_SRC, rel), 'utf-8');
}

describe('§9 census — 전환한 호출부는 back-compat 로 돌아가지 않는다', () => {
  it('store-ai.controller 는 glycopharm 으로 가드한다', () => {
    const src = read('modules/store-ai/controllers/store-ai.controller.ts');
    expect(src).toContain("createRequireStoreOwner(dataSource, 'glycopharm')");
    expect(src).not.toMatch(/createRequireStoreOwner\(\s*dataSource\s*\)/);
  });

  it('store-product-request.controller 는 kpa 로 가드한다', () => {
    const src = read('routes/o4o-store/controllers/store-product-request.controller.ts');
    expect(src).toContain("createRequireStoreOwner(dataSource, 'kpa')");
    expect(src).not.toMatch(/createRequireStoreOwner\(\s*dataSource\s*\)/);
  });

  it('store-handled-products.routes 의 조직 결정 4곳이 모두 kpa 로 고정된다', () => {
    const src = read('routes/platform/store-handled-products.routes.ts');
    const calls = src.match(/resolveStoreAccess\([^)]*\)/g) ?? [];
    expect(calls).toHaveLength(4);
    for (const call of calls) {
      expect(call).toContain("'kpa'");
    }
  });
});

describe('§9 census — SERVICE_NEUTRAL_BACKCOMPAT 잔여 집합이 늘지 않는다', () => {
  /**
   * 남겨둔 근거는 CHECK-O4O-STORE-OWNER-BACKCOMPAT-SERVICEKEY-MIGRATION-V1 §4 에 있다.
   * 요약: 소비처가 2개 이상 서비스이거나(공유 라우트) 소비처가 0이며,
   * 요청 문맥에서 serviceKey 를 얻는 **기존** 계약이 없다.
   * WO §4 에 따라 이번 범위에서 새 API contract 를 만들지 않는다.
   */
  const ALLOWED = [
    'modules/neture/controllers/seller.controller.ts',
    'modules/store-ai/controllers/product-ai-recommendation.controller.ts',
    'modules/store/store-library.routes.ts',
    'routes/o4o-store/controllers/store-product-library.controller.ts',
    'routes/platform/store-tablet.routes.ts',
  ].sort();

  function collect(dir: string, out: string[] = []): string[] {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        if (entry.name === 'node_modules' || entry.name === 'dist' || entry.name === '__tests__') continue;
        collect(full, out);
      } else if (entry.name.endsWith('.ts') && !entry.name.endsWith('.d.ts')) {
        out.push(full);
      }
    }
    return out;
  }

  /**
   * WO-O4O-STORE-LOCAL-PRODUCTS-SERVICE-SCOPED-ORGANIZATION-RESOLUTION-V1:
   *   `routes/platform/store-local-product.routes.ts` 는 mount 단계에서 serviceKey 를 주입받아
   *   목록에서 빠졌다 (서비스별 mount = canonical / 서비스 중립 mount = back-compat).
   */
  it('serviceKey 없는 호출부는 문서화된 5곳뿐이다', () => {
    const found = new Set<string>();

    for (const file of collect(API_SERVER_SRC)) {
      const src = fs.readFileSync(file, 'utf-8');
      const rel = path.relative(API_SERVER_SRC, file).replace(/\\/g, '/');

      // 주석 줄은 제외하고 실제 호출만 본다 (설계 근거 주석에 함수명이 자주 등장한다).
      for (const line of src.split('\n')) {
        if (/^\s*(\*|\/\/)/.test(line)) continue;
        if (/createRequireStoreOwner\(\s*dataSource\s*\)/.test(line)) found.add(rel);
        const m = line.match(/resolveStoreAccess\(([^)]*)\)/);
        if (m && m[1].trim() && m[1].split(',').length < 4) found.add(rel);
      }
    }

    expect([...found].sort()).toEqual(ALLOWED);
  });
});

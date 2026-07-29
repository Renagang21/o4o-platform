import type { DataSource } from 'typeorm';
import {
  resolveGlobalProductResourceAccess,
  productMasterExists,
} from '../../modules/store-ai/utils/product-access.utils.js';
import type { ProductAccessMode } from '../../modules/store-ai/utils/product-access.utils.js';

/**
 * WO-O4O-PRODUCT-AI-CONTENT-GLOBAL-CONTRACT-AND-ACCESS-FIX-V1 §14 (사용자 개정 매트릭스)
 *
 * product_ai_contents / product_ai_tags 는 ProductMaster 기반 **전역 자원**이며,
 * 표준 ProductMaster 는 전 서비스 공용 자원이므로 **service 소유권을 갖지 않는다.**
 * 따라서 접근 판정은 service 경계가 아니라 **actor 와 master 의 관계**로 한다.
 *
 * 검증 대상:
 *   - platform:super_admin        → 임의 master read/write 허용
 *   - kpa:operator                → 역할만으로 전역 쓰기 403
 *   - neture:operator             → 역할만으로 전역 쓰기 403
 *   - 공급자 A                     → 자기 offer master 허용 / 공급자 B master 403
 *   - 매장 owner + active OPL      → render_read 만 허용, write·manage_read 403
 *   - 매장 owner + 타 조직 master   → 전 모드 403
 *   - local product UUID          → master 미존재 → 신규 전역 row 생성 경로 차단
 *
 * 프로덕션 supplier_product_offers 는 0행이므로 공급자 검증은 실브라우저 smoke 가 아니라
 * 본 fixture 기반 테스트로 대체한다 (사용자 지시, CHECK 문서에 사유 기록).
 */

const MASTER_A = '11111111-1111-4111-8111-111111111111';
const MASTER_B = '22222222-2222-4222-8222-222222222222';
/** 실재하지만 어떤 조직도 진열(active OPL)하지 않은 master */
const MASTER_NO_OPL = '44444444-4444-4444-8444-444444444444';
/** product_masters 에 존재하지 않는 ID (store_local_products.id 를 흉내낸다) */
const LOCAL_PRODUCT_ID = '33333333-3333-4333-8333-333333333333';

const USER_SUPER_ADMIN = 'user-super-admin';
const USER_KPA_OPERATOR = 'user-kpa-operator';
const USER_NETURE_OPERATOR = 'user-neture-operator';
const USER_SUPPLIER_A = 'user-supplier-a';
const USER_SUPPLIER_B = 'user-supplier-b';
const USER_SUPPLIER_PENDING = 'user-supplier-pending';
const USER_STORE_OWNER = 'user-store-owner';
/** 겸업 — 공급자 링크(ACTIVE) + 매장 소속을 동시에 보유 */
const USER_SUPPLIER_AND_STORE = 'user-supplier-and-store';

const ORG_STORE = 'org-store-1';
const ORG_OTHER = 'org-store-2';

interface Fixture {
  /** user_id → role_assignments.role[] (is_active = true 인 것만) */
  roles: Record<string, string[]>;
  /** user_id → neture_suppliers */
  suppliers: Record<string, { id: string; status: string }>;
  /** supplier_id → 자기 offer 의 master_id[] */
  offers: Record<string, string[]>;
  /** user_id → organization_members.organization_id */
  orgs: Record<string, string>;
  /** organization_product_listings */
  listings: Array<{ organizationId: string; masterId: string; isActive: boolean }>;
  /** product_masters 에 실재하는 ID */
  masters: string[];
}

const FIXTURE: Fixture = {
  roles: {
    [USER_SUPER_ADMIN]: ['platform:super_admin'],
    // 서비스 운영자·관리자는 역할만으로 전역 권한을 얻지 못한다
    [USER_KPA_OPERATOR]: ['kpa:operator', 'kpa:admin'],
    [USER_NETURE_OPERATOR]: ['neture:operator', 'neture:admin'],
  },
  suppliers: {
    [USER_SUPPLIER_A]: { id: 'supplier-a', status: 'ACTIVE' },
    [USER_SUPPLIER_B]: { id: 'supplier-b', status: 'ACTIVE' },
    [USER_SUPPLIER_PENDING]: { id: 'supplier-p', status: 'PENDING' },
    [USER_SUPPLIER_AND_STORE]: { id: 'supplier-x', status: 'ACTIVE' },
  },
  offers: {
    'supplier-a': [MASTER_A],
    'supplier-b': [MASTER_B],
    'supplier-p': [MASTER_A],
    // 겸업 사용자의 자기 offer 는 MASTER_B — 매장이 진열한 MASTER_A 와 다르다
    'supplier-x': [MASTER_B],
  },
  orgs: {
    [USER_STORE_OWNER]: ORG_STORE,
    [USER_SUPPLIER_AND_STORE]: ORG_STORE,
  },
  listings: [{ organizationId: ORG_STORE, masterId: MASTER_A, isActive: true }],
  masters: [MASTER_A, MASTER_B, MASTER_NO_OPL],
};

interface QueryLogEntry {
  sql: string;
  params: unknown[];
}

function createStubDataSource(fixture: Fixture = FIXTURE): {
  dataSource: DataSource;
  queries: QueryLogEntry[];
} {
  const queries: QueryLogEntry[] = [];

  const query = async (sql: string, params: unknown[] = []): Promise<unknown[]> => {
    queries.push({ sql, params });

    if (/FROM role_assignments/.test(sql)) {
      const [userId, allowedRoles] = params as [string, string[]];
      const held = fixture.roles[userId] ?? [];
      return held.some((r) => allowedRoles.includes(r)) ? [{ '?column?': 1 }] : [];
    }

    if (/FROM neture_suppliers/.test(sql)) {
      const [userId] = params as [string];
      const supplier = fixture.suppliers[userId];
      return supplier ? [supplier] : [];
    }

    if (/FROM supplier_product_offers/.test(sql)) {
      const [supplierId, masterId] = params as [string, string];
      const owned = fixture.offers[supplierId] ?? [];
      return owned.includes(masterId) ? [{ '?column?': 1 }] : [];
    }

    if (/FROM organization_members/.test(sql)) {
      const [userId] = params as [string];
      const organizationId = fixture.orgs[userId];
      return organizationId ? [{ organization_id: organizationId }] : [];
    }

    if (/FROM organization_product_listings/.test(sql)) {
      const [organizationId, masterId] = params as [string, string];
      // is_active = true 조건은 SQL 에 포함되어 있어야 한다
      expect(sql).toMatch(/is_active\s*=\s*true/);
      const hit = fixture.listings.find(
        (l) => l.organizationId === organizationId && l.masterId === masterId && l.isActive,
      );
      return hit ? [{ '?column?': 1 }] : [];
    }

    if (/FROM product_masters/.test(sql)) {
      const [id] = params as [string];
      return fixture.masters.includes(id) ? [{ '?column?': 1 }] : [];
    }

    throw new Error(`Unexpected query in stub: ${sql}`);
  };

  return { dataSource: { query } as unknown as DataSource, queries };
}

const ALL_MODES: ProductAccessMode[] = ['write', 'manage_read', 'render_read'];

async function resolve(
  userId: string | undefined,
  productId: string,
  mode: ProductAccessMode,
  fixture: Fixture = FIXTURE,
) {
  const { dataSource, queries } = createStubDataSource(fixture);
  const result = await resolveGlobalProductResourceAccess(dataSource, productId, userId, mode);
  return { result, queries };
}

describe('resolveGlobalProductResourceAccess — 전역 ProductMaster 자원 접근 판정', () => {
  describe('platform:super_admin', () => {
    it.each(ALL_MODES)('임의 ProductMaster 에 대해 %s 허용', async (mode) => {
      for (const master of [MASTER_A, MASTER_B]) {
        const { result } = await resolve(USER_SUPER_ADMIN, master, mode);
        expect(result.allowed).toBe(true);
        expect(result.actorType).toBe('platform_admin');
      }
    });

    it('service 경계 조회(service_products / service_key)를 수행하지 않는다', async () => {
      const { queries } = await resolve(USER_SUPER_ADMIN, MASTER_A, 'write');
      const joined = queries.map((q) => q.sql).join('\n');
      expect(joined).not.toMatch(/service_products/);
      expect(joined).not.toMatch(/service_key/);
    });
  });

  describe('서비스 운영자·관리자 — 역할만으로 전역 권한 없음', () => {
    it.each([
      ['kpa:operator', USER_KPA_OPERATOR],
      ['neture:operator', USER_NETURE_OPERATOR],
    ])('%s 는 전역 쓰기 거부', async (_label, userId) => {
      const { result } = await resolve(userId, MASTER_A, 'write');
      expect(result.allowed).toBe(false);
      expect(result.actorType).toBe('none');
    });

    it.each([
      ['kpa:operator', USER_KPA_OPERATOR],
      ['neture:operator', USER_NETURE_OPERATOR],
    ])('%s 는 관리 조회도 거부 (관계 없음)', async (_label, userId) => {
      const { result } = await resolve(userId, MASTER_A, 'manage_read');
      expect(result.allowed).toBe(false);
    });

    it('role 문자열 prefix/suffix 매칭으로 우회되지 않는다', async () => {
      const fixture: Fixture = {
        ...FIXTURE,
        roles: { 'user-trick': ['platform:super_admin_readonly', 'super_admin', 'admin'] },
      };
      const { result } = await resolve('user-trick', MASTER_A, 'write', fixture);
      expect(result.allowed).toBe(false);
    });
  });

  describe('공급자 — 자기 offer 의 master 만', () => {
    it('공급자 A 는 자기 offer master 에 대해 전 모드 허용', async () => {
      for (const mode of ALL_MODES) {
        const { result } = await resolve(USER_SUPPLIER_A, MASTER_A, mode);
        expect(result.allowed).toBe(true);
        expect(result.actorType).toBe('supplier');
        expect(result.supplierId).toBe('supplier-a');
      }
    });

    it('공급자 A 는 공급자 B 의 master 에 대해 거부', async () => {
      for (const mode of ALL_MODES) {
        const { result } = await resolve(USER_SUPPLIER_A, MASTER_B, mode);
        expect(result.allowed).toBe(false);
        expect(result.denyReason).toBe('NO_RELATION_TO_MASTER');
      }
    });

    it('비ACTIVE 공급자는 자기 master 라도 쓰기 거부 (조회는 허용)', async () => {
      const write = await resolve(USER_SUPPLIER_PENDING, MASTER_A, 'write');
      expect(write.result.allowed).toBe(false);
      expect(write.result.denyReason).toBe('WRITE_REQUIRES_ACTIVE_SUPPLIER');

      const read = await resolve(USER_SUPPLIER_PENDING, MASTER_A, 'manage_read');
      expect(read.result.allowed).toBe(true);
    });

    it.each(['write', 'manage_read'] as ProductAccessMode[])(
      '타 공급자 master + %s 는 매장 관계를 평가하지 않고 즉시 종료',
      async (mode) => {
        // 공급자 B 가 동시에 매장 소속이어도 write/manage_read 는 offer 불일치 시점에 종료된다
        const fixture: Fixture = {
          ...FIXTURE,
          orgs: { ...FIXTURE.orgs, [USER_SUPPLIER_B]: ORG_STORE },
        };
        const { result, queries } = await resolve(USER_SUPPLIER_B, MASTER_A, mode, fixture);
        expect(result.allowed).toBe(false);
        expect(result.denyReason).toBe('NO_RELATION_TO_MASTER');
        expect(queries.some((q) => /organization_members/.test(q.sql))).toBe(false);
      },
    );
  });

  /**
   * WO-O4O-PRODUCT-AI-RENDER-READ-MULTI-ACTOR-FALLTHROUGH-V1
   * 공급자 관계와 매장 관계는 독립적으로 평가된다. 확대 범위는 render_read 로 한정한다.
   */
  describe('겸업 사용자 — 공급자 링크 + 매장 소속', () => {
    it('자기 offer master + render_read → 공급자로 허용, 매장 관계는 조회조차 하지 않는다', async () => {
      const { result, queries } = await resolve(USER_SUPPLIER_AND_STORE, MASTER_B, 'render_read');
      expect(result.allowed).toBe(true);
      expect(result.actorType).toBe('supplier');
      expect(result.grantReason).toBe('OWN_SUPPLIER_OFFER');
      expect(queries.some((q) => /organization_members/.test(q.sql))).toBe(false);
    });

    it('타 supplier master + active OPL + render_read → 매장 관계로 허용', async () => {
      const { result } = await resolve(USER_SUPPLIER_AND_STORE, MASTER_A, 'render_read');
      expect(result.allowed).toBe(true);
      expect(result.actorType).toBe('store');
      expect(result.grantReason).toBe('ACTIVE_ORGANIZATION_LISTING');
      expect(result.organizationId).toBe(ORG_STORE);
    });

    it('타 supplier master + active OPL 없음 + render_read → 403', async () => {
      const { result } = await resolve(USER_SUPPLIER_AND_STORE, MASTER_NO_OPL, 'render_read');
      expect(result.allowed).toBe(false);
      expect(result.denyReason).toBe('NO_RELATION_TO_MASTER');
    });

    it('타 supplier master + active OPL + write → 403 (fallthrough 금지)', async () => {
      const { result, queries } = await resolve(USER_SUPPLIER_AND_STORE, MASTER_A, 'write');
      expect(result.allowed).toBe(false);
      expect(result.denyReason).toBe('NO_RELATION_TO_MASTER');
      expect(queries.some((q) => /organization_/.test(q.sql))).toBe(false);
    });

    it('타 supplier master + active OPL + manage_read → 403 (fallthrough 금지)', async () => {
      const { result, queries } = await resolve(USER_SUPPLIER_AND_STORE, MASTER_A, 'manage_read');
      expect(result.allowed).toBe(false);
      expect(result.denyReason).toBe('NO_RELATION_TO_MASTER');
      expect(queries.some((q) => /organization_/.test(q.sql))).toBe(false);
    });

    it('타 조직이 진열한 master 는 겸업 사용자에게도 render_read 거부', async () => {
      const fixture: Fixture = {
        ...FIXTURE,
        listings: [{ organizationId: ORG_OTHER, masterId: MASTER_A, isActive: true }],
      };
      const { result } = await resolve(USER_SUPPLIER_AND_STORE, MASTER_A, 'render_read', fixture);
      expect(result.allowed).toBe(false);
    });

    it('inactive OPL 은 겸업 사용자에게도 render_read 거부', async () => {
      const fixture: Fixture = {
        ...FIXTURE,
        listings: [{ organizationId: ORG_STORE, masterId: MASTER_A, isActive: false }],
      };
      const { result } = await resolve(USER_SUPPLIER_AND_STORE, MASTER_A, 'render_read', fixture);
      expect(result.allowed).toBe(false);
    });
  });

  describe('매장 — active OPL 기반 render_read 전용', () => {
    it('active OPL 보유 매장은 render_read 만 허용', async () => {
      const render = await resolve(USER_STORE_OWNER, MASTER_A, 'render_read');
      expect(render.result.allowed).toBe(true);
      expect(render.result.actorType).toBe('store');
      expect(render.result.organizationId).toBe(ORG_STORE);
    });

    it('active OPL 보유 매장도 write / manage_read 는 거부', async () => {
      const write = await resolve(USER_STORE_OWNER, MASTER_A, 'write');
      expect(write.result.allowed).toBe(false);
      expect(write.result.denyReason).toBe('STORE_WRITE_FORBIDDEN');

      const manage = await resolve(USER_STORE_OWNER, MASTER_A, 'manage_read');
      expect(manage.result.allowed).toBe(false);
    });

    it('타 조직 master 는 render_read 도 거부', async () => {
      for (const mode of ALL_MODES) {
        const { result } = await resolve(USER_STORE_OWNER, MASTER_B, mode);
        expect(result.allowed).toBe(false);
      }
    });

    it('OPL 이 비활성이면 거부', async () => {
      const fixture: Fixture = {
        ...FIXTURE,
        listings: [{ organizationId: ORG_STORE, masterId: MASTER_A, isActive: false }],
      };
      const { result } = await resolve(USER_STORE_OWNER, MASTER_A, 'render_read', fixture);
      expect(result.allowed).toBe(false);
    });

    it('OPL 판정에 offer_id → supplier_product_offers 경유를 사용하지 않는다', async () => {
      const { queries } = await resolve(USER_STORE_OWNER, MASTER_A, 'render_read');
      expect(queries.some((q) => /supplier_product_offers/.test(q.sql))).toBe(false);
      const oplQuery = queries.find((q) => /organization_product_listings/.test(q.sql));
      expect(oplQuery?.sql).toMatch(/master_id\s*=\s*\$2/);
    });

    it('다른 조직 소속 사용자는 ORG 불일치로 거부', async () => {
      const fixture: Fixture = {
        ...FIXTURE,
        orgs: { [USER_STORE_OWNER]: ORG_OTHER },
      };
      const { result } = await resolve(USER_STORE_OWNER, MASTER_A, 'render_read', fixture);
      expect(result.allowed).toBe(false);
    });
  });

  describe('입력 계약', () => {
    it('미인증(userId 없음)은 거부', async () => {
      const { result } = await resolve(undefined, MASTER_A, 'render_read');
      expect(result.allowed).toBe(false);
      expect(result.denyReason).toBe('NO_USER');
    });

    it('UUID 형식이 아니면 DB 조회 없이 거부 (500 방지)', async () => {
      const { result, queries } = await resolve(USER_SUPER_ADMIN, 'not-a-uuid', 'write');
      expect(result.allowed).toBe(false);
      expect(result.denyReason).toBe('INVALID_PRODUCT_ID');
      expect(queries).toHaveLength(0);
    });

    it('아무 관계 없는 사용자는 전 모드 거부', async () => {
      for (const mode of ALL_MODES) {
        const { result } = await resolve('user-nobody', MASTER_A, mode);
        expect(result.allowed).toBe(false);
      }
    });
  });
});

describe('productMasterExists — §8.1 ID 계약 (local product UUID 로 전역 row 생성 금지)', () => {
  it('존재하는 ProductMaster 는 true', async () => {
    const { dataSource } = createStubDataSource();
    await expect(productMasterExists(dataSource, MASTER_A)).resolves.toBe(true);
  });

  it('local product UUID 는 false → 호출부에서 404, 전역 row 생성 0', async () => {
    const { dataSource } = createStubDataSource();
    await expect(productMasterExists(dataSource, LOCAL_PRODUCT_ID)).resolves.toBe(false);
  });

  it('형식이 잘못된 ID 는 DB 조회 없이 false', async () => {
    const { dataSource, queries } = createStubDataSource();
    await expect(productMasterExists(dataSource, 'local-123')).resolves.toBe(false);
    expect(queries).toHaveLength(0);
  });

  it('local product UUID 는 접근 판정에서도 관계가 성립하지 않는다', async () => {
    // 매장이 자기 로컬 상품 ID 로 전역 자원에 접근해도 OPL(master_id) 매칭이 없다
    const { result } = await resolve(USER_STORE_OWNER, LOCAL_PRODUCT_ID, 'render_read');
    expect(result.allowed).toBe(false);
  });
});

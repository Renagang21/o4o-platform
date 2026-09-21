/**
 * WO-O4O-UNIFIED-STORE-WORKSPACE-FOUNDATION-V1 — Unified Store Workspace Foundation 계약 테스트
 *
 * 검증 축:
 *   1. `resolveAccessibleStores` — resolveStoreServices 와 같은 후보 집합 · 이름 부착 · 자동 선택 없음 · 결정적 정렬
 *   2. `GET /work-scope/accessible-stores` 는 requireAuth 뒤에만 등록되고 추가(additive)다 — store-services 계약 불변
 *   3. Store ≠ 서비스: catalog 에 'store' serviceKey 없음 · handoff_tokens NOT NULL 결정 항목 그대로(가짜 serviceKey 우회 0)
 *   4. services/web-store 는 serviceKey 를 갖지 않는다 · CORS 정확 origin · 세 서비스의 기존 /store 라우트 불변(기능 이전 0)
 *
 * 순수 단위 테스트 — DB 접속 없음.
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { resolveAccessibleStores } from '../utils/service-tenant.resolver.js';
import { O4O_SERVICES } from '../config/service-catalog.js';

type Row = Record<string, unknown>;
const ROOT = resolve(__dirname, '..');
const REPO = resolve(ROOT, '../../..');
const read = (p: string) => readFileSync(resolve(ROOT, p), 'utf8');
const readRepo = (p: string) => readFileSync(resolve(REPO, p), 'utf8');
const norm = (s: string) => s.replace(/\s+/g, ' ').trim();

function makeDataSource(responses: Row[][]) {
  const calls: Array<{ sql: string; params: unknown[] }> = [];
  const queue = [...responses];
  const dataSource: any = {
    isInitialized: true,
    query: jest.fn(async (sql: string, params: unknown[] = []) => {
      calls.push({ sql, params });
      return queue.shift() ?? [];
    }),
  };
  return { dataSource, calls };
}

const USER_X = 'user-x';
const STORE_A = 'org-store-a';
const STORE_B = 'org-store-b';
const memberRow = (organizationId: string, role = 'owner') => ({
  organization_id: organizationId, role, is_primary: false, joined_at: '2025-01-01',
});

// ─────────────────────────────────────────────────────────────────────────────
// 1. resolveAccessibleStores
// ─────────────────────────────────────────────────────────────────────────────

describe('resolveAccessibleStores — Store Selector 입력 (WO §3-③)', () => {
  it('후보 집합은 organization_members(서비스 조건 없음) 이고, 이름은 organizations 에서 붙인다 — 2 질의', async () => {
    const { dataSource, calls } = makeDataSource([
      [memberRow(STORE_B), memberRow(STORE_A, 'manager')],
      [{ id: STORE_A, name: '가나약국' }, { id: STORE_B, name: '다라약국' }],
    ]);
    const stores = await resolveAccessibleStores(dataSource, USER_X);
    expect(calls).toHaveLength(2);
    expect(norm(calls[0].sql)).toContain('organization_members');
    expect(norm(calls[0].sql)).not.toContain('organization_service_enrollments');
    expect(calls[0].params[0]).toBe(USER_X);
    expect(norm(calls[1].sql)).toContain('FROM organizations');
    expect(calls[1].params).toEqual([[STORE_B, STORE_A]]);
    // 자동 선택 없음 — 2개 모두 돌려주고 이름 오름차순
    expect(stores).toEqual([
      { organizationId: STORE_A, organizationName: '가나약국', memberRole: 'manager' },
      { organizationId: STORE_B, organizationName: '다라약국', memberRole: 'owner' },
    ]);
  });

  it('이름이 같으면 organizationId 오름차순 · 이름 없는 조직은 빈 문자열', async () => {
    const { dataSource } = makeDataSource([
      [memberRow(STORE_B), memberRow(STORE_A)],
      [{ id: STORE_B, name: null }],
    ]);
    const stores = await resolveAccessibleStores(dataSource, USER_X);
    expect(stores.map((s) => [s.organizationId, s.organizationName])).toEqual([[STORE_A, ''], [STORE_B, '']]);
  });

  it('접근 가능한 매장 0 이면 organizations 를 조회하지 않고 [] (가입 안내 분기)', async () => {
    const { dataSource, calls } = makeDataSource([[]]);
    expect(await resolveAccessibleStores(dataSource, USER_X)).toEqual([]);
    expect(calls).toHaveLength(1);
  });

  it('userId 가 비어 있으면 질의 없이 []', async () => {
    const { dataSource, calls } = makeDataSource([]);
    expect(await resolveAccessibleStores(dataSource, '')).toEqual([]);
    expect(calls).toHaveLength(0);
  });

  it('응답 필드는 organizationId · organizationName · memberRole 뿐 (§15 최소 필드)', async () => {
    const { dataSource } = makeDataSource([[memberRow(STORE_A)], [{ id: STORE_A, name: 'A', business_number: 'x' }]]);
    const [s] = await resolveAccessibleStores(dataSource, USER_X);
    expect(Object.keys(s).sort()).toEqual(['memberRole', 'organizationId', 'organizationName']);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 2. 라우트 등록 — additive · requireAuth
// ─────────────────────────────────────────────────────────────────────────────

describe('GET /work-scope/accessible-stores (additive)', () => {
  const routes = read('routes/work-scope.routes.ts');

  it('requireAuth 뒤에 등록되고 resolveAccessibleStores 를 호출한다', () => {
    expect(routes).toMatch(/router\.get\(\s*'\/accessible-stores',\s*requireAuth,/);
    expect(routes).toContain('resolveAccessibleStores(dataSource, userId)');
    expect(routes).toContain('res.json({ success: true, data: { stores } })');
  });

  it('기존 store-services 계약(organizationId query · NOT_STORE_MEMBER 재검증)은 그대로다', () => {
    expect(routes).toMatch(/router\.get\(\s*'\/store-services',\s*requireAuth,/);
    expect(routes).toContain('resolveStoreServices(dataSource, { userId, organizationId })');
    expect(routes).toContain('res.json({ success: true, data });');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 3. Store ≠ 서비스 — 가짜 serviceKey 0 · handoff 결정 항목 불변
// ─────────────────────────────────────────────────────────────────────────────

describe('Store Workspace 는 서비스가 아니다 (IR §13)', () => {
  it("service-catalog 에 key 'store' 가 없다", () => {
    expect(O4O_SERVICES.map((s) => s.key)).not.toContain('store');
    expect(read('config/service-catalog.ts')).not.toMatch(/key:\s*'store'/);
  });

  it('service handoff 라우트 · handoff_tokens.target_service_key NOT NULL 은 이번 WO 에서 바뀌지 않았다 (DDL 0 · STOP 보고)', () => {
    const authRoutes = read('modules/auth/routes/auth.routes.ts');
    expect(authRoutes).toMatch(/router\.post\(\s*'\/handoff',\s*requireAuth,/);
    expect(authRoutes).toMatch(/router\.post\(\s*'\/handoff\/exchange',\s*asyncHandler/);
    expect(read('database/migrations/20270311000000-CreateHandoffTokens.ts')).toContain('"target_service_key" varchar(64) NOT NULL');
    const handoff = read('modules/auth/controllers/handoff.controller.ts');
    expect(handoff).not.toContain('targetWorkspace');
    expect(handoff).not.toContain("'store'");
  });

  it('CORS 는 store.neture.co.kr 정확 origin 1개만 추가한다 (와일드카드 0)', () => {
    const cors = read('bootstrap/setup-middlewares.ts');
    expect(cors).toContain('"https://store.neture.co.kr"');
    expect(cors).not.toContain('*.neture.co.kr');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 4. services/web-store — 조립 계층 · 기능 이전 0
// ─────────────────────────────────────────────────────────────────────────────

describe('services/web-store 조립 계층 (WO §3-①·⑥)', () => {
  const workspace = readRepo('services/web-store/src/config/workspace.ts');
  const authCtx = readRepo('services/web-store/src/contexts/AuthContext.tsx');
  const storeCtx = readRepo('services/web-store/src/contexts/StoreContext.tsx');
  const storeApi = readRepo('services/web-store/src/lib/storeApi.ts');

  it('SERVICE_KEY 가 없고 organizationId 가 1차 축이다', () => {
    expect(workspace).not.toMatch(/const SERVICE_KEY/);
    expect(workspace).toContain("WORKSPACE_KEY = 'store'");
    // useServiceAuth 설정 객체에 serviceKey 를 넘기지 않는다(멤버십 타입의 serviceKey 필드는 무관)
    expect(authCtx).toMatch(/useServiceAuth<StoreUser>\(useMemo\(\(\) => \(\{[^}]*authClient, getAccessToken, toUser,[^}]*\}\)/);
    expect(authCtx).not.toMatch(/serviceKey\s*:\s*['"]/);
    expect(storeApi).toContain("'/work-scope/accessible-stores'");
    expect(storeApi).toContain('/work-scope/store-services?organizationId=');
  });

  it('Store Selector: 1개 자동 · 2개 이상 선택 · sessionStorage 복원 · 서버 NOT_STORE_MEMBER 시 선택 폐기', () => {
    expect(storeCtx).toContain('if (stores.length === 1) return stores[0].organizationId;');
    expect(storeCtx).toContain('clearSelectedOrganizationId();');
    expect(readRepo('services/web-store/src/lib/storeSelection.ts')).toContain('sessionStorage');
  });

  it('root nav 는 상위 6개뿐이다', () => {
    const keys = [...workspace.matchAll(/key: '([a-z-]+)', label:/g)].map((m) => m[1]);
    expect(keys).toEqual(['home', 'my-store', 'service-work', 'store-hub', 'my-services', 'settings']);
  });

  it('세 서비스의 기존 /store 라우트는 그대로다 (기능 이전 0)', () => {
    expect(readRepo('services/web-kpa-society/src/App.tsx')).toContain('<Route path="/store/workspace"');
    expect(readRepo('services/web-k-cosmetics/src/App.tsx')).toContain("'/store'");
    expect(readRepo('services/web-pharmacy-hub/src/App.tsx')).toMatch(/\/store/);
  });

  it('deploy-web-services.yml 에 store-web 이 등록되어 있다', () => {
    const wf = readRepo('.github/workflows/deploy-web-services.yml');
    expect(wf).toContain("- 'services/web-store/**'");
    expect(wf).toContain('VITE_SERVICE_URL_STORE: https://store.neture.co.kr');
    expect(wf).toContain('deploy-store:');
    expect(wf).toContain('gcloud run deploy store-web');
  });
});

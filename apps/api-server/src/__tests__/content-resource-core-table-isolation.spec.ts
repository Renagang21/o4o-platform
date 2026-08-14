/**
 * Content/Resource Core — cross-service table isolation
 *
 * WO-O4O-COMMUNITY-CONTENT-RESOURCE-BACKEND-CORE-COMMONIZATION-V1 §12
 *
 * 이 축의 서비스 경계는 **물리 테이블 분리 그 자체**다 (3원장에 service_key 컬럼이 없다).
 * 공통 Core 도입으로 그 경계가 약해지지 않았음을 실제 생성 SQL 로 검증한다.
 *
 * fake DataSource 로 Core 가 만든 쿼리를 가로채 어떤 테이블을 건드리는지 assert 한다 — DB 불필요.
 */

import {
  assertSafeTableName,
  createContentResourceCore,
  defaultListVisibility,
  deriveUsageType,
  sanitizeContentTags,
  type ContentResourceConfig,
} from '../routes/common/content-resource/content-resource-core.js';
import { GLYCOPHARM_CONTENT_CONFIG } from '../routes/glycopharm/controllers/resources.controller.js';
import { COSMETICS_CONTENT_CONFIG } from '../routes/cosmetics/controllers/resources.controller.js';
import { createKpaContentResourceConfig, resolveKpaListVisibility } from '../routes/kpa/controllers/kpa-content-resource.config.js';

// ─────────────────────────────────────────────────────────────────────────────
// test doubles
// ─────────────────────────────────────────────────────────────────────────────

function createSpyDataSource(rows: any[] = []) {
  const queries: string[] = [];
  const ds: any = {
    queries,
    async query(sql: string) {
      queries.push(sql);
      // COUNT 쿼리는 [{total}] 형태를 요구한다
      if (/COUNT\(\*\)/i.test(sql)) return [{ total: rows.length }];
      return rows;
    },
  };
  return ds;
}

function createRes() {
  const res: any = {
    statusCode: 200,
    body: undefined,
    status(code: number) { res.statusCode = code; return res; },
    json(payload: unknown) { res.body = payload; return res; },
  };
  return res;
}

function req(overrides: Record<string, any> = {}): any {
  return { query: {}, params: {}, body: {}, ...overrides };
}

/** 쿼리에서 실제로 접근한 콘텐츠 테이블 이름들을 뽑는다. */
function touchedTables(queries: string[]): string[] {
  const found = new Set<string>();
  for (const q of queries) {
    for (const m of q.matchAll(/\b(?:FROM|INTO|UPDATE)\s+([a-z_][a-z0-9_]*)/gi)) {
      if (/_contents$/.test(m[1])) found.add(m[1]);
    }
  }
  return [...found];
}

const KPA_CONFIG = createKpaContentResourceConfig({
  mapCmsStatus: (s: string) => s,
  audit: () => {},
});

const SERVICE_CASES: Array<{ name: string; config: ContentResourceConfig; table: string }> = [
  { name: 'GlycoPharm', config: GLYCOPHARM_CONTENT_CONFIG, table: 'glycopharm_contents' },
  { name: 'K-Cosmetics', config: COSMETICS_CONTENT_CONFIG, table: 'cosmetics_contents' },
  { name: 'KPA-Society', config: KPA_CONFIG, table: 'kpa_contents' },
];

const OTHER_TABLES = ['glycopharm_contents', 'cosmetics_contents', 'kpa_contents'];

// ─────────────────────────────────────────────────────────────────────────────
// 1. tableName 안전 계약
// ─────────────────────────────────────────────────────────────────────────────

describe('tableName 안전 계약 (WO §4)', () => {
  it('미주입이면 라우터 생성 시점에 실패한다 (기본값 없음)', () => {
    expect(() => assertSafeTableName(undefined)).toThrow(/tableName 은 필수/);
    expect(() => assertSafeTableName('')).toThrow(/tableName 은 필수/);
  });

  it('Core 생성 시 즉시 검증한다 — 첫 요청까지 미루지 않는다', () => {
    const ds = createSpyDataSource();
    expect(() =>
      createContentResourceCore(ds, { ...GLYCOPHARM_CONTENT_CONFIG, tableName: undefined as any }),
    ).toThrow(/tableName 은 필수/);
  });

  it('식별자 패턴을 벗어나면 거부한다 (동적 SQL 안전)', () => {
    for (const bad of [
      'glycopharm_contents; DROP TABLE users',
      'glycopharm_contents--',
      'GlycopharmContents',
      'public.glycopharm_contents',
      '"glycopharm_contents"',
      '1_contents',
      'glycopharm contents',
    ]) {
      expect(() => assertSafeTableName(bad)).toThrow(/안전하지 않은 tableName/);
    }
  });

  it('서비스 config 3종은 모두 안전한 테이블명을 명시 주입한다', () => {
    for (const { config, table } of SERVICE_CASES) {
      expect(config.tableName).toBe(table);
      expect(assertSafeTableName(config.tableName)).toBe(table);
    }
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 2. cross-service table isolation — 실제 생성 SQL 검사
// ─────────────────────────────────────────────────────────────────────────────

describe('cross-service table isolation', () => {
  it.each(SERVICE_CASES)('$name — 모든 read/write 가 $table 만 건드린다', async ({ config, table }) => {
    const ds = createSpyDataSource([{ id: 'x', title: 't', status: 'draft', created_by: 'u1' }]);
    const core = createContentResourceCore(ds, config);

    await core.list(req({ query: { search: 'a', tag: 'b', category: 'c', status: 'draft' } }), createRes());
    await core.detail(req({ params: { id: 'x' } }), createRes());
    await core.incrementView(req({ params: { id: 'x' } }), createRes());
    await core.remove(req({ params: { id: 'x' }, user: { id: 'u1' } }) , createRes());
    await core.operatorList(req({ query: { search: 'a' } }), createRes());
    await core.operatorUpdateStatus(req({ params: { id: 'x' }, body: { status: 'published' }, user: {} }), createRes());
    await core.operatorRemove(req({ params: { id: 'x' }, user: {} }), createRes());

    expect(ds.queries.length).toBeGreaterThan(0);
    expect(touchedTables(ds.queries)).toEqual([table]);

    // 다른 서비스 테이블로의 fallback 이 한 번도 없어야 한다
    for (const other of OTHER_TABLES.filter((t) => t !== table)) {
      expect(`${table}->${other}:${ds.queries.some((q) => q.includes(other))}`).toBe(`${table}->${other}:false`);
    }
  });

  it('요청 입력으로 테이블을 바꿀 수 없다', async () => {
    const ds = createSpyDataSource();
    const core = createContentResourceCore(ds, GLYCOPHARM_CONTENT_CONFIG);

    // query/body/params 에 테이블명을 심어도 무시돼야 한다
    await core.list(
      req({
        query: { tableName: 'kpa_contents', table: 'kpa_contents', sub_type: 'resource' },
        body: { tableName: 'cosmetics_contents' },
        params: { tableName: 'kpa_contents' },
      }),
      createRes(),
    );

    expect(touchedTables(ds.queries)).toEqual(['glycopharm_contents']);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 3. 가시성 계약 보존
// ─────────────────────────────────────────────────────────────────────────────

describe('목록 가시성 (계약 보존)', () => {
  it('기본 규칙 — GP/KCos 기존 동작', () => {
    expect(defaultListVisibility({ my: 'true', userId: 'u', user: {} }).visibility).toBe('owner-only');
    expect(defaultListVisibility({ user: undefined } as any).visibility).toBe('published-only');
    expect(defaultListVisibility({ userId: 'u', user: {} }).visibility).toBe('published-or-own');
    // status 지정 시 가시성 절 없이 그 status 만 — 기존 구현과 동일
    const withStatus = defaultListVisibility({ userId: 'u', statusFilter: 'draft', user: {} });
    expect(withStatus.visibility).toBe('none');
    expect(withStatus.applyExplicitStatus).toBe(true);
  });

  it('가시성 절과 status 필터는 독립이다 (my=true & status=draft)', async () => {
    const ds = createSpyDataSource();
    const core = createContentResourceCore(ds, GLYCOPHARM_CONTENT_CONFIG);
    await core.list(req({ query: { my: 'true', status: 'draft' }, user: { id: 'u1' } }), createRes());
    const listSql = ds.queries.find((q) => /SELECT c\.id/.test(q)) ?? '';
    expect(listSql).toContain('c.created_by =');
    expect(listSql).toContain('c.status =');
  });

  it('KPA status=all — 운영자는 status 조건 없음, 일반 회원은 공개+본인', () => {
    const operator = { roles: ['kpa:operator'] };
    const member = { roles: [] };

    const asOperator = resolveKpaListVisibility({ userId: 'u', statusFilter: 'all', user: operator });
    expect(asOperator.visibility).toBe('none');
    expect(asOperator.applyExplicitStatus).toBe(false);

    const asMember = resolveKpaListVisibility({ userId: 'u', statusFilter: 'all', user: member });
    expect(asMember.visibility).toBe('published-or-own');
    expect(asMember.applyExplicitStatus).toBe(false);
  });

  it("KPA status=all 은 필터 값이 아니라 모드 지시자다 (status='all' 조건이 생기지 않는다)", async () => {
    const ds = createSpyDataSource();
    const core = createContentResourceCore(ds, KPA_CONFIG);
    await core.list(req({ query: { status: 'all' }, user: { id: 'u', roles: ['kpa:operator'] } }), createRes());
    const listSql = ds.queries.find((q) => /SELECT c\.id/.test(q)) ?? '';
    expect(listSql).not.toContain('c.status =');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 4. 서비스별 필터 계약 (없던 필터를 추가하지 않는다)
// ─────────────────────────────────────────────────────────────────────────────

describe('필터 계약', () => {
  it('KPA 회원 목록은 content_type/sub_type 만 읽는다 (usage_type/source_type 무시)', () => {
    expect(KPA_CONFIG.listFilters.map((f) => f.param).sort()).toEqual(['content_type', 'sub_type']);
  });

  it('GP/KCos 회원 목록은 sub_type/usage_type/source_type 을 읽는다', () => {
    for (const config of [GLYCOPHARM_CONTENT_CONFIG, COSMETICS_CONTENT_CONFIG]) {
      expect(config.listFilters.map((f) => f.param).sort()).toEqual(['source_type', 'sub_type', 'usage_type']);
    }
  });

  it('운영자 목록 필터는 3서비스 동일 (source_type/usage_type)', () => {
    for (const { config } of SERVICE_CASES) {
      expect(config.operatorListFilters.map((f) => f.param).sort()).toEqual(['source_type', 'usage_type']);
    }
  });

  it('KPA 목록 select 는 content_type 을 포함한다 (KPA 전용 컬럼)', () => {
    expect(KPA_CONFIG.listColumns).toContain('c.content_type');
    expect(GLYCOPHARM_CONTENT_CONFIG.listColumns).not.toContain('c.content_type');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 5. 공통 유틸 계약
// ─────────────────────────────────────────────────────────────────────────────

describe('공통 유틸', () => {
  it('deriveUsageType — source_type 기반 기본값', () => {
    expect(deriveUsageType(undefined, 'external')).toBe('LINK');
    expect(deriveUsageType(undefined, 'upload')).toBe('DOWNLOAD');
    expect(deriveUsageType(undefined, 'manual')).toBe('READ');
    expect(deriveUsageType('COPY', 'manual')).toBe('COPY');
    expect(deriveUsageType('BOGUS', 'external')).toBe('LINK');
  });

  it('sanitizeContentTags — # 제거·중복 제거·30자 초과 제외', () => {
    expect(sanitizeContentTags(['#a', 'a', ' b ', 'x'.repeat(31), ''])).toEqual(['a', 'b']);
    expect(sanitizeContentTags('nope' as any)).toEqual([]);
  });

  it('operator 판정은 config 의 role 목록만 본다', () => {
    const ds = createSpyDataSource();
    const gp = createContentResourceCore(ds, GLYCOPHARM_CONTENT_CONFIG);
    expect(gp.isOperatorOrAdmin({ roles: ['glycopharm:operator'] })).toBe(true);
    expect(gp.isOperatorOrAdmin({ roles: ['platform:super_admin'] })).toBe(true);
    // 타 서비스 운영자 역할로는 통과하지 못한다
    expect(gp.isOperatorOrAdmin({ roles: ['cosmetics:operator'] })).toBe(false);
    expect(gp.isOperatorOrAdmin({ roles: ['kpa:operator'] })).toBe(false);
    expect(gp.isOperatorOrAdmin({})).toBe(false);
  });
});

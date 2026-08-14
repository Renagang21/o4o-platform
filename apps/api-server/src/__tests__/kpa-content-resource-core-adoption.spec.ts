/**
 * KPA content/resource — Core adoption closure regression
 *
 * WO-O4O-COMMUNITY-CONTENT-RESOURCE-KPA-CORE-ADOPTION-CLOSURE-V1
 * 선행: WO-O4O-COMMUNITY-CONTENT-RESOURCE-BACKEND-CORE-COMMONIZATION-V1 (부분 완료분 마감)
 *
 * KPA 6 handler 를 공통 Core 로 옮겼다. 이 스펙은 **옮기면서 깨지기 쉬운 KPA 고유 계약**을 고정한다.
 *
 *   1. 6 handler 가 실제로 Core 에 배선됐고 half-wired 참조가 없다
 *   2. detail / create / update / recommend / AI 3종은 **KPA 라우터에 그대로 남았다**
 *      (detail 은 POLICY_DIFFERENT — Core 로 옮기면 draft/private 접근 회귀)
 *   3. status=all 운영자 분기 · audit hook · KPA 필드 매핑 보존
 *   4. kpa_contents 외 테이블 미접근
 *   5. repository/entity 전환 없음 (raw SQL 계약 유지 — KpaContent 엔티티 drift 때문)
 */

import * as fs from 'fs';
import * as path from 'path';
import {
  createContentResourceCore,
  type ContentResourceConfig,
} from '../routes/common/content-resource/content-resource-core.js';
import {
  createKpaContentResourceConfig,
  resolveKpaListVisibility,
  KPA_OPERATOR_RESOURCE_COLUMNS,
} from '../routes/kpa/controllers/kpa-content-resource.config.js';

const KPA_ROUTES = fs.readFileSync(
  path.resolve(__dirname, '../routes/kpa/kpa.routes.ts'),
  'utf8',
);

// ─────────────────────────────────────────────────────────────────────────────
// test doubles
// ─────────────────────────────────────────────────────────────────────────────

function createSpyDataSource(rows: any[] = [{ id: 'x', title: 't', status: 'draft', created_by: 'u1' }]) {
  const queries: string[] = [];
  const ds: any = {
    queries,
    async query(sql: string) {
      queries.push(sql);
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
    status(c: number) { res.statusCode = c; return res; },
    json(b: unknown) { res.body = b; return res; },
  };
  return res;
}

const req = (o: Record<string, any> = {}): any => ({ query: {}, params: {}, body: {}, ...o });

interface AuditCall { action: string; entityType: string; entityId: string; meta?: any }

function buildKpaCore(auditSink: AuditCall[]) {
  const config: ContentResourceConfig = createKpaContentResourceConfig({
    mapCmsStatus: (s: string) => `mapped:${s}`,
    audit: (_user, action, entityType, entityId, meta) => {
      auditSink.push({ action, entityType, entityId, meta });
    },
  });
  const ds = createSpyDataSource();
  return { core: createContentResourceCore(ds, config), ds, config };
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. 배선 (adoption 완료 여부)
// ─────────────────────────────────────────────────────────────────────────────

describe('KPA 6 handler Core 배선', () => {
  const WIRED = [
    "contentRouter.get('/', optionalAuth as any, asyncHandler(kpaContentCore.list))",
    "contentRouter.delete('/:id', authenticate, asyncHandler(kpaContentCore.remove))",
    "contentRouter.post('/:id/view', optionalAuth as any, asyncHandler(kpaContentCore.incrementView))",
    'asyncHandler(kpaContentCore.operatorList)',
    'asyncHandler(kpaContentCore.operatorUpdateStatus)',
    'asyncHandler(kpaContentCore.operatorRemove)',
  ];

  it.each(WIRED)('배선됨: %s', (snippet) => {
    expect(KPA_ROUTES).toContain(snippet);
  });

  it('Core 인스턴스를 config 로 생성한다 (tableName 명시 주입 경로)', () => {
    expect(KPA_ROUTES).toContain('const kpaContentCore = createContentResourceCore(');
    expect(KPA_ROUTES).toContain('createKpaContentResourceConfig({ mapCmsStatus, audit: writeAuditLog })');
  });

  it('half-wired 참조가 없다 — 선언 1 + 사용 6', () => {
    const refs = KPA_ROUTES.match(/kpaContentCore/g) ?? [];
    expect(refs.length).toBe(7);
  });

  it('옮긴 handler 의 인라인 SQL 이 남아 있지 않다', () => {
    // 조회수 증가는 Core 로 갔다 — KPA 라우터에 같은 UPDATE 가 남으면 이중 구현이다.
    expect(KPA_ROUTES).not.toContain('SET view_count = view_count + 1');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 2. KPA 고유 handler 는 그대로 남아야 한다
// ─────────────────────────────────────────────────────────────────────────────

describe('KPA 고유 handler 보존', () => {
  it('detail 은 KPA 라우터에 남아 있다 (POLICY_DIFFERENT — Core 사용 금지)', () => {
    expect(KPA_ROUTES).toContain("contentRouter.get('/:id'");
    expect(KPA_ROUTES).not.toContain('kpaContentCore.detail');
  });

  it('detail 의 접근 정책이 보존된다 (비로그인 published / 로그인 published·ready / 본인 / 운영자)', () => {
    expect(KPA_ROUTES).toContain("const viewableStatuses = userId ? ['published', 'ready'] : ['published'];");
    expect(KPA_ROUTES).toContain('!viewableStatuses.includes(content.status)');
  });

  it('detail 의 추천 조회가 보존된다', () => {
    expect(KPA_ROUTES).toContain('kpa_content_recommendations');
    expect(KPA_ROUTES).toContain('isRecommendedByMe');
  });

  it('create / update 는 KPA 고유로 남는다 (content_type — DATA_MODEL_DIFFERENT)', () => {
    expect(KPA_ROUTES).toContain("contentRouter.post('/'");
    expect(KPA_ROUTES).toContain("contentRouter.patch('/:id'");
    expect(KPA_ROUTES).toContain('content_type');
  });

  it('추천 · AI 3종 handler 가 보존된다 (UNIQUE)', () => {
    for (const route of ['/:id/recommend', '/:id/ai/summarize', '/:id/ai/extract', '/:id/ai/tag']) {
      expect(KPA_ROUTES).toContain(route);
    }
  });

  it('운영자 자료 직접 생성(G12)을 KPA 로 확산시키지 않았다', () => {
    expect(KPA_ROUTES).not.toContain('createOperatorResourceCreateHandler');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 3. repository/entity 전환 금지 (KpaContent drift)
// ─────────────────────────────────────────────────────────────────────────────

describe('raw SQL 계약 유지', () => {
  it('KpaContent 엔티티 repository 로 전환하지 않았다', () => {
    expect(KPA_ROUTES).not.toContain('getRepository(KpaContent)');
    expect(KPA_ROUTES).not.toContain('KpaContent)');
  });

  it('Core 도 repository 를 쓰지 않는다', () => {
    const core = fs.readFileSync(
      path.resolve(__dirname, '../routes/common/content-resource/content-resource-core.ts'),
      'utf8',
    );
    expect(core).not.toContain('getRepository');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 4. status=all · audit · 필드 매핑 (동작 검증)
// ─────────────────────────────────────────────────────────────────────────────

describe('KPA status=all 보존', () => {
  it('운영자 → status 조건 없음', async () => {
    const { core, ds } = buildKpaCore([]);
    await core.list(req({ query: { status: 'all' }, user: { id: 'u', roles: ['kpa:operator'] } }), createRes());
    const sql = ds.queries.find((q: string) => /SELECT c\.id/.test(q)) ?? '';
    expect(sql).not.toContain('c.status =');
    expect(sql).not.toContain("'all'");
  });

  it('일반회원 → 공개 + 본인 유지', async () => {
    const { core, ds } = buildKpaCore([]);
    await core.list(req({ query: { status: 'all' }, user: { id: 'u', roles: [] } }), createRes());
    const sql = ds.queries.find((q: string) => /SELECT c\.id/.test(q)) ?? '';
    expect(sql).toContain("c.status = 'published' OR c.created_by =");
  });

  it('일반 status 필터는 그대로 동작한다', async () => {
    const { core, ds } = buildKpaCore([]);
    await core.list(req({ query: { status: 'draft' }, user: { id: 'u', roles: [] } }), createRes());
    const sql = ds.queries.find((q: string) => /SELECT c\.id/.test(q)) ?? '';
    expect(sql).toContain('c.status =');
  });

  it('resolveKpaListVisibility 계약', () => {
    expect(resolveKpaListVisibility({ userId: 'u', statusFilter: 'all', user: { roles: ['kpa:admin'] } }))
      .toEqual({ visibility: 'none', applyExplicitStatus: false });
    expect(resolveKpaListVisibility({ userId: 'u', statusFilter: 'all', user: { roles: [] } }))
      .toEqual({ visibility: 'published-or-own', applyExplicitStatus: false });
    expect(resolveKpaListVisibility({ user: {} }))
      .toEqual({ visibility: 'published-only', applyExplicitStatus: false });
    expect(resolveKpaListVisibility({ userId: 'u', my: 'true', user: {} }))
      .toEqual({ visibility: 'owner-only', applyExplicitStatus: false });
  });
});

describe('audit hook 보존', () => {
  it('콘텐츠 삭제 → CONTENT_DELETED / kpa_content', async () => {
    const audits: AuditCall[] = [];
    const { core } = buildKpaCore(audits);
    await core.remove(req({ params: { id: 'x' }, user: { id: 'u1' } }), createRes());
    expect(audits).toHaveLength(1);
    expect(audits[0].action).toBe('CONTENT_DELETED');
    expect(audits[0].entityType).toBe('kpa_content');
  });

  it('운영자 상태 변경 → RESOURCE_STATUS_CHANGED + from/to meta', async () => {
    const audits: AuditCall[] = [];
    const { core } = buildKpaCore(audits);
    await core.operatorUpdateStatus(
      req({ params: { id: 'x' }, body: { status: 'published' }, user: { id: 'op' } }),
      createRes(),
    );
    expect(audits[0].action).toBe('RESOURCE_STATUS_CHANGED');
    expect(audits[0].meta).toEqual(expect.objectContaining({ from: 'draft', to: 'published' }));
  });

  it('운영자 삭제 → RESOURCE_DELETED', async () => {
    const audits: AuditCall[] = [];
    const { core } = buildKpaCore(audits);
    await core.operatorRemove(req({ params: { id: 'x' }, user: { id: 'op' } }), createRes());
    expect(audits[0].action).toBe('RESOURCE_DELETED');
  });
});

describe('KPA 필드 매핑 보존', () => {
  it('목록 select 에 content_type 포함', () => {
    const { config } = buildKpaCore([]);
    expect(config.listColumns).toContain('c.content_type');
  });

  it('운영자 목록 select 는 원본과 동일 — reusable_policy 미포함', () => {
    expect(KPA_OPERATOR_RESOURCE_COLUMNS).not.toContain('reusable_policy');
    expect(KPA_OPERATOR_RESOURCE_COLUMNS).toContain('c.view_count, c.like_count');
  });

  it('회원 목록 필터는 content_type / sub_type 만', () => {
    const { config } = buildKpaCore([]);
    expect(config.listFilters.map((f) => f.param).sort()).toEqual(['content_type', 'sub_type']);
  });

  it('목록 응답에 ContentMeta enrichment 가 붙는다', async () => {
    const { core } = buildKpaCore([]);
    const res = createRes();
    await core.list(req({ user: undefined }), res);
    const item = res.body.data.items[0];
    expect(item).toEqual(
      expect.objectContaining({
        producer: 'service_admin',
        visibility: 'service',
        serviceKey: 'kpa-society',
        contentType: 'document',
      }),
    );
    expect(item.metaStatus).toBe('mapped:draft');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 5. table isolation (KPA)
// ─────────────────────────────────────────────────────────────────────────────

describe('KPA table isolation', () => {
  it('모든 Core handler 가 kpa_contents 만 건드린다', async () => {
    const { core, ds } = buildKpaCore([]);
    await core.list(req({ query: { search: 'a' } }), createRes());
    await core.incrementView(req({ params: { id: 'x' } }), createRes());
    await core.remove(req({ params: { id: 'x' }, user: { id: 'u1' } }), createRes());
    await core.operatorList(req({ query: {} }), createRes());
    await core.operatorUpdateStatus(req({ params: { id: 'x' }, body: { status: 'draft' }, user: {} }), createRes());
    await core.operatorRemove(req({ params: { id: 'x' }, user: {} }), createRes());

    const tables = new Set<string>();
    for (const q of ds.queries as string[]) {
      for (const m of q.matchAll(/\b(?:FROM|INTO|UPDATE)\s+([a-z_][a-z0-9_]*)/gi)) {
        if (/_contents$/.test(m[1])) tables.add(m[1]);
      }
    }
    expect([...tables]).toEqual(['kpa_contents']);
    for (const other of ['glycopharm_contents', 'cosmetics_contents']) {
      expect(`${other}:${(ds.queries as string[]).some((q) => q.includes(other))}`).toBe(`${other}:false`);
    }
  });
});

/**
 * WO-O4O-STORE-HANDLED-PRODUCTS-CROSS-SERVICE-DEDUPE-CONTRACT-V1 §11
 *
 * "매장 경영활용 제품"(handled-products) 의 **동일 항목 판정 계약**을 고정한다.
 *
 * 확정 계약 (docs/checks/CHECK-O4O-STORE-HANDLED-PRODUCTS-CROSS-SERVICE-DEDUPE-CONTRACT-V1.md)
 *   - 동일 항목 = (organization_id, master_id, offer_id). service_key 는 판정 축이 아니다.
 *   - service_key 필터로 닫지 않는다(진열 생성 경로마다 축이 달라 실제 취급 제품이 사라진다).
 *   - 읽기에서 접은 그룹은 쓰기(remove/setActive)에서도 같은 단위로 처리한다.
 *
 * DB·네트워크 없음. dataSource 를 mock 해 **생성되는 SQL 과 파라미터**를 검사한다.
 */

import {
  listHandledProducts,
  removeHandledProducts,
  setHandledProductActive,
} from '../services/store/store-handled-products.service.js';

const ORG = '9c87f46b-57a1-4afe-80bd-60782c49ce96';

interface Call {
  sql: string;
  params: any[];
}

/** query 응답을 SQL 패턴별로 지정하는 mock. 기록된 호출을 그대로 돌려준다. */
function makeDataSource(handler: (sql: string, params: any[]) => any) {
  const calls: Call[] = [];
  const manager = {
    query: jest.fn(async (sql: string, params: any[] = []) => {
      calls.push({ sql, params });
      return handler(sql, params);
    }),
  };
  const ds: any = {
    query: manager.query,
    transaction: jest.fn(async (fn: any) => fn(manager)),
  };
  return { ds, calls };
}

const norm = (s: string) => s.replace(/\s+/g, ' ').trim();

describe('§6·§9 조회 계약 — 동일 supply identity 는 대표 1행', () => {
  it('listing SELECT 는 (org, master, offer) 파티션의 대표 1행만 남긴다', async () => {
    const { ds, calls } = makeDataSource((sql) =>
      /count\(\*\)/.test(sql) ? [{ total: 21 }] : [],
    );
    await listHandledProducts(ds, ORG, {});

    const data = calls.find((c) => !/count\(\*\)/.test(c.sql))!;
    const sql = norm(data.sql);
    expect(sql).toContain('ROW_NUMBER() OVER');
    expect(sql).toContain(
      'PARTITION BY opl.organization_id, COALESCE(opl.master_id::text, opl.id::text), opl.offer_id',
    );
    expect(sql).toContain('WHERE identity_rank = 1');
  });

  it('대표 행 순서는 활성 → 매장 직접 등록(source_type IS NULL) → 생성순 이며 가격 기준이 아니다', async () => {
    const { ds, calls } = makeDataSource((sql) => (/count\(\*\)/.test(sql) ? [{ total: 0 }] : []));
    await listHandledProducts(ds, ORG, {});
    const sql = norm(calls.find((c) => !/count\(\*\)/.test(c.sql))!.sql);
    expect(sql).toContain(
      'ORDER BY opl.is_active DESC, (opl.source_type IS NULL) DESC, opl.created_at ASC, opl.id ASC',
    );
    // 최저가 자동 대표 금지 (§10)
    expect(sql).not.toMatch(/ORDER BY[^)]*price/i);
  });

  it('service_key 필터로 닫지 않는다 — 매장 제품 풀의 경계는 organization_id 뿐이다', async () => {
    const { ds, calls } = makeDataSource((sql) => (/count\(\*\)/.test(sql) ? [{ total: 0 }] : []));
    await listHandledProducts(ds, ORG, {});
    for (const c of calls) {
      expect(c.sql).not.toMatch(/opl\.service_key\s*(=|IN)/);
    }
    expect(calls[0].params[0]).toBe(ORG);
  });

  it('count 는 중복 제거 후 기준이라 items 와 pagination.total 이 같은 모집단이다', async () => {
    const rows = [
      { source_type: 'listing', source_id: 'l1', name: 'A', master_id: 'm1', updated_at: 'T', is_active: true },
      { source_type: 'local', source_id: 'p1', name: 'B', master_id: null, updated_at: 'T', is_active: true },
    ];
    const { ds, calls } = makeDataSource((sql) => (/count\(\*\)/.test(sql) ? [{ total: 2 }] : rows));
    const page = await listHandledProducts(ds, ORG, {});
    expect(page.items).toHaveLength(2);
    expect(page.pagination.total).toBe(2);

    const countSql = norm(calls.find((c) => /count\(\*\)/.test(c.sql))!.sql);
    expect(countSql).toContain('WHERE identity_rank = 1');
  });

  it('local(매장 자체 상품)은 중복 판정 대상이 아니다 — 파티션이 붙지 않는다', async () => {
    const { ds, calls } = makeDataSource((sql) => (/count\(\*\)/.test(sql) ? [{ total: 0 }] : []));
    await listHandledProducts(ds, ORG, { source: 'local' });
    const sql = norm(calls.find((c) => !/count\(\*\)/.test(c.sql))!.sql);
    expect(sql).toContain('FROM store_local_products lp');
    expect(sql).not.toContain('identity_rank');
  });
});

describe('§7 쓰기 정합 — 읽기에서 접힌 형제 행이 남지 않는다', () => {
  const GROUP = ['rep-1', 'sib-2', 'sib-3'];

  function groupHandler(sql: string) {
    if (/SELECT\s+sib\.id/.test(sql)) return GROUP.map((id) => ({ id }));
    if (/^\s*DELETE/.test(sql)) return [[], GROUP.length];
    if (/^\s*UPDATE/.test(sql)) return [[], GROUP.length];
    return [];
  }

  it('remove(listing) 은 supply identity 그룹 전체를 지운다', async () => {
    const { ds, calls } = makeDataSource(groupHandler);
    const result = await removeHandledProducts(ds, ORG, [{ sourceType: 'listing', sourceId: 'rep-1' }]);
    expect(result.removed).toBe(1);
    expect(result.failed).toHaveLength(0);

    const group = calls.find((c) => /SELECT\s+sib\.id/.test(c.sql))!;
    expect(norm(group.sql)).toContain('sib.offer_id IS NOT DISTINCT FROM ref.offer_id');
    expect(group.params).toEqual(['rep-1', ORG]);

    const del = calls.find((c) => /DELETE FROM organization_product_listings/.test(c.sql))!;
    expect(del.params[0]).toEqual(GROUP);
    expect(del.params[1]).toBe(ORG);

    // 콘텐츠 연결도 그룹 전체 기준으로 해제한다
    const link = calls.find((c) => /kpa_store_content_product_links/.test(c.sql))!;
    expect(link.params[2]).toEqual(GROUP);
  });

  it('remove 대상이 현재 매장에 없으면 NOT_FOUND (조직 경계 유지)', async () => {
    const { ds } = makeDataSource((sql) => (/SELECT\s+sib\.id/.test(sql) ? [] : [[], 0]));
    const result = await removeHandledProducts(ds, ORG, [{ sourceType: 'listing', sourceId: 'other-org' }]);
    expect(result.removed).toBe(0);
    expect(result.failed[0].reason).toBe('NOT_FOUND');
  });

  it('setActive(listing) 은 그룹 전체를 같은 상태로 만든다', async () => {
    const { ds, calls } = makeDataSource(groupHandler);
    const ok = await setHandledProductActive(ds, ORG, { sourceType: 'listing', sourceId: 'rep-1' }, false);
    expect(ok).toBe(true);
    const upd = calls.find((c) => /UPDATE organization_product_listings/.test(c.sql))!;
    expect(upd.params).toEqual([false, GROUP, ORG]);
  });

  it('local 은 기존대로 단건 처리 (그룹 조회 없음)', async () => {
    const { ds, calls } = makeDataSource(() => [[], 1]);
    const ok = await setHandledProductActive(ds, ORG, { sourceType: 'local', sourceId: 'p1' }, true);
    expect(ok).toBe(true);
    expect(calls.some((c) => /SELECT\s+sib\.id/.test(c.sql))).toBe(false);
    expect(calls[0].sql).toContain('UPDATE store_local_products');
    expect(calls[0].params).toEqual([true, 'p1', ORG]);
  });
});

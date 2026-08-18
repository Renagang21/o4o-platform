/**
 * WO-O4O-KPA-STORE-ORPHAN-SLUG-INTEGRITY-CLEANUP-V1 §4
 *
 * `platform_store_slugs.store_id` 에는 FK 가 없다. organizations 를 hard delete 하면
 * slug 행이 그대로 남아 orphan 이 된다 — 프로덕션에서 실제로 2건 발생했다
 * (`neture-3lifezone`, `phase0-테스트약국`, 둘 다 org 가 사후 삭제됨).
 *
 * 이 spec 은 재발 방지 계약을 고정한다.
 *   - 조직 삭제는 트랜잭션 안에서 일어난다.
 *   - 같은 트랜잭션에서 platform_store_slugs / platform_store_slug_history 의
 *     해당 store_id 행을 함께 지운다.
 *   - 테이블이 없는 배포에서는 DELETE 를 시도하지 않는다(조직 삭제는 계속 성공).
 *
 * DB 없이 EntityManager 를 mock 해서 발행 SQL 만 검증한다.
 */

import { OrganizationService } from '../../../../packages/organization-core/src/services/OrganizationService.js';

const ORG_ID = '843bfd17-235d-4a8e-9977-aa933fc2b486';

function makeService(opts: { tablesPresent?: boolean; parentId?: string | null } = {}) {
  const present = opts.tablesPresent !== false;
  const org = { id: ORG_ID, parentId: opts.parentId ?? null, childrenCount: 0 };

  const queries: Array<{ sql: string; params: unknown[] }> = [];
  const deleted: string[] = [];

  const orgRepo = {
    findOne: jest.fn(async () => org),
    update: jest.fn(async () => undefined),
    delete: jest.fn(async (where: any) => {
      deleted.push(where.id);
      return { affected: 1 };
    }),
  };
  const memberRepo = { count: jest.fn(async () => 0) };

  const manager = {
    getRepository: jest.fn(() => orgRepo),
    query: jest.fn(async (sql: string, params: unknown[] = []) => {
      queries.push({ sql, params });
      if (sql.includes('to_regclass')) return [{ present }];
      return [];
    }),
  };

  let transactionRan = false;
  const dataSource: any = {
    getRepository: jest.fn((entity: any) =>
      // 생성자에서 Organization / OrganizationMember 두 repo 를 뽑는다.
      entity?.name === 'OrganizationMember' ? memberRepo : orgRepo,
    ),
    transaction: jest.fn(async (cb: any) => {
      transactionRan = true;
      return cb(manager);
    }),
  };

  const service = new OrganizationService(dataSource);
  return { service, queries, deleted, orgRepo, dataSource, ran: () => transactionRan };
}

describe('§4 조직 hard delete 는 매장 slug 잔재를 남기지 않는다', () => {
  it('삭제가 트랜잭션 안에서 일어난다', async () => {
    const ctx = makeService();
    await ctx.service.deleteOrganization(ORG_ID);
    expect(ctx.dataSource.transaction).toHaveBeenCalledTimes(1);
    expect(ctx.ran()).toBe(true);
    expect(ctx.deleted).toEqual([ORG_ID]);
  });

  it('platform_store_slugs / platform_store_slug_history 를 같은 트랜잭션에서 정리한다', async () => {
    const ctx = makeService();
    await ctx.service.deleteOrganization(ORG_ID);

    const deletes = ctx.queries.filter((q) => /^\s*DELETE FROM/i.test(q.sql));
    expect(deletes.map((q) => q.sql.trim())).toEqual([
      'DELETE FROM platform_store_slugs WHERE store_id = $1',
      'DELETE FROM platform_store_slug_history WHERE store_id = $1',
    ]);
    for (const d of deletes) {
      // Boundary Guard 2: string interpolation 금지 — store_id 는 항상 파라미터 바인딩.
      expect(d.params).toEqual([ORG_ID]);
    }
  });

  it('테이블이 없는 배포에서는 DELETE 를 발행하지 않는다 (조직 삭제는 성공)', async () => {
    const ctx = makeService({ tablesPresent: false });
    await ctx.service.deleteOrganization(ORG_ID);

    expect(ctx.queries.filter((q) => /^\s*DELETE FROM/i.test(q.sql))).toHaveLength(0);
    expect(ctx.deleted).toEqual([ORG_ID]);
  });
});

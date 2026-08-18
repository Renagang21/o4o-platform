/**
 * WO-O4O-PLATFORM-STORE-SLUG-FK-CASCADE-HARDENING-V1 §8
 *
 * `platform_store_slugs.store_id` → `organizations.id` FK(ON DELETE CASCADE) 계약을 고정한다.
 *
 * cascade 의 실제 DB 의미(정상 insert / 없는 org insert 차단 / 삭제 전파 / 타 조직 slug 보존)는
 * ephemeral postgres 에서 실측했다(CHECK 문서 §6). 여기서는 DB 없이
 *   ① migration 이 그 계약대로 쓰였는지
 *   ② orphan 이 남아 있으면 up() 이 멈추는지
 *   ③ 검증 단계가 CASCADE 아닌 FK 를 통과시키지 않는지
 *   ④ down() 이 constraint 만 제거하는지
 *   ⑤ 조직 삭제 경로의 application cleanup 이 유지되는지
 * 를 고정한다.
 */

import fs from 'fs';
import path from 'path';
import { AddPlatformStoreSlugsOrganizationFk20270312000000 as Migration } from '../database/migrations/20270312000000-AddPlatformStoreSlugsOrganizationFk.js';

const CONSTRAINT = 'FK_platform_store_slugs_organization';

/** queryRunner.query 를 큐 기반 stub 으로 대체한다. */
function makeRunner(responses: Array<unknown>) {
  const calls: string[] = [];
  const queue = [...responses];
  const queryRunner = {
    query: jest.fn(async (sql: string) => {
      calls.push(sql.replace(/\s+/g, ' ').trim());
      return queue.shift() ?? [];
    }),
  };
  return { queryRunner: queryRunner as any, calls };
}

const PRESENT = [{ a: true, b: true }];
const NO_ORPHAN = [{ cnt: 0 }];
const CASCADE_OK = [{ confdeltype: 'c' }];

describe('platform_store_slugs FK/CASCADE migration', () => {
  it('FK 는 organizations(id) 를 ON DELETE CASCADE 로 참조한다', async () => {
    const { queryRunner, calls } = makeRunner([PRESENT, NO_ORPHAN, [], [], CASCADE_OK]);
    await new Migration().up(queryRunner);

    const add = calls.find((c) => c.includes('ADD CONSTRAINT'));
    expect(add).toBeDefined();
    expect(add).toContain(`ADD CONSTRAINT "${CONSTRAINT}"`);
    expect(add).toMatch(/FOREIGN KEY \("store_id"\) REFERENCES "organizations"\("id"\)/);
    expect(add).toContain('ON DELETE CASCADE');
    // 재실행 안전: ADD 직전에 DROP IF EXISTS
    expect(calls[calls.indexOf(add!) - 1]).toContain('DROP CONSTRAINT IF EXISTS');
  });

  it('orphan slug 가 남아 있으면 ALTER 전에 멈춘다', async () => {
    const { queryRunner, calls } = makeRunner([PRESENT, [{ cnt: 3 }]]);
    await expect(new Migration().up(queryRunner)).rejects.toThrow(/orphan platform_store_slugs rows = 3/);
    expect(calls.some((c) => c.includes('ADD CONSTRAINT'))).toBe(false);
  });

  it('CASCADE 가 아닌 FK 는 검증에서 실패로 끝난다', async () => {
    const { queryRunner } = makeRunner([PRESENT, NO_ORPHAN, [], [], [{ confdeltype: 'a' }]]);
    await expect(new Migration().up(queryRunner)).rejects.toThrow(/FK 검증 실패/);
  });

  it('테이블이 없는 배포에서는 아무 것도 하지 않는다', async () => {
    const { queryRunner, calls } = makeRunner([[{ a: false, b: true }]]);
    await new Migration().up(queryRunner);
    expect(calls).toHaveLength(1);
  });

  it('down 은 constraint 만 제거한다 (데이터 무변경)', async () => {
    const { queryRunner, calls } = makeRunner([[]]);
    await new Migration().down(queryRunner);
    expect(calls).toHaveLength(1);
    expect(calls[0]).toContain(`DROP CONSTRAINT IF EXISTS "${CONSTRAINT}"`);
    expect(calls.join(' ')).not.toMatch(/DELETE|UPDATE|INSERT|DROP TABLE/i);
  });
});

describe('조직 삭제 경로 계약 (§7)', () => {
  const orgServiceSrc = fs.readFileSync(
    path.resolve(
      __dirname,
      '../../../../packages/organization-core/src/services/OrganizationService.ts',
    ),
    'utf-8',
  );

  /**
   * CASCADE 가 생겨도 application cleanup 은 유지한다.
   *   - cleanup 은 organizations DELETE **이전**에 같은 트랜잭션에서 돈다
   *     → CASCADE 가 발동할 대상이 이미 0건이라 double-delete 오류가 발생하지 않는다.
   *   - history 테이블에는 FK 를 걸지 않았으므로 cleanup 이 여전히 유일한 정리 경로다.
   */
  it('slug 잔재 정리가 organizations 삭제보다 먼저 수행된다', () => {
    const cleanupAt = orgServiceSrc.indexOf('platform_store_slug_history');
    const deleteAt = orgServiceSrc.indexOf('getRepository(Organization).delete({ id })');
    expect(cleanupAt).toBeGreaterThan(-1);
    expect(deleteAt).toBeGreaterThan(cleanupAt);
  });

  it('history 테이블 정리는 계속 application 책임이다', () => {
    expect(orgServiceSrc).toContain("'platform_store_slugs', 'platform_store_slug_history'");
  });
});

/**
 * WO-O4O-NETURE-OPERATOR-DASHBOARD-SUPPLIER-COUNT-ALIGNMENT-V1
 *
 * 배경:
 *   운영자/관리자 대시보드의 "공급자 승인 대기 / 활성 공급사" 카운트는
 *   neture_suppliers 를 status 단독으로 집계한다(회원 JOIN 없음).
 *   그 결과, 어떤 neture 서비스 멤버십에도 연결되지 않은 테스트/잔재 supplier 행이
 *   카운트를 부풀린다. (라이브 확인 2026-06-20: PENDING 4 = 실회원 1 + 테스트 3,
 *   ACTIVE 2 = 실회원 1 + 테스트 1.)
 *
 *   선행 마이그레이션 20260925000000-CleanupNetureOrphanSuppliers 는
 *   user_id IS NULL / user_id NOT IN users 만 정리하고 FK(ON DELETE CASCADE)를 걸었다.
 *   그러나 본 잔재 행들은 user_id 가 유효한 users 를 가리키되(FK 충족),
 *   해당 user 가 neture service_membership 을 갖지 않는 케이스라 위 기준에 안 걸린다.
 *
 * 이 마이그레이션이 하는 것:
 *   1. neture 멤버십이 없는 supplier(= 회원관리에 보이지 않는 행)를 감사 로그와 함께 식별
 *   2. 삭제 (자식 테이블 supplier_product_offers / library_items / csv_batches /
 *      regulated_categories 등은 supplier_id FK ON DELETE CASCADE 로 자동 정리)
 *   3. 검증: neture 멤버십 없는 supplier 0건, 실 멤버 supplier 보존
 *
 * 안전장치:
 *   - users 행은 건드리지 않는다(supplier 행만 삭제).
 *   - neture service_membership 이 존재하는 supplier(renagang21 / sohae21 등)는 보존된다.
 *   - 운영 데이터는 pre-service disposable. 복구 불필요(재시드 우선).
 */

import type { MigrationInterface, QueryRunner } from 'typeorm';

export class CleanupNetureTestSuppliers20261118000000 implements MigrationInterface {
  name = 'CleanupNetureTestSuppliers20261118000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    // 1. 삭제 대상 식별: neture service_membership 이 없는 supplier
    const targets: Array<{ id: string; slug: string; status: string; contact_email: string | null; user_id: string | null }> =
      await queryRunner.query(`
        SELECT ns.id, ns.slug, ns.status, ns.contact_email, ns.user_id
        FROM neture_suppliers ns
        WHERE ns.user_id IS NULL
           OR NOT EXISTS (
             SELECT 1 FROM service_memberships sm
             WHERE sm.user_id = ns.user_id AND sm.service_key = 'neture'
           )
        ORDER BY ns.status, ns.slug
      `);

    if (targets.length === 0) {
      console.log('[CleanupNetureTestSuppliers] No non-member suppliers found. Nothing to do.');
      return;
    }

    console.log(`[CleanupNetureTestSuppliers] Found ${targets.length} supplier(s) without neture membership:`);
    for (const s of targets) {
      console.log(`  - slug=${s.slug} | status=${s.status} | contact=${s.contact_email ?? 'NULL'} | user_id=${s.user_id ?? 'NULL'}`);
    }

    const targetIds = targets.map((s) => s.id);

    // 2. 삭제 (자식 테이블은 supplier_id FK ON DELETE CASCADE 로 자동 정리)
    await queryRunner.query(
      `DELETE FROM neture_suppliers WHERE id = ANY($1::uuid[])`,
      [targetIds],
    );
    console.log(`[CleanupNetureTestSuppliers] Deleted ${targets.length} supplier(s).`);

    // 3. 검증: neture 멤버십 없는 supplier 0건
    const remaining: Array<{ count: number }> = await queryRunner.query(`
      SELECT COUNT(*)::int AS count
      FROM neture_suppliers ns
      WHERE ns.user_id IS NULL
         OR NOT EXISTS (
           SELECT 1 FROM service_memberships sm
           WHERE sm.user_id = ns.user_id AND sm.service_key = 'neture'
         )
    `);
    const remainCount = Number(remaining[0]?.count ?? 0);
    if (remainCount > 0) {
      throw new Error(`[CleanupNetureTestSuppliers] Validation failed: ${remainCount} non-member supplier(s) still exist.`);
    }

    // 4. 실 멤버 supplier 보존 확인 (감사)
    const survivors: Array<{ count: number }> = await queryRunner.query(`
      SELECT COUNT(*)::int AS count FROM neture_suppliers
    `);
    console.log(`[CleanupNetureTestSuppliers] ✅ Validation passed. Remaining suppliers (all neture members): ${Number(survivors[0]?.count ?? 0)}`);
  }

  async down(): Promise<void> {
    // 삭제된 테스트/잔재 supplier 데이터는 복구하지 않는다 (pre-service disposable).
    console.log('[CleanupNetureTestSuppliers] down: no-op. Deleted disposable test suppliers are not restored.');
  }
}

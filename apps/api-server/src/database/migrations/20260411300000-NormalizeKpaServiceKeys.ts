import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * WO-KPA-SERVICE-KEY-NORMALIZATION-FIX-V1
 *
 * KPA 상품 흐름에서 service_key가 'kpa'와 'kpa-society'로 혼재된 문제를 정규화한다.
 * 표준 key: 'kpa-society' (organization_service_enrollments.service_code 기준)
 *
 * 대상 테이블:
 *   1. product_approvals — service_key='kpa' → 'kpa-society'
 *   2. organization_product_listings — service_key='kpa' → 'kpa-society'
 *
 * UNIQUE 제약 주의:
 *   organization_product_listings에는 (organization_id, service_key, offer_id) UNIQUE가 있으므로
 *   같은 org+offer에 'kpa'와 'kpa-society' 두 row가 모두 존재하는 경우 충돌 발생 가능.
 *   → 먼저 중복 'kpa' row를 삭제한 뒤, 나머지를 UPDATE한다.
 *
 * 멱등성: 이미 정규화된 상태에서 재실행해도 영향 0건.
 */
export class NormalizeKpaServiceKeys20260411300000 implements MigrationInterface {
  name = 'NormalizeKpaServiceKeys20260411300000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // ─── 1. product_approvals 정규화 ────────────────────────────────
    // product_approvals의 UNIQUE는 (offer_id, organization_id, approval_type) — service_key 미포함
    // 따라서 단순 UPDATE로 충분 (중복 충돌 없음)
    const paResult = await queryRunner.query(`
      UPDATE product_approvals
      SET service_key = 'kpa-society', updated_at = NOW()
      WHERE service_key = 'kpa'
      RETURNING id, offer_id, organization_id
    `);
    console.log(`[Migration] NormalizeKpaServiceKeys: product_approvals ${paResult.length} rows updated (kpa → kpa-society)`);

    // ─── 2. organization_product_listings 정규화 ────────────────────
    // UNIQUE: (organization_id, service_key, offer_id)
    // 같은 org+offer에 'kpa'와 'kpa-society'가 모두 존재하면 UPDATE 시 충돌
    // → 먼저 중복인 'kpa' row를 삭제

    // 2a. 중복 row 삭제 (kpa-society가 이미 존재하는 org+offer의 kpa row)
    const deleteResult = await queryRunner.query(`
      DELETE FROM organization_product_listings opl_kpa
      WHERE opl_kpa.service_key = 'kpa'
        AND EXISTS (
          SELECT 1 FROM organization_product_listings opl_society
          WHERE opl_society.organization_id = opl_kpa.organization_id
            AND opl_society.offer_id = opl_kpa.offer_id
            AND opl_society.service_key = 'kpa-society'
        )
      RETURNING id, organization_id, offer_id
    `);
    console.log(`[Migration] NormalizeKpaServiceKeys: listings ${deleteResult.length} duplicate 'kpa' rows deleted (kpa-society already exists)`);

    // 2b. 나머지 'kpa' row를 'kpa-society'로 UPDATE
    const updateResult = await queryRunner.query(`
      UPDATE organization_product_listings
      SET service_key = 'kpa-society', updated_at = NOW()
      WHERE service_key = 'kpa'
      RETURNING id, organization_id, offer_id
    `);
    console.log(`[Migration] NormalizeKpaServiceKeys: listings ${updateResult.length} rows updated (kpa → kpa-society)`);

    // ─── 3. 요약 ─────────────────────────────────────────────────────
    console.log(`[Migration] NormalizeKpaServiceKeys: DONE — approvals=${paResult.length}, listings_deleted=${deleteResult.length}, listings_updated=${updateResult.length}`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // down()은 no-op — 'kpa'로 되돌리면 전체 흐름이 다시 불일치 상태가 됨
    console.log('[Migration] NormalizeKpaServiceKeys down: no-op (reverting would reintroduce inconsistency)');
  }
}

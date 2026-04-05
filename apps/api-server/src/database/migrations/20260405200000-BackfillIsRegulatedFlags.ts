import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * WO-NETURE-PRODUCT-CATEGORY-IS-REGULATED-BACKFILL-FIX-V1
 *
 * 건강기능식품, 의료소모품, 수동생성 의료기기 카테고리의 is_regulated 값을 true로 보정한다.
 *
 * 원인: is_regulated 컬럼이 DEFAULT false로 추가된 후, 기존 행은 false가 되었고
 *       시드 마이그레이션의 ON CONFLICT (slug) DO NOTHING으로 보정이 스킵됨.
 *
 * 멱등성: UPDATE ... WHERE slug IN (...) — 이미 true인 행에는 영향 없음.
 */
export class BackfillIsRegulatedFlags20260405200000 implements MigrationInterface {
  name = 'BackfillIsRegulatedFlags20260405200000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const result = await queryRunner.query(`
      UPDATE product_categories
      SET is_regulated = true, updated_at = NOW()
      WHERE slug IN (
        -- 건강기능식품 계열
        'health-functional',
        'hf-vitamin-mineral',
        'hf-probiotics',
        'hf-omega3',
        'hf-ginseng',
        'hf-collagen',
        'hf-etc',
        -- 의료소모품 계열
        'medical-supply',
        'ms-hygiene',
        'ms-etc',
        -- 수동 생성된 의료기기
        '의료기기-mnlht7lb'
      )
      RETURNING slug, is_regulated
    `);

    console.log(`[Migration] BackfillIsRegulatedFlags: ${result.length} categories updated`);
    for (const row of result) {
      console.log(`  - ${row.slug}: is_regulated=${row.is_regulated}`);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // down()은 의도적으로 no-op으로 처리한다.
    //
    // 이유:
    // 1. 이 마이그레이션은 "잘못된 false → 올바른 true" 보정이다.
    //    롤백 시 false로 되돌리면 다시 잘못된 상태가 된다.
    // 2. 의약외품(quasi-drug)은 이미 true였으므로 단순 일괄 false 복원은 위험하다.
    // 3. 정확한 복원을 위해서는 각 slug의 원래 값을 알아야 하지만,
    //    "원래 값"이 곧 버그 상태이므로 복원 자체가 의미가 없다.
    //
    // 만약 롤백이 필요하면 개별 slug 단위로 수동 판단해야 한다.
    console.log('[Migration] BackfillIsRegulatedFlags down: no-op (restoring false would re-introduce the bug)');
  }
}

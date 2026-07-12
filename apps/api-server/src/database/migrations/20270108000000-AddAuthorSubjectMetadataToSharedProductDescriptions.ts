import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * WO-O4O-SPD-AUTHOR-SUBJECT-METADATA-V1 (additive)
 * 설계: docs/investigations/IR-O4O-SPD-AUTHOR-SUBJECT-METADATA-DESIGN-V1.md §5
 * Readiness: docs/investigations/IR-O4O-NETURE-SUPPLIER-STORE-DESCRIPTION-DRAFT-SAVE-READINESS-V1.md (B1)
 *
 * shared_product_descriptions 에 "작성 주체(공급자)" 영구 attribution 과 "제출 시각" 을
 * additive nullable 로 추가한다. 공급자 STORE 설명서 draft 저장(후속 WO)이 이 컬럼을 세팅한다.
 *
 * 추가:
 *   - created_by_supplier_id  UUID  null  → neture_suppliers(id) ON DELETE SET NULL
 *       "어떤 공급자가 작성했는가"를 조인 없이. created_by(=user)와 축이 다르다.
 *       source_ref_id(원천 offer 추적/legacy fallback)와 경쟁 아님.
 *   - submitted_at            TIMESTAMP null
 *       공급자가 운영자 검수를 요청(status→needs_review)한 시각.
 *       기존 sibling(curated_at/created_at)과 동일하게 TIMESTAMP(무 tz) 사용 — 테이블 일관성.
 *   - idx_shared_product_descriptions_created_by_supplier (partial, NOT NULL)
 *       공급자 "내 매장용 설명서" 조회용. 대부분 row 는 null 이므로 partial 로 소형 유지.
 *
 * 불변 보장 (이 migration 이 하지 않는 것):
 *   - 기존 row 백필하지 않음 (created_by_supplier_id / submitted_at 는 신규 write 부터 세팅)
 *   - source_type / source_ref_id / created_by / curated_by 의미·값 변경하지 않음 → AUTO-CREDIT fallback 무영향
 *   - canonical partial unique (master_id, description_type, COALESCE(language,'ko')) 무영향 (신규 컬럼은 유니크 키 밖)
 *   - neture_suppliers / product_masters 구조 변경하지 않음
 */
export class AddAuthorSubjectMetadataToSharedProductDescriptions20270108000000
  implements MigrationInterface
{
  name = 'AddAuthorSubjectMetadataToSharedProductDescriptions20270108000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE shared_product_descriptions
        ADD COLUMN IF NOT EXISTS created_by_supplier_id UUID
          REFERENCES neture_suppliers(id) ON DELETE SET NULL,
        ADD COLUMN IF NOT EXISTS submitted_at TIMESTAMP
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_shared_product_descriptions_created_by_supplier
        ON shared_product_descriptions (created_by_supplier_id)
       WHERE created_by_supplier_id IS NOT NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX IF EXISTS idx_shared_product_descriptions_created_by_supplier`,
    );
    // 컬럼 제거 시 FK 제약도 함께 drop. 백필한 적 없으므로 데이터 손실 없음.
    await queryRunner.query(`
      ALTER TABLE shared_product_descriptions
        DROP COLUMN IF EXISTS submitted_at,
        DROP COLUMN IF EXISTS created_by_supplier_id
    `);
  }
}

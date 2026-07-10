import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * WO-O4O-PRODUCT-CANDIDATE-LEGACY-MATCH-COLUMN-DROP-MIGRATION-V1
 * 선행: WO-O4O-PUBLIC-DATA-CANDIDATE-LEGACY-MASTER-MATCHING-REMOVAL-V1 (코드/엔티티/API 사전매칭 제거·배포 완료)
 *
 * 사전 매칭 서브시스템 제거로 더 이상 쓰지 않는 product_candidates 의 두 물리 컬럼을 정리한다.
 *   - matched_identifier_id (uuid, FK → product_identifiers, index idx_pc_matched_identifier_id) — non-null 0건
 *   - confidence_score      (numeric)                                                            — non-null 0건
 *
 * 유지(건드리지 않음): match_status(의료기기 등 import 가 원천 신호로 raw SQL write 중),
 *   matched_product_master_id(등록 결과 링크, 198k+ 사용), candidate_status.
 *
 * 안전장치:
 *   - 엔티티(ProductCandidate)에서 두 필드는 이미 제거되어 배포됨 → 현 리비전은 이 컬럼을 SELECT/INSERT 하지 않음.
 *   - up 진입 시 두 컬럼에 값 보유 행이 하나라도 있으면 **중단**(데이터 손실 방지). 사전 검증 = 0/0.
 *   - DROP COLUMN IF EXISTS + DROP CONSTRAINT/INDEX IF EXISTS 로 멱등.
 */
export class DropLegacyMatchColumnsFromProductCandidates20261229000000 implements MigrationInterface {
  name = 'DropLegacyMatchColumnsFromProductCandidates20261229000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 0. 컬럼이 이미 없으면(재실행) 조용히 종료
    const cols: Array<{ column_name: string }> = await queryRunner.query(`
      SELECT column_name FROM information_schema.columns
       WHERE table_name = 'product_candidates'
         AND column_name IN ('matched_identifier_id', 'confidence_score')
    `);
    if (cols.length === 0) return;

    // 1. 안전 검사 — 값 보유 행이 있으면 중단(무리한 삭제 금지)
    const guard: Array<{ mid_nonnull: string; conf_nonnull: string }> = await queryRunner.query(`
      SELECT count(matched_identifier_id)::text AS mid_nonnull,
             count(confidence_score)::text      AS conf_nonnull
        FROM product_candidates
    `);
    const midNonNull = Number(guard[0]?.mid_nonnull ?? '0');
    const confNonNull = Number(guard[0]?.conf_nonnull ?? '0');
    if (midNonNull > 0 || confNonNull > 0) {
      throw new Error(
        `[Migration] product_candidates 정리 중단 — 값 보유 행 발견 (matched_identifier_id=${midNonNull}, confidence_score=${confNonNull}). 원인 조사 필요.`,
      );
    }

    // 2. FK · index · column 제거 (matched_identifier_id)
    await queryRunner.query(
      `ALTER TABLE product_candidates DROP CONSTRAINT IF EXISTS product_candidates_matched_identifier_id_fkey`,
    );
    await queryRunner.query(`DROP INDEX IF EXISTS idx_pc_matched_identifier_id`);
    await queryRunner.query(`ALTER TABLE product_candidates DROP COLUMN IF EXISTS matched_identifier_id`);

    // 3. column 제거 (confidence_score — FK/index 없음)
    await queryRunner.query(`ALTER TABLE product_candidates DROP COLUMN IF EXISTS confidence_score`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // 원복: nullable 컬럼 + FK + index 재생성 (값은 복원 불가 — 원래 0건이었음).
    await queryRunner.query(`ALTER TABLE product_candidates ADD COLUMN IF NOT EXISTS matched_identifier_id uuid`);
    await queryRunner.query(`ALTER TABLE product_candidates ADD COLUMN IF NOT EXISTS confidence_score numeric(5,4)`);
    await queryRunner.query(`
      DO $$ BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'product_candidates_matched_identifier_id_fkey'
        ) THEN
          ALTER TABLE product_candidates
            ADD CONSTRAINT product_candidates_matched_identifier_id_fkey
            FOREIGN KEY (matched_identifier_id) REFERENCES product_identifiers(id) ON DELETE SET NULL;
        END IF;
      END $$;
    `);
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS idx_pc_matched_identifier_id ON product_candidates (matched_identifier_id)`,
    );
  }
}

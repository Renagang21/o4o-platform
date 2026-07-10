import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * WO-O4O-STORE-MULTILINGUAL-CANONICAL-DESCRIPTION-V1
 * Baseline: F5 Content Stable / F12 Product Resource Architecture
 *
 * STORE(및 전 description_type) canonical 유일성을 언어별로 확장한다.
 *   기존  uniq_..._canonical_per_master_type       ON (master_id, description_type)                      WHERE canonical
 *   변경  uniq_..._canonical_per_master_type_lang   ON (master_id, description_type, COALESCE(language,'ko')) WHERE canonical
 *   → 같은 master 의 STORE 설명서를 언어별(ko/zh/en/ja) 각 1개 canonical 로 둘 수 있다.
 *     (매장 상세설명서 모달의 언어 탭이 실제 다국어를 노출할 수 있게 됨)
 *
 * null 안전: language 는 nullable(default 'ko'). 인덱스는 COALESCE(language,'ko') 로 NULL 을 'ko' 로 취급해
 *   "언어 미지정 canonical 중복"을 방지한다(현재 canonical 전량 language='ko', NULL 0건).
 *
 * 불변 보장(F12): product_masters 무변경. FK 방향 = SPD.master_id → product_masters.id 그대로.
 *
 * 안전장치: 인덱스 교체 전 (master_id, description_type, COALESCE(language,'ko')) 기준 canonical 중복이 있으면
 *   **중단**한다(무리한 자동 삭제 금지). 기존 (master_id, description_type) partial unique 가 보장하므로
 *   정상 상태에서는 발생 불가(사전 검증 0건).
 */
export class CanonicalPerMasterTypeLanguage20261228000000 implements MigrationInterface {
  name = 'CanonicalPerMasterTypeLanguage20261228000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. 안전 검사 — (master_id, description_type, COALESCE(language,'ko')) canonical 중복이 있으면 중단
    const dup: Array<{ master_id: string; description_type: string; lang: string; c: string }> = await queryRunner.query(`
      SELECT master_id, description_type, COALESCE(language, 'ko') AS lang, count(*)::text AS c
        FROM shared_product_descriptions
       WHERE status = 'canonical' AND deleted_at IS NULL
       GROUP BY master_id, description_type, COALESCE(language, 'ko')
      HAVING count(*) > 1
       LIMIT 5
    `);
    if (dup.length > 0) {
      throw new Error(
        `[Migration] (master_id, description_type, language) canonical 중복 발견 → 중단. 수동 정비 필요: ${JSON.stringify(dup)}`,
      );
    }

    // 2. canonical partial unique 교체: (master_id, description_type) → (master_id, description_type, COALESCE(language,'ko'))
    await queryRunner.query(`DROP INDEX IF EXISTS uniq_shared_product_descriptions_canonical_per_master_type`);
    await queryRunner.query(`
      CREATE UNIQUE INDEX uniq_shared_product_descriptions_canonical_per_master_type_lang
        ON shared_product_descriptions (master_id, description_type, COALESCE(language, 'ko'))
       WHERE status = 'canonical' AND deleted_at IS NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS uniq_shared_product_descriptions_canonical_per_master_type_lang`);
    // 원복: (master_id, description_type) partial unique 재생성.
    //   주의 — 다국어 canonical(같은 master/type 에 ko+zh 등)이 이미 존재하면 재생성이 실패한다.
    //   그 경우 언어별 canonical 을 먼저 (master,type)당 1개로 정비해야 원복 가능.
    await queryRunner.query(`
      CREATE UNIQUE INDEX uniq_shared_product_descriptions_canonical_per_master_type
        ON shared_product_descriptions (master_id, description_type)
       WHERE status = 'canonical' AND deleted_at IS NULL
    `);
  }
}

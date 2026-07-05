import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * WO-O4O-DRUG-UNSPECIFIED-CATEGORY-AUDIT-AND-CLEANUP-V1 (1/2 — 삭제표시)
 * CHECK: docs/checks/CHECK-O4O-DRUG-UNSPECIFIED-CATEGORY-AUDIT-V1.md
 *
 * drug_category='drug_unspecified' 인 DRUG ProductMaster 53,721건을 표시(product_data_status).
 * 실제 삭제는 2/2 migration(delete_marked 대상, 별도 사용자 승인)에서 수행 — 이 migration 은 표시만.
 *
 * `drug_unspecified` 의 정체(CHECK §3): 약가마스터 원문 `전문일반구분` 이 전문/일반이 아닌 행.
 *   원문값 분포 = 한약재 39,666 / (NULL) 12,907 / 원료의약품 1,147 / 의약외품 1.
 *   전문·일반 신호 0건 → OTC/Rx 재분류 후보 각 0.
 * 분류 신호는 name 이 아니라 candidate.raw_payload->'source' 원문(전문일반구분/비고/제형구분)이므로
 *   product_candidates.matched_product_master_id 직접 조인으로 master 별 원문을 회수한다(커버리지 100%).
 *
 * 표시 규칙 (사용자 확정 2026-07-05):
 *   delete_marked (53,428):
 *     - 전문일반구분='한약재'                                  (39,666) 생약 벌크 원재료
 *     - 전문일반구분='원료의약품'                              ( 1,147) 원말/생약(비고=한약재)
 *     - 전문일반구분 IS NULL AND 비고 LIKE '한약재%'           (12,209) 결측이나 실제 생약
 *     - 전문일반구분 IS NULL AND 제조사='한국희귀필수의약품센터'( 345) 긴급도입·희귀필수 — O4O 대상 아님
 *     - 전문일반구분 IS NULL AND 제형 IN (주사/바이알/앰플)    (   61) 비소비자 주사제
 *   review_required (293):
 *     - 그 외 NULL 결측 일반 제약사 비주사 완제(정/캡슐/크림/시럽 등, 292) — otc/rx 후속 판정
 *     - 의약외품 오분류 1
 *
 * 연결 보호(CHECK §7 / WO §9): 설명/오퍼/리스팅/매장/이미지 링크가 있는 master 는
 *   분류와 무관하게 review_required 로 강제(link_guard). 실측상 대상은 메코마그민500정 4건뿐이며
 *   이들은 이미 review 버킷(NULL·비주사·비희귀센터)이라 삭제 후보 수량 무변경.
 *
 * 락: DML(UPDATE)만 — ROW EXCLUSIVE. drug_unspecified DRUG master 만 대상(rx/otc·타 트랙 무영향).
 */
export class MarkDrugUnspecifiedByRawGubun20261210000000 implements MigrationInterface {
  name = 'MarkDrugUnspecifiedByRawGubun20261210000000';

  private readonly DU = `pm.regulatory_type = 'DRUG' AND pm.drug_category = 'drug_unspecified'`;

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      WITH sig AS (
        SELECT DISTINCT ON (pc.matched_product_master_id)
          pc.matched_product_master_id AS master_id,
          pc.raw_payload->'source'->>'전문일반구분' AS gubun,
          pc.raw_payload->'source'->>'비고'         AS note,
          pc.raw_payload->'source'->>'제형구분'     AS dosage
        FROM product_candidates pc
        WHERE pc.matched_product_master_id IS NOT NULL
        ORDER BY pc.matched_product_master_id, pc.created_at
      ),
      lnk AS (
        SELECT pm.id,
          (   EXISTS(SELECT 1 FROM shared_product_descriptions   t WHERE t.master_id = pm.id)
           OR EXISTS(SELECT 1 FROM supplier_product_offers       t WHERE t.master_id = pm.id)
           OR EXISTS(SELECT 1 FROM organization_product_listings t WHERE t.master_id = pm.id)
           OR EXISTS(SELECT 1 FROM store_product_profiles        t WHERE t.master_id = pm.id)
           OR EXISTS(SELECT 1 FROM product_images                t WHERE t.master_id = pm.id)
          ) AS has_link
        FROM product_masters pm
        WHERE ${this.DU}
      )
      UPDATE product_masters pm
      SET product_data_status = CASE
            WHEN lnk.has_link THEN 'review_required'
            WHEN sig.gubun = '한약재'      THEN 'delete_marked'
            WHEN sig.gubun = '원료의약품'  THEN 'delete_marked'
            WHEN sig.gubun IS NULL AND sig.note LIKE '한약재%'                    THEN 'delete_marked'
            WHEN sig.gubun IS NULL AND pm.manufacturer_name = '한국희귀필수의약품센터' THEN 'delete_marked'
            WHEN sig.gubun IS NULL AND sig.dosage IN ('주사','바이알','앰플')    THEN 'delete_marked'
            ELSE 'review_required'
          END,
          product_data_curation_reason = CASE
            WHEN lnk.has_link
              THEN 'drug_unspecified review_required (연결 보호: 설명/이미지/오퍼/리스팅/매장 링크 존재)'
            WHEN sig.gubun = '한약재'
              THEN 'drug_unspecified delete_marked (한약재 생약 원재료): ' || COALESCE(sig.note, pm.name)
            WHEN sig.gubun = '원료의약품'
              THEN 'drug_unspecified delete_marked (원료의약품/원말): ' || COALESCE(sig.note, pm.name)
            WHEN sig.gubun IS NULL AND sig.note LIKE '한약재%'
              THEN 'drug_unspecified delete_marked (전문일반구분 결측·비고 한약재): ' || sig.note
            WHEN sig.gubun IS NULL AND pm.manufacturer_name = '한국희귀필수의약품센터'
              THEN 'drug_unspecified delete_marked (한국희귀필수의약품센터 긴급도입·희귀필수 — O4O 대상 아님)'
            WHEN sig.gubun IS NULL AND sig.dosage IN ('주사','바이알','앰플')
              THEN 'drug_unspecified delete_marked (비소비자 주사제: ' || sig.dosage || ')'
            ELSE 'drug_unspecified review_required (일반 제약사 비주사 완제/의약외품 오분류 — 원문 전문일반구분 결측, otc/rx 후속 판정)'
          END,
          product_data_curated_at = NOW()
      FROM lnk
      LEFT JOIN sig ON sig.master_id = lnk.id
      WHERE lnk.id = pm.id
        AND ${this.DU}
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // 표시 복원: drug_unspecified DRUG master 의 표시/사유를 비운다(승격 직후 상태 = NULL).
    await queryRunner.query(`
      UPDATE product_masters pm
      SET product_data_status = NULL,
          product_data_curation_reason = NULL,
          product_data_curated_at = NULL
      WHERE ${this.DU}
        AND product_data_curation_reason LIKE 'drug_unspecified %'
    `);
  }
}

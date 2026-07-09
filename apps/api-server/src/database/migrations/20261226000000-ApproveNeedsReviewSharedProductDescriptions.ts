import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * ApproveNeedsReviewSharedProductDescriptions
 *
 * WO-O4O-ADMIN-O4O-PRODUCT-DESCRIPTION-REVIEW-REMOVE-V1
 *
 * O4O 상품 설명은 정부/공공 원문 또는 O4O 내부 활용 자료이며, 별도 관리자 법적 검토 큐를
 * 두지 않는다. 따라서 `shared_product_descriptions.status = 'needs_review'` 로 "설명서 검토"
 * 대상에 분류된 설명을 모두 검토 대상에서 제외(승인)한다.
 *
 * 제약: canonical 은 (master_id, description_type) 당 1개 —
 *   `uniq_shared_product_descriptions_canonical_per_master_type`
 *   ON (master_id, description_type) WHERE status='canonical' AND deleted_at IS NULL (Freeze #2 / F12).
 *   → 전량을 무조건 canonical 로 바꾸면 partial unique 위반. 따라서:
 *
 *   1) (master_id, description_type) 별로 canonical 이 아직 없는 그룹은 대표 1건
 *      (quality_score DESC → updated_at DESC → id) 을 canonical 로 승격한다.
 *   2) 나머지 needs_review 는 candidate(승인된 설명 풀) 로 전환한다 — 검토 대기 상태 소멸.
 *
 * 비가역 data migration (down = no-op). 설명 데이터 자체는 삭제하지 않는다.
 */
export class ApproveNeedsReviewSharedProductDescriptions20261226000000 implements MigrationInterface {
  name = 'ApproveNeedsReviewSharedProductDescriptions20261226000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1) (master_id, description_type) 그룹에 활성 canonical 이 없으면 대표 1건을 canonical 로 승격.
    //    파티션당 rn=1 (품질/최신 우선) 이므로 partial unique(master_id, description_type) 위반 없음.
    const promoted: Array<{ id: string }> = await queryRunner.query(`
      WITH ranked AS (
        SELECT id, master_id, description_type,
               ROW_NUMBER() OVER (
                 PARTITION BY master_id, description_type
                 ORDER BY quality_score DESC NULLS LAST, updated_at DESC, id
               ) AS rn
          FROM shared_product_descriptions
         WHERE status = 'needs_review' AND deleted_at IS NULL
      ),
      winners AS (
        SELECT r.id
          FROM ranked r
         WHERE r.rn = 1
           AND NOT EXISTS (
             SELECT 1 FROM shared_product_descriptions c
              WHERE c.master_id = r.master_id
                AND c.description_type = r.description_type
                AND c.status = 'canonical'
                AND c.deleted_at IS NULL
           )
      )
      UPDATE shared_product_descriptions s
         SET status = 'canonical',
             curated_at = COALESCE(s.curated_at, now()),
             updated_at = now()
        FROM winners w
       WHERE s.id = w.id
      RETURNING s.id
    `);

    // 2) 남은 needs_review(대표 승격 대상 아님 / 이미 canonical 존재) → candidate 로 전환.
    const parked: Array<{ id: string }> = await queryRunner.query(`
      UPDATE shared_product_descriptions
         SET status = 'candidate',
             updated_at = now()
       WHERE status = 'needs_review' AND deleted_at IS NULL
      RETURNING id
    `);

    // eslint-disable-next-line no-console
    console.log(
      `[Migration] ApproveNeedsReview: promoted ${promoted.length} → canonical, parked ${parked.length} → candidate`,
    );

    // 잔여 검증 — needs_review 는 0 이어야 한다.
    const remaining: Array<{ c: string }> = await queryRunner.query(`
      SELECT count(*)::text AS c
        FROM shared_product_descriptions
       WHERE status = 'needs_review' AND deleted_at IS NULL
    `);
    if (Number(remaining[0]?.c ?? '0') > 0) {
      throw new Error(
        `[Migration] needs_review 잔여 ${remaining[0].c} 건 — 전환 실패. 롤백 후 조사 필요.`,
      );
    }
  }

  public async down(): Promise<void> {
    // 비가역 data migration. needs_review 원상복구는 원천 재파생으로만 가능하므로 no-op.
  }
}

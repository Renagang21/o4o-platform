import type { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * WO-O4O-PRODUCT-AI-CONTENT-GLOBAL-CONTRACT-AND-ACCESS-FIX-V1 §12
 * 설계: docs/design/DESIGN-O4O-PRODUCT-AI-CONTENT-OWNERSHIP-AND-STORE-DESCRIPTION-CONTRACT-V1.md
 * 선행: docs/data-audits/AUDIT-O4O-PRODUCT-AI-ORPHAN-CLEANUP-PREFLIGHT-V1.md
 *
 * product_ai_contents / product_ai_tags 는 ProductMaster 기반 **전역 자원**이며 product_id 는
 * product_masters.id 전용이다. 그러나 지금까지 FK 가 없어 존재하지 않는 master ID 를 가진
 * 고아 행이 적재될 수 있었다.
 *
 * 선행 조건 (본 migration 이 아니라 **별도 승인·별도 실행**으로 완료됨):
 *   2026-07-29 고아 12행(contents 3 + tags 9) 삭제 후 orphan 0/0 검증 완료.
 *   → 본 migration 은 **데이터를 삭제하지 않는다.** DDL 전용이다.
 *      (WO §12: "하나의 migration 에 DELETE 를 숨겨 넣지 않는다")
 *
 * 추가 제약:
 *   1. FK product_ai_contents.product_id → product_masters(id) ON DELETE CASCADE
 *   2. FK product_ai_tags.product_id     → product_masters(id) ON DELETE CASCADE
 *   3. UNIQUE product_ai_contents (product_id, content_type)
 *      — "(product_id, content_type) 당 전역 단일 행" upsert 계약의 DB 강제.
 *
 * product_ai_tags 에는 UNIQUE 를 추가하지 않는다 — 동일 태그 중복 허용 계약이 확정되지 않았다.
 *
 * ADD CONSTRAINT 는 비멱등이므로 pg_constraint 존재 확인 후 조건부로 추가한다.
 */
export class AddProductAiGlobalIntegrityConstraints20270214000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // 안전장치: 고아가 남아 있으면 FK 생성이 실패하므로 명시적으로 중단한다.
    // (여기서 삭제하지 않는다 — 승인된 사전 정리 절차를 거쳐야 한다)
    await queryRunner.query(`
      DO $$
      DECLARE orphan_contents integer; orphan_tags integer;
      BEGIN
        SELECT count(*) INTO orphan_contents FROM product_ai_contents c
          WHERE NOT EXISTS (SELECT 1 FROM product_masters pm WHERE pm.id = c.product_id);
        SELECT count(*) INTO orphan_tags FROM product_ai_tags t
          WHERE NOT EXISTS (SELECT 1 FROM product_masters pm WHERE pm.id = t.product_id);
        IF orphan_contents > 0 OR orphan_tags > 0 THEN
          RAISE EXCEPTION
            'Orphan rows must be cleaned before FK: contents=% tags=% (see AUDIT-O4O-PRODUCT-AI-ORPHAN-CLEANUP-PREFLIGHT-V1)',
            orphan_contents, orphan_tags;
        END IF;
      END $$;
    `);

    // 1) FK — product_ai_contents
    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'FK_product_ai_contents_master'
        ) THEN
          ALTER TABLE product_ai_contents
            ADD CONSTRAINT "FK_product_ai_contents_master"
            FOREIGN KEY (product_id) REFERENCES product_masters(id) ON DELETE CASCADE;
        END IF;
      END $$;
    `);

    // 2) FK — product_ai_tags
    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'FK_product_ai_tags_master'
        ) THEN
          ALTER TABLE product_ai_tags
            ADD CONSTRAINT "FK_product_ai_tags_master"
            FOREIGN KEY (product_id) REFERENCES product_masters(id) ON DELETE CASCADE;
        END IF;
      END $$;
    `);

    // 3) UNIQUE — (product_id, content_type) 전역 단일 행
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "UQ_product_ai_contents_product_type"
        ON product_ai_contents (product_id, content_type)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "UQ_product_ai_contents_product_type"`);
    await queryRunner.query(
      `ALTER TABLE product_ai_tags DROP CONSTRAINT IF EXISTS "FK_product_ai_tags_master"`,
    );
    await queryRunner.query(
      `ALTER TABLE product_ai_contents DROP CONSTRAINT IF EXISTS "FK_product_ai_contents_master"`,
    );
  }
}

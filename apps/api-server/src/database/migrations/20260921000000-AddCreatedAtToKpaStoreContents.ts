import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * WO-O4O-DIRECT-CONTENT-CREATED-AT-COLUMN-V1
 *
 * kpa_store_contents 테이블에 created_at 컬럼 추가.
 *
 * 동기:
 *   - 기존 컬럼은 updated_at 만 존재
 *   - direct 콘텐츠 수정 시 updated_at 이 갱신되어 통합 feed 의 정렬 순서가 매번 변경됨
 *   - snapshot(o4o_asset_snapshots) 은 created_at 으로 정렬, direct 는 updated_at 으로
 *     정렬되어 unified feed (store-library-feed) 의 정렬 의미가 일관되지 않음
 *
 * 해결:
 *   - created_at TIMESTAMP NOT NULL DEFAULT now() 컬럼 추가
 *   - 기존 row 는 created_at = updated_at 으로 backfill (생성 시점 추정값)
 *   - unified feed 의 direct.sort_at 을 created_at 으로 변경하여 snapshot 과 일관된
 *     "생성 시점 DESC" 정렬을 보장 (동일 WO 의 controller 변경 참조)
 *
 * 대상 서비스: 본 테이블은 KPA / GlycoPharm / Cosmetics 3 서비스 공통 사용 중
 *   (O4O-STORE-PRODUCTION-MATERIAL-CANONICAL-V1 — legacy physical name).
 *   migration 은 단일 테이블만 변경하므로 3 서비스 모두에 동시 적용됨.
 */
export class AddCreatedAtToKpaStoreContents20260921000000 implements MigrationInterface {
  name = 'AddCreatedAtToKpaStoreContents20260921000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 컬럼 존재 여부 확인 — idempotent
    const colCheck = await queryRunner.query(`
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'kpa_store_contents'
        AND column_name = 'created_at'
    `);
    if (colCheck.length > 0) {
      console.log('[AddCreatedAtToKpaStoreContents] created_at already exists, skipping.');
      return;
    }

    // 1. nullable 로 추가
    await queryRunner.query(`
      ALTER TABLE "kpa_store_contents"
        ADD COLUMN "created_at" TIMESTAMP
    `);

    // 2. 기존 row: created_at = updated_at 으로 backfill (생성 시점 근사값)
    await queryRunner.query(`
      UPDATE "kpa_store_contents"
      SET "created_at" = "updated_at"
      WHERE "created_at" IS NULL
    `);

    // 3. NOT NULL + DEFAULT now() 적용
    await queryRunner.query(`
      ALTER TABLE "kpa_store_contents"
        ALTER COLUMN "created_at" SET NOT NULL
    `);
    await queryRunner.query(`
      ALTER TABLE "kpa_store_contents"
        ALTER COLUMN "created_at" SET DEFAULT now()
    `);

    console.log('[AddCreatedAtToKpaStoreContents] created_at column added + backfilled from updated_at');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "kpa_store_contents" DROP COLUMN IF EXISTS "created_at"
    `);
  }
}

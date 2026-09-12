import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * WO-O4O-SCHEMA-COMPATIBILITY-RESIDUE-AND-ORPHANED-TABLE-CLOSURE-V1 — §1
 *
 * store_qr_codes.type = COMPAT_SCHEMA residue → DROP.
 *
 * canonical target 축은 `landing_type` 이다. 선행 WO
 * (WO-O4O-STORE-QR-CANONICAL-TARGET-CONTENT-SOURCE-AND-KPA-PH-COMMONIZATION-V1)
 * 가 read/write 의존을 모두 제거했고, "schema housekeeping 은 별도 회차" 로 이관했다 — 그 회차가 이 WO 다.
 *
 * 실측(read-only, 이 WO census):
 *   - 프로덕션 92 행 · type NULL 0 · landing_type NULL 0
 *   - type ≠ landing_type 4 행(전부 최근 생성: type='product' 인데 landing_type='link'/'page')
 *     → type 은 이미 stale garbage 이고 landing_type 이 정본임을 확인
 *   - type 에 index/FK/CHECK/뷰 의존 0 (있는 것은 컬럼 기본값뿐)
 *   - 코드 read/write 0 (entity 컬럼 정의 + 계약 spec 외 소비 없음)
 *
 * down: 컬럼을 원형(NOT NULL DEFAULT 'product')으로 복구하고 landing_type 값으로 backfill 한다.
 *   DROP 전 4 행의 어긋난 type 값 자체는 dead 데이터라 복원하지 않는다(정본은 landing_type).
 */
export class DropStoreQrCodesTypeColumn20270408000000 implements MigrationInterface {
  name = 'DropStoreQrCodesTypeColumn20270408000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const exists: Array<{ exists: boolean }> = await queryRunner.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'store_qr_codes'
          AND column_name = 'type'
      ) AS exists
    `);
    if (!exists[0]?.exists) {
      console.log('⏭️  store_qr_codes.type 컬럼이 이미 없음 — skip');
      return;
    }
    await queryRunner.query(`ALTER TABLE "store_qr_codes" DROP COLUMN "type"`);
    console.log('[Migration] store_qr_codes.type dropped (canonical axis = landing_type)');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const exists: Array<{ exists: boolean }> = await queryRunner.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'store_qr_codes'
          AND column_name = 'type'
      ) AS exists
    `);
    if (exists[0]?.exists) {
      console.log('⏭️  store_qr_codes.type 컬럼이 이미 있음 — skip');
      return;
    }
    await queryRunner.query(`
      ALTER TABLE "store_qr_codes"
        ADD COLUMN "type" VARCHAR(50) NOT NULL DEFAULT 'product'
    `);
    await queryRunner.query(`UPDATE "store_qr_codes" SET "type" = "landing_type"`);
    console.log('[Migration] store_qr_codes.type restored (backfilled from landing_type)');
  }
}

import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * WO-O4O-KPA-TABLET-QR-LANDING-CONTRACT-V1
 *
 * 태블릿 Screen Set ↔ store_qr_codes(landing_type='screen_set') 연결을 위한 additive 스키마.
 *
 * 1) store_tablet_screen_sets.public_qr_slug (VARCHAR(200) NULL)
 *    - 연결된 store_qr_codes.slug 의 denormalized 빠른 참조. SSOT 는 계속 store_qr_codes.
 *    - 기존 row 는 백필하지 않고 NULL 유지.
 * 2) store_qr_codes 역조회 인덱스 (organization_id, landing_type, landing_target_id)
 *    WHERE landing_type='screen_set' — Screen Set → QR 멱등 조회용.
 * 3) 같은 조합 partial UNIQUE — Screen Set 당 QR 1개 보장.
 *    landing_type='screen_set' 는 이번 WO 에서 신규 도입되는 값이라 기존 row 0건 → 충돌 없이 안전.
 *
 * 모두 additive. 기존 컬럼/제약/landing type 동작 불변. rollback 시 신규 컬럼·인덱스만 제거.
 */
export class AddScreenSetQrLandingContract20270207000000 implements MigrationInterface {
  name = 'AddScreenSetQrLandingContract20270207000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1) denormalized slug 참조 (nullable, 백필 없음)
    await queryRunner.query(`
      ALTER TABLE store_tablet_screen_sets
        ADD COLUMN IF NOT EXISTS public_qr_slug VARCHAR(200)
    `);

    // 2) 역조회 인덱스 (Screen Set → QR)
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_sqc_screen_set_target
        ON store_qr_codes (organization_id, landing_type, landing_target_id)
        WHERE landing_type = 'screen_set'
    `);

    // 3) Screen Set 당 QR 1개 (partial unique). 신규 landing type → 기존 row 0건, 안전.
    //    기존 데이터가 있어 안전하지 않은 경우엔 이 인덱스 생성이 실패하므로, 그때는 서비스 계층
    //    멱등 조회·생성으로만 중복을 방지한다(WO 안전 기준). 여기서는 신규 값이라 무충돌.
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS uq_sqc_screen_set_target
        ON store_qr_codes (organization_id, landing_target_id)
        WHERE landing_type = 'screen_set'
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS uq_sqc_screen_set_target`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_sqc_screen_set_target`);
    await queryRunner.query(`
      ALTER TABLE store_tablet_screen_sets
        DROP COLUMN IF EXISTS public_qr_slug
    `);
  }
}

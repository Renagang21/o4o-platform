import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * WO-O4O-STORE-TABLET-LOCATION-CONTENT-RUNTIME-MANAGEMENT-V1
 *
 * 세 축 분리: 위치(store_tablets, 기존) ≠ 실제 태블릿 기기(store_tablet_devices, 신규) ≠ 콘텐츠(store_tablet_screen_sets).
 *
 * ① store_tablet_devices — 실제 태블릿 기기(물리 장치). 위치 사이를 옮겨 다닌다.
 *    - current_location_id → store_tablets(id) ON DELETE SET NULL (영구 1:1 아님, 이동 = 이 컬럼만 변경)
 *    - device_token_hash: 기기 브라우저가 보관하는 토큰의 sha256 hex. 원문은 서버에 저장하지 않는다.
 *    - pairing_code / pairing_expires_at: 6자리 연결 코드(만료 10분). 연결 완료 시 NULL 로 정리.
 *      (Cloud Run 다중 인스턴스에서 코드 생성/사용 인스턴스가 다를 수 있어 메모리가 아닌 DB 에 둔다.)
 * ② store_tablet_screen_sets.description TEXT NULL — 콘텐츠 설명(현장 직원이 고를 때 참고).
 *
 * additive. 기존 store_tablets / corner_contents / current_screen_set_id 무변경. sort_order 미도입.
 */
export class CreateStoreTabletDevicesAndScreenSetDescription1789435443554 implements MigrationInterface {
  name = 'CreateStoreTabletDevicesAndScreenSetDescription1789435443554';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS store_tablet_devices (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        organization_id UUID NOT NULL,
        name VARCHAR(100) NOT NULL DEFAULT '',
        current_location_id UUID NULL,
        device_token_hash VARCHAR(64) NULL,
        pairing_code VARCHAR(6) NULL,
        pairing_expires_at TIMESTAMPTZ NULL,
        last_seen_at TIMESTAMPTZ NULL,
        is_active BOOLEAN NOT NULL DEFAULT TRUE,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        CONSTRAINT "FK_std_current_location" FOREIGN KEY (current_location_id)
          REFERENCES store_tablets (id) ON DELETE SET NULL
      )
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS uq_std_device_token_hash
        ON store_tablet_devices (device_token_hash) WHERE device_token_hash IS NOT NULL
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_std_org_location
        ON store_tablet_devices (organization_id, current_location_id)
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_std_pairing_code
        ON store_tablet_devices (pairing_code) WHERE pairing_code IS NOT NULL
    `);
    await queryRunner.query(`
      ALTER TABLE store_tablet_screen_sets ADD COLUMN IF NOT EXISTS description TEXT NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE store_tablet_screen_sets DROP COLUMN IF EXISTS description`);
    await queryRunner.query(`DROP TABLE IF EXISTS store_tablet_devices`);
  }
}

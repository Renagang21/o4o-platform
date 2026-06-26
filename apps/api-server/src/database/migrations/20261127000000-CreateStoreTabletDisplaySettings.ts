import type { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * WO-O4O-KPA-TABLET-DISPLAY-SETTINGS-V1
 *
 * 매장(organization) 단위 타블렛 전시 설정.
 * 타블렛 고객 화면(공개 뷰어)의 가격/QR/상담버튼 노출 + 자동 넘김/idle 전환 시간 제어.
 * 타블렛은 주문 채널이 아님 — 본 설정은 전시·안내 노출 규칙이며 주문/결제와 무관.
 *
 * V1 = 매장 공통 설정(org당 1행). 기기별 설정은 device pairing 이후 확장.
 * auto_slide_seconds 는 V1 에서 저장만(공개 Browse auto-slide 미구현 — CHECK 기록).
 */
export class CreateStoreTabletDisplaySettings20261127000000 implements MigrationInterface {
  name = 'CreateStoreTabletDisplaySettings20261127000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS store_tablet_display_settings (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        organization_id UUID NOT NULL,
        show_price BOOLEAN NOT NULL DEFAULT true,
        show_qr BOOLEAN NOT NULL DEFAULT true,
        show_consultation_button BOOLEAN NOT NULL DEFAULT true,
        auto_slide_seconds INT NOT NULL DEFAULT 10,
        idle_slide_seconds INT NOT NULL DEFAULT 10,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW(),
        CONSTRAINT uq_store_tablet_display_settings_org UNIQUE (organization_id)
      )
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS store_tablet_display_settings`);
  }
}

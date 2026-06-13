/**
 * AddContactNotificationStatusNetureKpa
 *
 * WO-O4O-CONTACT-NETURE-KPA-SETTINGS-ADAPTER-V1
 *
 * Neture/KPA 기존 문의 저장소에 알림 결과 기록용 notification_status 컬럼을 추가한다.
 * 형식: `inapp:<status>;email:<status>;autoreply:<status>` (varchar 100).
 *
 * - neture_contact_messages: 컬럼은 camelCase 컨벤션 → "notificationStatus" (식별자 인용 필요)
 * - contact_requests: 컬럼은 snake_case 컨벤션 → notification_status
 *
 * 모두 additive(NULL 허용, 기본값 없음) — 기존 데이터 무영향. rollback 시 컬럼 제거.
 */

import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddContactNotificationStatusNetureKpa20261108000000 implements MigrationInterface {
  name = 'AddContactNotificationStatusNetureKpa20261108000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    if (await queryRunner.hasTable('neture_contact_messages')) {
      const exists = await queryRunner.hasColumn('neture_contact_messages', 'notificationStatus');
      if (!exists) {
        await queryRunner.query(`ALTER TABLE neture_contact_messages ADD COLUMN "notificationStatus" VARCHAR(100) NULL`);
      }
    }

    if (await queryRunner.hasTable('contact_requests')) {
      const exists = await queryRunner.hasColumn('contact_requests', 'notification_status');
      if (!exists) {
        await queryRunner.query(`ALTER TABLE contact_requests ADD COLUMN notification_status VARCHAR(100) NULL`);
      }
    }
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    if (await queryRunner.hasTable('neture_contact_messages')) {
      const exists = await queryRunner.hasColumn('neture_contact_messages', 'notificationStatus');
      if (exists) {
        await queryRunner.query(`ALTER TABLE neture_contact_messages DROP COLUMN "notificationStatus"`);
      }
    }
    if (await queryRunner.hasTable('contact_requests')) {
      const exists = await queryRunner.hasColumn('contact_requests', 'notification_status');
      if (exists) {
        await queryRunner.query(`ALTER TABLE contact_requests DROP COLUMN notification_status`);
      }
    }
  }
}

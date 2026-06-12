/**
 * AddContactAutoReply
 *
 * WO-O4O-CONTACT-AUTO-REPLY-V1
 *
 * service_contact_settings 에 자동 회신(문의자 접수 확인) 설정 컬럼 추가 + 기존 데이터 무변경(기본 OFF, seed 없음).
 * contact_inquiries.notification_status 를 복합 상태(inapp;email;autoreply) 수용 위해 varchar(100) 로 확장.
 * 모두 additive — rollback 시 추가 컬럼 제거 + 길이 원복.
 */

import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddContactAutoReply20261107000000 implements MigrationInterface {
  name = 'AddContactAutoReply20261107000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    const hasSettings = await queryRunner.hasTable('service_contact_settings');
    if (hasSettings) {
      const addCol = async (col: string, ddl: string) => {
        const exists = await queryRunner.hasColumn('service_contact_settings', col);
        if (!exists) await queryRunner.query(`ALTER TABLE service_contact_settings ADD COLUMN ${ddl}`);
      };
      await addCol('auto_reply_enabled', 'auto_reply_enabled BOOLEAN NOT NULL DEFAULT FALSE');
      await addCol('auto_reply_subject', 'auto_reply_subject TEXT NULL');
      await addCol('auto_reply_message', 'auto_reply_message TEXT NULL');
      await addCol('auto_reply_include_original', 'auto_reply_include_original BOOLEAN NOT NULL DEFAULT FALSE');
    }

    const hasInquiries = await queryRunner.hasTable('contact_inquiries');
    if (hasInquiries) {
      // 복합 notification_status 수용 (inapp:..;email:..;autoreply:..)
      await queryRunner.query(`ALTER TABLE contact_inquiries ALTER COLUMN notification_status TYPE VARCHAR(100)`);
    }
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    const hasSettings = await queryRunner.hasTable('service_contact_settings');
    if (hasSettings) {
      for (const col of ['auto_reply_enabled', 'auto_reply_subject', 'auto_reply_message', 'auto_reply_include_original']) {
        const exists = await queryRunner.hasColumn('service_contact_settings', col);
        if (exists) await queryRunner.query(`ALTER TABLE service_contact_settings DROP COLUMN ${col}`);
      }
    }
    const hasInquiries = await queryRunner.hasTable('contact_inquiries');
    if (hasInquiries) {
      await queryRunner.query(`ALTER TABLE contact_inquiries ALTER COLUMN notification_status TYPE VARCHAR(40)`);
    }
  }
}

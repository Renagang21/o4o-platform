/**
 * CreateServiceContactSettings
 *
 * WO-O4O-SERVICE-CONTACT-SETTINGS-ADMIN-V1
 *
 * 서비스별 Contact Us 문의 수신·알림 설정(service_contact_settings). additive — 기존 데이터 무변경.
 * V1 소비처: GlycoPharm / K-Cosmetics. seed 없음(수신 이메일 하드코딩 금지).
 */

import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateServiceContactSettings20261106000000 implements MigrationInterface {
  name = 'CreateServiceContactSettings20261106000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    const exists = await queryRunner.hasTable('service_contact_settings');
    if (exists) return;

    await queryRunner.query(`
      CREATE TABLE service_contact_settings (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        service_key VARCHAR(50) NOT NULL,
        in_app_notification_enabled BOOLEAN NOT NULL DEFAULT TRUE,
        email_notification_enabled BOOLEAN NOT NULL DEFAULT FALSE,
        recipient_emails JSONB NOT NULL DEFAULT '[]',
        inquiry_types JSONB NULL,
        privacy_notice TEXT NULL,
        completion_notice TEXT NULL,
        is_active BOOLEAN NOT NULL DEFAULT TRUE,
        updated_by UUID NULL,
        created_at TIMESTAMP NOT NULL DEFAULT now(),
        updated_at TIMESTAMP NOT NULL DEFAULT now()
      )
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_service_contact_settings_service_key
      ON service_contact_settings (service_key)
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS service_contact_settings`);
  }
}

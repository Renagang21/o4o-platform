/**
 * CreateContactInquiries
 *
 * WO-O4O-CONTACT-DELIVERY-AND-NOTIFICATION-V1
 *
 * cross-service 공개 문의 접수 테이블(contact_inquiries). additive — 기존 데이터 무변경.
 * V1 소비처: GlycoPharm / K-Cosmetics. seed 없음.
 */

import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateContactInquiries20261105000000 implements MigrationInterface {
  name = 'CreateContactInquiries20261105000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    const exists = await queryRunner.hasTable('contact_inquiries');
    if (exists) return;

    await queryRunner.query(`
      CREATE TABLE contact_inquiries (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        service_key VARCHAR(50) NOT NULL,
        inquiry_type VARCHAR(50) NOT NULL DEFAULT 'other',
        name VARCHAR(100) NOT NULL,
        email VARCHAR(255) NOT NULL,
        phone VARCHAR(50) NULL,
        organization_name VARCHAR(200) NULL,
        subject VARCHAR(300) NOT NULL,
        message TEXT NOT NULL,
        privacy_consent BOOLEAN NOT NULL DEFAULT FALSE,
        status VARCHAR(20) NOT NULL DEFAULT 'received',
        source_path VARCHAR(300) NULL,
        user_agent TEXT NULL,
        ip_hash VARCHAR(64) NULL,
        notification_status VARCHAR(40) NULL,
        handled_at TIMESTAMP NULL,
        handled_by UUID NULL,
        internal_note TEXT NULL,
        created_at TIMESTAMP NOT NULL DEFAULT now(),
        updated_at TIMESTAMP NOT NULL DEFAULT now()
      )
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_contact_inquiries_service_status
      ON contact_inquiries (service_key, status)
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_contact_inquiries_service_created
      ON contact_inquiries (service_key, created_at)
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS contact_inquiries`);
  }
}

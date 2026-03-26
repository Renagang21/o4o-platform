/**
 * CreateCareMessages
 *
 * WO-O4O-CARE-MIGRATION-HOTFIX-V1
 * care_messages 테이블 생성 — 환자 ↔ 약사 Q&A 메시징
 *
 * Entity: apps/api-server/src/modules/care/entities/care-message.entity.ts
 * IF NOT EXISTS: 이미 존재해도 안전하게 스킵
 */
import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateCareMessages20260327000100 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS care_messages (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        patient_id UUID NOT NULL,
        pharmacy_id UUID NOT NULL,
        sender_type VARCHAR(20) NOT NULL,
        sender_id UUID NOT NULL,
        message_type VARCHAR(20) NOT NULL DEFAULT 'text',
        content TEXT NOT NULL,
        coaching_id UUID NULL,
        status VARCHAR(10) NOT NULL DEFAULT 'sent',
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        read_at TIMESTAMPTZ NULL
      );
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_care_messages_patient_id
      ON care_messages(patient_id);
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_care_messages_pharmacy_id
      ON care_messages(pharmacy_id);
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_care_messages_created_at
      ON care_messages(created_at DESC);
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_care_messages_status
      ON care_messages(status);
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS care_messages`);
  }
}

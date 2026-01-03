import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Migration: Drop K-Shopping tables
 *
 * Phase H8-6: K-Shopping이 Cosmetics에 통합되어 더 이상 사용되지 않음
 * - kshopping_applications: 참여 신청 테이블 삭제
 * - kshopping_participants: 승인된 참여자 테이블 삭제
 */
export class DropKShoppingTables9990000000011 implements MigrationInterface {
  name = 'DropKShoppingTables9990000000011';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Drop kshopping_participants first (may have FK to applications)
    await queryRunner.query(`
      DROP TABLE IF EXISTS "kshopping_participants" CASCADE
    `);

    // Drop kshopping_applications
    await queryRunner.query(`
      DROP TABLE IF EXISTS "kshopping_applications" CASCADE
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Re-create tables if rollback is needed
    // Note: This is a simplified recreation - original migration had more details

    // Create kshopping_applications table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "kshopping_applications" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "user_id" uuid NOT NULL,
        "participant_type" varchar(50) NOT NULL,
        "organization_name" varchar(255) NOT NULL,
        "business_number" varchar(100),
        "service_types" jsonb NOT NULL DEFAULT '[]',
        "note" text,
        "status" varchar(20) DEFAULT 'submitted',
        "rejection_reason" text,
        "submitted_at" timestamp with time zone NOT NULL DEFAULT now(),
        "decided_at" timestamp with time zone,
        "decided_by" uuid,
        "metadata" jsonb,
        "created_at" timestamp DEFAULT now(),
        "updated_at" timestamp DEFAULT now()
      )
    `);

    // Create kshopping_participants table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "kshopping_participants" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "user_id" uuid NOT NULL,
        "participant_type" varchar(50) NOT NULL,
        "organization_name" varchar(255) NOT NULL,
        "code" varchar(100) UNIQUE NOT NULL,
        "business_number" varchar(100),
        "address" text,
        "phone" varchar(50),
        "email" varchar(255),
        "contact_name" varchar(100),
        "status" varchar(20) DEFAULT 'active',
        "enabled_services" jsonb NOT NULL DEFAULT '[]',
        "sort_order" int DEFAULT 0,
        "application_id" uuid,
        "metadata" jsonb,
        "created_at" timestamp DEFAULT now(),
        "updated_at" timestamp DEFAULT now()
      )
    `);
  }
}

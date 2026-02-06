import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Create KPA Foundation Tables
 *
 * These tables were originally created by TypeORM synchronize
 * but never had explicit CREATE TABLE migrations.
 * This migration ensures they exist in production.
 *
 * Tables:
 * - kpa_organizations: 약사회 조직 (본회, 지부, 분회)
 * - kpa_members: 약사회 회원
 * - kpa_applications: 약사회 신청
 * - kpa_join_inquiries: 참여 문의
 */
export class CreateKpaFoundationTables20260206190000 implements MigrationInterface {
  name = 'CreateKpaFoundationTables20260206190000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Ensure uuid-ossp extension
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);

    // 1. kpa_organizations
    const hasOrgs = await queryRunner.hasTable('kpa_organizations');
    if (!hasOrgs) {
      await queryRunner.query(`
        CREATE TABLE "kpa_organizations" (
          "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
          "name" varchar(200) NOT NULL,
          "type" varchar(50) NOT NULL,
          "parent_id" uuid,
          "description" varchar(500),
          "address" varchar(200),
          "phone" varchar(50),
          "is_active" boolean NOT NULL DEFAULT true,
          "created_at" timestamp NOT NULL DEFAULT now(),
          "updated_at" timestamp NOT NULL DEFAULT now(),
          CONSTRAINT "PK_kpa_organizations" PRIMARY KEY ("id")
        )
      `);
      console.log('[Migration] Created kpa_organizations table');
    } else {
      console.log('[Migration] kpa_organizations already exists, skipping');
    }

    // 2. kpa_members (includes membership_type, university_name, student_year)
    const hasMembers = await queryRunner.hasTable('kpa_members');
    if (!hasMembers) {
      await queryRunner.query(`
        CREATE TABLE "kpa_members" (
          "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
          "user_id" uuid NOT NULL,
          "organization_id" uuid NOT NULL,
          "role" varchar(50) NOT NULL DEFAULT 'member',
          "status" varchar(50) NOT NULL DEFAULT 'pending',
          "membership_type" varchar(50) NOT NULL DEFAULT 'pharmacist',
          "license_number" varchar(100),
          "university_name" varchar(200),
          "student_year" integer,
          "pharmacy_name" varchar(200),
          "pharmacy_address" varchar(300),
          "joined_at" date,
          "created_at" timestamp NOT NULL DEFAULT now(),
          "updated_at" timestamp NOT NULL DEFAULT now(),
          CONSTRAINT "PK_kpa_members" PRIMARY KEY ("id")
        )
      `);
      console.log('[Migration] Created kpa_members table');
    } else {
      console.log('[Migration] kpa_members already exists, skipping');
    }

    // 3. kpa_applications
    const hasApps = await queryRunner.hasTable('kpa_applications');
    if (!hasApps) {
      await queryRunner.query(`
        CREATE TABLE "kpa_applications" (
          "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
          "user_id" uuid NOT NULL,
          "organization_id" uuid NOT NULL,
          "type" varchar(50) NOT NULL,
          "payload" jsonb NOT NULL DEFAULT '{}',
          "status" varchar(50) NOT NULL DEFAULT 'submitted',
          "note" text,
          "reviewer_id" uuid,
          "review_comment" text,
          "reviewed_at" timestamp,
          "created_at" timestamp NOT NULL DEFAULT now(),
          "updated_at" timestamp NOT NULL DEFAULT now(),
          CONSTRAINT "PK_kpa_applications" PRIMARY KEY ("id")
        )
      `);
      console.log('[Migration] Created kpa_applications table');
    } else {
      console.log('[Migration] kpa_applications already exists, skipping');
    }

    // 4. kpa_join_inquiries
    const hasInquiries = await queryRunner.hasTable('kpa_join_inquiries');
    if (!hasInquiries) {
      await queryRunner.query(`
        CREATE TABLE "kpa_join_inquiries" (
          "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
          "type" varchar(50) NOT NULL,
          "contact" varchar(255) NOT NULL,
          "message" text,
          "status" varchar(20) NOT NULL DEFAULT 'new',
          "admin_note" text,
          "ip_address" varchar(50),
          "user_agent" text,
          "referrer" varchar(500),
          "created_at" timestamp NOT NULL DEFAULT now(),
          "updated_at" timestamp NOT NULL DEFAULT now(),
          "contacted_at" timestamp,
          CONSTRAINT "PK_kpa_join_inquiries" PRIMARY KEY ("id")
        )
      `);
      await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_kpa_join_inquiries_type_status" ON "kpa_join_inquiries" ("type", "status")`);
      await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_kpa_join_inquiries_status_created" ON "kpa_join_inquiries" ("status", "created_at")`);
      console.log('[Migration] Created kpa_join_inquiries table');
    } else {
      console.log('[Migration] kpa_join_inquiries already exists, skipping');
    }

    console.log('[Migration] KPA foundation tables migration complete');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "kpa_join_inquiries"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "kpa_applications"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "kpa_members"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "kpa_organizations"`);
  }
}

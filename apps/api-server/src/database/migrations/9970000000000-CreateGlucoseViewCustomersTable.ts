import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * GlucoseView Phase C-2 Migration
 * Creates the glucoseview_customers table for pharmacist-managed customer records
 *
 * Key Features:
 * - Customers are scoped to pharmacist (pharmacist_id)
 * - Supports phone/email identification
 * - Tracks visit history and CGM sync status
 * - Includes consent management for future data sharing
 */
export class CreateGlucoseViewCustomersTable9970000000000 implements MigrationInterface {
  name = 'CreateGlucoseViewCustomersTable9970000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create ENUM types
    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'glucoseview_customer_gender') THEN
          CREATE TYPE glucoseview_customer_gender AS ENUM ('male', 'female');
        END IF;
      END$$;
    `);

    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'glucoseview_customer_sync_status') THEN
          CREATE TYPE glucoseview_customer_sync_status AS ENUM ('pending', 'synced', 'error');
        END IF;
      END$$;
    `);

    // Create glucoseview_customers table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "glucoseview_customers" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "pharmacist_id" character varying(255) NOT NULL,
        "name" character varying(100) NOT NULL,
        "phone" character varying(20),
        "email" character varying(255),
        "age" integer,
        "gender" character varying(10),
        "kakao_id" character varying(100),
        "last_visit" TIMESTAMP,
        "visit_count" integer NOT NULL DEFAULT 1,
        "sync_status" character varying(20) NOT NULL DEFAULT 'pending',
        "last_sync_at" TIMESTAMP,
        "notes" text,
        "data_sharing_consent" boolean NOT NULL DEFAULT false,
        "consent_date" TIMESTAMP,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_glucoseview_customers" PRIMARY KEY ("id")
      )
    `);

    // Create indexes
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_glucoseview_customers_pharmacist_id"
      ON "glucoseview_customers" ("pharmacist_id")
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_glucoseview_customers_pharmacist_phone"
      ON "glucoseview_customers" ("pharmacist_id", "phone")
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_glucoseview_customers_pharmacist_email"
      ON "glucoseview_customers" ("pharmacist_id", "email")
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_glucoseview_customers_last_visit"
      ON "glucoseview_customers" ("last_visit" DESC NULLS LAST)
    `);

    console.log('✅ Created glucoseview_customers table with indexes');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop indexes
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_glucoseview_customers_last_visit"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_glucoseview_customers_pharmacist_email"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_glucoseview_customers_pharmacist_phone"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_glucoseview_customers_pharmacist_id"`);

    // Drop table
    await queryRunner.query(`DROP TABLE IF EXISTS "glucoseview_customers"`);

    // Drop ENUM types
    await queryRunner.query(`DROP TYPE IF EXISTS glucoseview_customer_sync_status`);
    await queryRunner.query(`DROP TYPE IF EXISTS glucoseview_customer_gender`);

    console.log('✅ Dropped glucoseview_customers table');
  }
}

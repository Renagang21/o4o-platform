import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreatePlatformServicesCatalog2026020500001 implements MigrationInterface {
  name = 'CreatePlatformServicesCatalog2026020500001';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create enums
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "platform_service_type_enum" AS ENUM ('community', 'tool', 'extension');
      EXCEPTION WHEN duplicate_object THEN null;
      END $$;
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "platform_service_status_enum" AS ENUM ('active', 'hidden');
      EXCEPTION WHEN duplicate_object THEN null;
      END $$;
    `);

    // Create table
    const hasTable = await queryRunner.hasTable('platform_services');
    if (!hasTable) {
      await queryRunner.query(`
        CREATE TABLE "platform_services" (
          "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
          "code" varchar(50) NOT NULL,
          "name" varchar(100) NOT NULL,
          "short_description" varchar(500),
          "entry_url" varchar(500),
          "service_type" "platform_service_type_enum" NOT NULL DEFAULT 'tool',
          "approval_required" boolean NOT NULL DEFAULT false,
          "visibility_policy" jsonb DEFAULT '{}',
          "is_featured" boolean NOT NULL DEFAULT false,
          "featured_order" int DEFAULT 0,
          "status" "platform_service_status_enum" NOT NULL DEFAULT 'active',
          "icon_emoji" varchar(10),
          "created_at" timestamp NOT NULL DEFAULT now(),
          "updated_at" timestamp NOT NULL DEFAULT now(),
          CONSTRAINT "UQ_platform_services_code" UNIQUE ("code")
        )
      `);

      await queryRunner.query(`
        CREATE INDEX "IDX_platform_services_status" ON "platform_services" ("status")
      `);

      await queryRunner.query(`
        CREATE INDEX "IDX_platform_services_featured" ON "platform_services" ("is_featured", "featured_order")
      `);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "platform_services"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "platform_service_status_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "platform_service_type_enum"`);
  }
}

import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateUserServiceEnrollments2026020500003 implements MigrationInterface {
  name = 'CreateUserServiceEnrollments2026020500003';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create enum
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "enrollment_status_enum" AS ENUM ('not_applied', 'applied', 'approved', 'rejected');
      EXCEPTION WHEN duplicate_object THEN null;
      END $$;
    `);

    // Create table
    const hasTable = await queryRunner.hasTable('user_service_enrollments');
    if (!hasTable) {
      await queryRunner.query(`
        CREATE TABLE "user_service_enrollments" (
          "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
          "user_id" uuid NOT NULL,
          "service_code" varchar(50) NOT NULL,
          "status" "enrollment_status_enum" NOT NULL DEFAULT 'not_applied',
          "applied_at" timestamp,
          "decided_at" timestamp,
          "decided_by" uuid,
          "note" text,
          "metadata" jsonb DEFAULT '{}',
          "created_at" timestamp NOT NULL DEFAULT now(),
          "updated_at" timestamp NOT NULL DEFAULT now(),
          CONSTRAINT "FK_enrollment_user" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE,
          CONSTRAINT "FK_enrollment_service" FOREIGN KEY ("service_code") REFERENCES "platform_services"("code") ON DELETE CASCADE,
          CONSTRAINT "UQ_user_service_enrollment" UNIQUE ("user_id", "service_code")
        )
      `);

      await queryRunner.query(`
        CREATE INDEX "IDX_enrollment_user_status" ON "user_service_enrollments" ("user_id", "status")
      `);

      await queryRunner.query(`
        CREATE INDEX "IDX_enrollment_service_status" ON "user_service_enrollments" ("service_code", "status")
      `);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "user_service_enrollments"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "enrollment_status_enum"`);
  }
}

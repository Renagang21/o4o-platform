import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateKpaOrganizationJoinRequests2026012800001 implements MigrationInterface {
  name = 'CreateKpaOrganizationJoinRequests2026012800001';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const hasTable = await queryRunner.hasTable('kpa_organization_join_requests');
    if (hasTable) {
      console.log('Table kpa_organization_join_requests already exists, skipping');
      return;
    }

    await queryRunner.query(`
      CREATE TABLE "kpa_organization_join_requests" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "user_id" uuid NOT NULL,
        "organization_id" uuid NOT NULL,
        "requested_role" varchar(20) NOT NULL DEFAULT 'member',
        "requested_sub_role" varchar(50),
        "request_type" varchar(20) NOT NULL,
        "payload" jsonb,
        "status" varchar(20) NOT NULL DEFAULT 'pending',
        "reviewed_by" uuid,
        "reviewed_at" timestamp,
        "review_note" text,
        "created_at" timestamp NOT NULL DEFAULT now(),
        "updated_at" timestamp NOT NULL DEFAULT now(),
        CONSTRAINT "PK_kpa_org_join_requests" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`CREATE INDEX "IDX_kojr_org_status" ON "kpa_organization_join_requests" ("organization_id", "status")`);
    await queryRunner.query(`CREATE INDEX "IDX_kojr_user_status" ON "kpa_organization_join_requests" ("user_id", "status")`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_kojr_user_status"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_kojr_org_status"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "kpa_organization_join_requests"`);
  }
}

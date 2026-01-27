import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateForumCategoryRequest2026012700002 implements MigrationInterface {
  name = 'CreateForumCategoryRequest2026012700002';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const hasTable = await queryRunner.hasTable('forum_category_requests');
    if (hasTable) {
      console.log('Table forum_category_requests already exists, skipping');
      return;
    }
    await queryRunner.query(`
      CREATE TABLE "forum_category_requests" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "name" varchar(100) NOT NULL,
        "description" text NOT NULL,
        "reason" text,
        "status" varchar(20) NOT NULL DEFAULT 'pending',
        "service_code" varchar(50) NOT NULL,
        "organization_id" uuid,
        "requester_id" uuid NOT NULL,
        "requester_name" varchar(100) NOT NULL,
        "requester_email" varchar(200),
        "reviewer_id" uuid,
        "reviewer_name" varchar(100),
        "review_comment" text,
        "reviewed_at" timestamp,
        "created_category_id" uuid,
        "created_category_slug" varchar(200),
        "created_at" timestamp NOT NULL DEFAULT now(),
        "updated_at" timestamp NOT NULL DEFAULT now(),
        CONSTRAINT "PK_forum_category_requests" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`CREATE INDEX "IDX_fcr_service_status" ON "forum_category_requests" ("service_code", "status")`);
    await queryRunner.query(`CREATE INDEX "IDX_fcr_service_org_status" ON "forum_category_requests" ("service_code", "organization_id", "status")`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_fcr_service_org_status"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_fcr_service_status"`);
    await queryRunner.query(`DROP TABLE "forum_category_requests"`);
  }
}

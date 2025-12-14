import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateMarketingQuizCampaign9800000000000 implements MigrationInterface {
  name = 'CreateMarketingQuizCampaign9800000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "lms_marketing_quiz_campaigns" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "supplierId" character varying(255) NOT NULL,
        "title" character varying(500) NOT NULL,
        "description" text,
        "bundleId" character varying(255),
        "questions" jsonb NOT NULL DEFAULT '[]',
        "targeting" jsonb NOT NULL DEFAULT '{"targets": ["all"]}',
        "rewards" jsonb NOT NULL DEFAULT '[]',
        "status" character varying(50) NOT NULL DEFAULT 'draft',
        "startDate" TIMESTAMP WITH TIME ZONE,
        "endDate" TIMESTAMP WITH TIME ZONE,
        "isActive" boolean NOT NULL DEFAULT true,
        "isPublished" boolean NOT NULL DEFAULT false,
        "timeLimitSeconds" integer,
        "maxAttempts" integer,
        "passScorePercent" integer NOT NULL DEFAULT 70,
        "showCorrectAnswers" boolean NOT NULL DEFAULT true,
        "shuffleQuestions" boolean NOT NULL DEFAULT false,
        "shuffleOptions" boolean NOT NULL DEFAULT false,
        "participationCount" integer NOT NULL DEFAULT 0,
        "completionCount" integer NOT NULL DEFAULT 0,
        "averageScore" numeric(5,2) NOT NULL DEFAULT 0,
        "publishedAt" TIMESTAMP WITH TIME ZONE,
        "metadata" jsonb NOT NULL DEFAULT '{}',
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_lms_marketing_quiz_campaigns" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_lms_marketing_quiz_campaigns_supplierId"
      ON "lms_marketing_quiz_campaigns" ("supplierId")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_lms_marketing_quiz_campaigns_bundleId"
      ON "lms_marketing_quiz_campaigns" ("bundleId")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_lms_marketing_quiz_campaigns_isActive"
      ON "lms_marketing_quiz_campaigns" ("isActive")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_lms_marketing_quiz_campaigns_status"
      ON "lms_marketing_quiz_campaigns" ("status")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_lms_marketing_quiz_campaigns_dates"
      ON "lms_marketing_quiz_campaigns" ("startDate", "endDate")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "IDX_lms_marketing_quiz_campaigns_dates"`);
    await queryRunner.query(`DROP INDEX "IDX_lms_marketing_quiz_campaigns_status"`);
    await queryRunner.query(`DROP INDEX "IDX_lms_marketing_quiz_campaigns_isActive"`);
    await queryRunner.query(`DROP INDEX "IDX_lms_marketing_quiz_campaigns_bundleId"`);
    await queryRunner.query(`DROP INDEX "IDX_lms_marketing_quiz_campaigns_supplierId"`);
    await queryRunner.query(`DROP TABLE "lms_marketing_quiz_campaigns"`);
  }
}

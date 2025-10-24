import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateAIUsageLogTable1841000000000 implements MigrationInterface {
    name = 'CreateAIUsageLogTable1841000000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Create enum types
        await queryRunner.query(`
            CREATE TYPE "public"."ai_usage_logs_provider_enum" AS ENUM('openai', 'gemini', 'claude')
        `);

        await queryRunner.query(`
            CREATE TYPE "public"."ai_usage_logs_status_enum" AS ENUM('success', 'error')
        `);

        // Create ai_usage_logs table
        await queryRunner.query(`
            CREATE TABLE "ai_usage_logs" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "userId" uuid NOT NULL,
                "provider" "public"."ai_usage_logs_provider_enum" NOT NULL,
                "model" character varying(100) NOT NULL,
                "requestId" uuid,
                "promptTokens" integer,
                "completionTokens" integer,
                "totalTokens" integer,
                "durationMs" integer,
                "status" "public"."ai_usage_logs_status_enum" NOT NULL,
                "errorMessage" text,
                "errorType" character varying(100),
                "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "PK_ai_usage_logs" PRIMARY KEY ("id")
            )
        `);

        // Create indexes
        await queryRunner.query(`
            CREATE INDEX "IDX_ai_usage_logs_user_created" ON "ai_usage_logs" ("userId", "createdAt")
        `);

        await queryRunner.query(`
            CREATE INDEX "IDX_ai_usage_logs_provider_created" ON "ai_usage_logs" ("provider", "createdAt")
        `);

        await queryRunner.query(`
            CREATE INDEX "IDX_ai_usage_logs_status_created" ON "ai_usage_logs" ("status", "createdAt")
        `);

        // Add foreign key
        await queryRunner.query(`
            ALTER TABLE "ai_usage_logs"
            ADD CONSTRAINT "FK_ai_usage_logs_user"
            FOREIGN KEY ("userId")
            REFERENCES "users"("id")
            ON DELETE CASCADE
            ON UPDATE NO ACTION
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Drop foreign key
        await queryRunner.query(`
            ALTER TABLE "ai_usage_logs" DROP CONSTRAINT "FK_ai_usage_logs_user"
        `);

        // Drop indexes
        await queryRunner.query(`DROP INDEX "public"."IDX_ai_usage_logs_status_created"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_ai_usage_logs_provider_created"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_ai_usage_logs_user_created"`);

        // Drop table
        await queryRunner.query(`DROP TABLE "ai_usage_logs"`);

        // Drop enum types
        await queryRunner.query(`DROP TYPE "public"."ai_usage_logs_status_enum"`);
        await queryRunner.query(`DROP TYPE "public"."ai_usage_logs_provider_enum"`);
    }
}

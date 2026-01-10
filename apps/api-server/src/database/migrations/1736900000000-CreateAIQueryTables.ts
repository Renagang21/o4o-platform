import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateAIQueryTables1736900000000 implements MigrationInterface {
    name = 'CreateAIQueryTables1736900000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Create ai_query_policy table
        const policyTableExists = await queryRunner.query(`
            SELECT EXISTS (
                SELECT FROM information_schema.tables
                WHERE table_schema = 'public'
                AND table_name = 'ai_query_policy'
            )
        `);

        if (!policyTableExists[0]?.exists) {
            await queryRunner.query(`
                CREATE TABLE "ai_query_policy" (
                    "id" SERIAL PRIMARY KEY,
                    "free_daily_limit" integer NOT NULL DEFAULT 10,
                    "paid_daily_limit" integer NOT NULL DEFAULT 100,
                    "ai_enabled" boolean NOT NULL DEFAULT true,
                    "default_model" varchar(100) NOT NULL DEFAULT 'gemini-3.0-flash',
                    "system_prompt" text NULL,
                    "created_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                    "updated_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
                )
            `);

            // Insert default policy
            await queryRunner.query(`
                INSERT INTO "ai_query_policy" (
                    "free_daily_limit",
                    "paid_daily_limit",
                    "ai_enabled",
                    "default_model",
                    "system_prompt"
                ) VALUES (
                    10,
                    100,
                    true,
                    'gemini-3.0-flash',
                    '당신은 O4O 플랫폼의 AI 어시스턴트입니다.
사용자의 질문에 친절하고 정확하게 답변해주세요.
제공된 맥락 정보(상품, 카테고리, 서비스 정보)를 적극 활용하여 답변하세요.
한국어로 답변해주세요.'
                )
            `);
        }

        // Create ai_query_logs table
        const logsTableExists = await queryRunner.query(`
            SELECT EXISTS (
                SELECT FROM information_schema.tables
                WHERE table_schema = 'public'
                AND table_name = 'ai_query_logs'
            )
        `);

        if (!logsTableExists[0]?.exists) {
            await queryRunner.query(`
                CREATE TABLE "ai_query_logs" (
                    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
                    "user_id" uuid NOT NULL,
                    "question" text NOT NULL,
                    "answer" text NULL,
                    "context_type" varchar(20) NOT NULL,
                    "context_id" varchar(100) NULL,
                    "context_data" json NULL,
                    "attached_info" json NULL,
                    "query_date" date NOT NULL,
                    "success" boolean NOT NULL DEFAULT true,
                    "error_message" text NULL,
                    "duration_ms" integer NULL,
                    "created_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
                )
            `);

            // Create indexes for efficient querying
            await queryRunner.query(`
                CREATE INDEX "IDX_ai_query_logs_user_date" ON "ai_query_logs" ("user_id", "query_date")
            `);

            await queryRunner.query(`
                CREATE INDEX "IDX_ai_query_logs_user_created" ON "ai_query_logs" ("user_id", "created_at")
            `);
        }
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP TABLE IF EXISTS "ai_query_logs"`);
        await queryRunner.query(`DROP TABLE IF EXISTS "ai_query_policy"`);
    }
}

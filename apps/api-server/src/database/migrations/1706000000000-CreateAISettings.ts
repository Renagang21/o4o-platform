import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateAISettings1706000000000 implements MigrationInterface {
    name = 'CreateAISettings1706000000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Check if table already exists
        const tableExists = await queryRunner.query(`
            SELECT EXISTS (
                SELECT FROM information_schema.tables
                WHERE table_schema = 'public'
                AND table_name = 'ai_settings'
            )
        `);

        if (tableExists[0]?.exists) {
            return;
        }

        await queryRunner.query(`
            CREATE TABLE IF NOT EXISTS "ai_settings" (
                "id" SERIAL PRIMARY KEY,
                "provider" varchar(255) NOT NULL,
                "apiKey" text NULL,
                "defaultModel" varchar(255) NULL,
                "settings" json NULL,
                "isActive" boolean NOT NULL DEFAULT true,
                "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                "updatedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
            )
        `);

        await queryRunner.query(`
            CREATE UNIQUE INDEX IF NOT EXISTS "UQ_ai_settings_provider" ON "ai_settings" ("provider")
        `);

        await queryRunner.query(`
            CREATE INDEX IF NOT EXISTS "IDX_ai_settings_provider" ON "ai_settings" ("provider")
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP TABLE IF EXISTS "ai_settings"`);
    }
}
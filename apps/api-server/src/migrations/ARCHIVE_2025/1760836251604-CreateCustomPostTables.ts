import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateCustomPostTables1760836251604 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Check if fields column exists in custom_posts table
        const fieldsColumnExists = await queryRunner.query(`
            SELECT EXISTS (
                SELECT FROM information_schema.columns
                WHERE table_schema = 'public'
                AND table_name = 'custom_posts'
                AND column_name = 'fields'
            )
        `);

        if (!fieldsColumnExists[0]?.exists) {
            // Add missing fields column
            await queryRunner.query(`
                ALTER TABLE "custom_posts"
                ADD COLUMN "fields" jsonb DEFAULT '{}'
            `);
        }
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Remove fields column
        await queryRunner.query(`
            ALTER TABLE "custom_posts"
            DROP COLUMN IF EXISTS "fields"
        `);
    }

}

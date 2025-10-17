import { MigrationInterface, QueryRunner } from "typeorm";

export class AddCPTTypeToMenuItem1760745000000 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        // Add new enum values to menu_items.type column
        await queryRunner.query(`
            ALTER TYPE menu_items_type_enum ADD VALUE IF NOT EXISTS 'cpt';
        `);

        await queryRunner.query(`
            ALTER TYPE menu_items_type_enum ADD VALUE IF NOT EXISTS 'cpt_archive';
        `);

        // Add index on reference_id for better CPT lookup performance
        await queryRunner.query(`
            CREATE INDEX IF NOT EXISTS "IDX_menu_items_reference_id"
            ON "menu_items" ("reference_id")
            WHERE "reference_id" IS NOT NULL;
        `);

        // Add index on type for filtering
        await queryRunner.query(`
            CREATE INDEX IF NOT EXISTS "IDX_menu_items_type"
            ON "menu_items" ("type");
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Note: PostgreSQL does not support removing enum values directly
        // You would need to recreate the enum type, which is complex
        // For now, we'll just remove the indexes

        await queryRunner.query(`
            DROP INDEX IF EXISTS "IDX_menu_items_reference_id";
        `);

        await queryRunner.query(`
            DROP INDEX IF EXISTS "IDX_menu_items_type";
        `);
    }
}

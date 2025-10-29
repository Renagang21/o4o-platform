import { MigrationInterface, QueryRunner } from "typeorm";

export class AddAccessControlToPosts1761712000000 implements MigrationInterface {
    name = 'AddAccessControlToPosts1761712000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Add accessControl column to posts table
        await queryRunner.query(`
            ALTER TABLE "posts"
            ADD COLUMN "accessControl" jsonb
            DEFAULT '{"enabled": false, "allowedRoles": ["everyone"], "requireLogin": false}'::jsonb
            NOT NULL
        `);

        // Add hideFromSearchEngines column to posts table
        await queryRunner.query(`
            ALTER TABLE "posts"
            ADD COLUMN "hideFromSearchEngines" boolean
            DEFAULT false
            NOT NULL
        `);

        // Add comment for documentation
        await queryRunner.query(`
            COMMENT ON COLUMN "posts"."accessControl" IS
            'Role-based access control configuration for this post/page'
        `);

        await queryRunner.query(`
            COMMENT ON COLUMN "posts"."hideFromSearchEngines" IS
            'Whether to hide this post/page from search engines (useful for restricted content)'
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Remove hideFromSearchEngines column
        await queryRunner.query(`
            ALTER TABLE "posts"
            DROP COLUMN "hideFromSearchEngines"
        `);

        // Remove accessControl column
        await queryRunner.query(`
            ALTER TABLE "posts"
            DROP COLUMN "accessControl"
        `);
    }
}

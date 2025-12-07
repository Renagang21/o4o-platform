import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateCosmeticsCampaignsTable1765300000000 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Create cosmetics_campaigns table
        await queryRunner.query(`
            CREATE TABLE "cosmetics_campaigns" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "title" character varying NOT NULL,
                "type" character varying NOT NULL,
                "brandId" character varying,
                "category" character varying,
                "concerns" jsonb NOT NULL DEFAULT '[]',
                "products" jsonb NOT NULL DEFAULT '[]',
                "routines" jsonb NOT NULL DEFAULT '[]',
                "signagePlaylistId" character varying,
                "metadata" jsonb NOT NULL DEFAULT '{}',
                "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
                "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "PK_cosmetics_campaigns" PRIMARY KEY ("id")
            )
        `);

        // Create index for type
        await queryRunner.query(`
            CREATE INDEX "IDX_cosmetics_campaigns_type"
            ON "cosmetics_campaigns" ("type")
        `);

        // Create index for brandId
        await queryRunner.query(`
            CREATE INDEX "IDX_cosmetics_campaigns_brandId"
            ON "cosmetics_campaigns" ("brandId")
        `);

        // Create index for category
        await queryRunner.query(`
            CREATE INDEX "IDX_cosmetics_campaigns_category"
            ON "cosmetics_campaigns" ("category")
        `);

        // Create index for metadata (for status and tags filtering)
        await queryRunner.query(`
            CREATE INDEX "IDX_cosmetics_campaigns_metadata"
            ON "cosmetics_campaigns" USING GIN ("metadata")
        `);

        // Create index for createdAt
        await queryRunner.query(`
            CREATE INDEX "IDX_cosmetics_campaigns_createdAt"
            ON "cosmetics_campaigns" ("createdAt")
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Drop indexes
        await queryRunner.query(`DROP INDEX "IDX_cosmetics_campaigns_createdAt"`);
        await queryRunner.query(`DROP INDEX "IDX_cosmetics_campaigns_metadata"`);
        await queryRunner.query(`DROP INDEX "IDX_cosmetics_campaigns_category"`);
        await queryRunner.query(`DROP INDEX "IDX_cosmetics_campaigns_brandId"`);
        await queryRunner.query(`DROP INDEX "IDX_cosmetics_campaigns_type"`);

        // Drop table
        await queryRunner.query(`DROP TABLE "cosmetics_campaigns"`);
    }

}

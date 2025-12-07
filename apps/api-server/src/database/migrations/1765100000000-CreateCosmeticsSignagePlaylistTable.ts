import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateCosmeticsSignagePlaylistTable1765100000000 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Create cosmetics_signage_playlists table
        await queryRunner.query(`
            CREATE TABLE "cosmetics_signage_playlists" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "name" character varying NOT NULL,
                "description" character varying,
                "items" jsonb NOT NULL DEFAULT '[]',
                "metadata" jsonb NOT NULL DEFAULT '{}',
                "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
                "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "PK_cosmetics_signage_playlists" PRIMARY KEY ("id")
            )
        `);

        // Create index for name search
        await queryRunner.query(`
            CREATE INDEX "IDX_cosmetics_signage_playlists_name" ON "cosmetics_signage_playlists" ("name")
        `);

        // Create index for metadata (auto-generated flag)
        await queryRunner.query(`
            CREATE INDEX "IDX_cosmetics_signage_playlists_metadata" ON "cosmetics_signage_playlists" USING GIN ("metadata")
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Drop indexes
        await queryRunner.query(`DROP INDEX "IDX_cosmetics_signage_playlists_metadata"`);
        await queryRunner.query(`DROP INDEX "IDX_cosmetics_signage_playlists_name"`);

        // Drop table
        await queryRunner.query(`DROP TABLE "cosmetics_signage_playlists"`);
    }

}

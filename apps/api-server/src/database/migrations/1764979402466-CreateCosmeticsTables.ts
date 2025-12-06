import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateCosmeticsTables1764979402466 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Create cosmetics_filters table
        await queryRunner.query(`
            CREATE TABLE "cosmetics_filters" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "name" character varying NOT NULL,
                "type" character varying NOT NULL,
                "filters" jsonb NOT NULL DEFAULT '{}',
                "enabled" boolean NOT NULL DEFAULT true,
                "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
                "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "PK_cosmetics_filters" PRIMARY KEY ("id"),
                CONSTRAINT "UQ_cosmetics_filters_name" UNIQUE ("name")
            )
        `);

        // Create cosmetics_routines table
        await queryRunner.query(`
            CREATE TABLE "cosmetics_routines" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "partnerId" character varying NOT NULL,
                "title" character varying NOT NULL,
                "description" text,
                "steps" jsonb NOT NULL DEFAULT '[]',
                "metadata" jsonb NOT NULL DEFAULT '{}',
                "isPublished" boolean NOT NULL DEFAULT false,
                "viewCount" integer NOT NULL DEFAULT 0,
                "recommendCount" integer NOT NULL DEFAULT 0,
                "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
                "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "PK_cosmetics_routines" PRIMARY KEY ("id")
            )
        `);

        // Create indexes for cosmetics_routines
        await queryRunner.query(`
            CREATE INDEX "IDX_cosmetics_routines_partnerId" ON "cosmetics_routines" ("partnerId")
        `);

        await queryRunner.query(`
            CREATE INDEX "IDX_cosmetics_routines_isPublished" ON "cosmetics_routines" ("isPublished")
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Drop indexes
        await queryRunner.query(`DROP INDEX "IDX_cosmetics_routines_isPublished"`);
        await queryRunner.query(`DROP INDEX "IDX_cosmetics_routines_partnerId"`);

        // Drop tables
        await queryRunner.query(`DROP TABLE "cosmetics_routines"`);
        await queryRunner.query(`DROP TABLE "cosmetics_filters"`);
    }

}

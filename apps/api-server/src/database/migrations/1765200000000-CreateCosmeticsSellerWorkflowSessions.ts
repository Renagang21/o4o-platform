import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateCosmeticsSellerWorkflowSessions1765200000000 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Create cosmetics_seller_workflow_sessions table
        await queryRunner.query(`
            CREATE TABLE "cosmetics_seller_workflow_sessions" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "sellerId" character varying NOT NULL,
                "customerProfile" jsonb NOT NULL DEFAULT '{}',
                "recommendedProducts" jsonb NOT NULL DEFAULT '[]',
                "recommendedRoutines" jsonb NOT NULL DEFAULT '[]',
                "metadata" jsonb NOT NULL DEFAULT '{}',
                "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
                "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "PK_cosmetics_seller_workflow_sessions" PRIMARY KEY ("id")
            )
        `);

        // Create index for sellerId
        await queryRunner.query(`
            CREATE INDEX "IDX_cosmetics_seller_workflow_sessions_sellerId"
            ON "cosmetics_seller_workflow_sessions" ("sellerId")
        `);

        // Create index for metadata (for status filtering)
        await queryRunner.query(`
            CREATE INDEX "IDX_cosmetics_seller_workflow_sessions_metadata"
            ON "cosmetics_seller_workflow_sessions" USING GIN ("metadata")
        `);

        // Create index for createdAt (for date range queries)
        await queryRunner.query(`
            CREATE INDEX "IDX_cosmetics_seller_workflow_sessions_createdAt"
            ON "cosmetics_seller_workflow_sessions" ("createdAt")
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Drop indexes
        await queryRunner.query(`DROP INDEX "IDX_cosmetics_seller_workflow_sessions_createdAt"`);
        await queryRunner.query(`DROP INDEX "IDX_cosmetics_seller_workflow_sessions_metadata"`);
        await queryRunner.query(`DROP INDEX "IDX_cosmetics_seller_workflow_sessions_sellerId"`);

        // Drop table
        await queryRunner.query(`DROP TABLE "cosmetics_seller_workflow_sessions"`);
    }

}

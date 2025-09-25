import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateOrdersTable1758697616298 implements MigrationInterface {
    name = 'CreateOrdersTable1758697616298'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "typeorm_query_cache" ("id" SERIAL NOT NULL, "identifier" character varying, "time" bigint NOT NULL, "duration" integer NOT NULL, "query" text NOT NULL, "result" text NOT NULL, CONSTRAINT "PK_1f75b779fc97bbd7f0ae61f909a" PRIMARY KEY ("id"))`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP TABLE "typeorm_query_cache"`);
    }

}

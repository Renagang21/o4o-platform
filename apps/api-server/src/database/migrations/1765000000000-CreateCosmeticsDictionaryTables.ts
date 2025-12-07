import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateCosmeticsDictionaryTables1765000000000 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Create cosmetics_skin_types table
        await queryRunner.query(`
            CREATE TABLE "cosmetics_skin_types" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "name" character varying NOT NULL,
                "description" character varying,
                "metadata" jsonb NOT NULL DEFAULT '{}',
                "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
                "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "PK_cosmetics_skin_types" PRIMARY KEY ("id"),
                CONSTRAINT "UQ_cosmetics_skin_types_name" UNIQUE ("name")
            )
        `);

        // Create cosmetics_concerns table
        await queryRunner.query(`
            CREATE TABLE "cosmetics_concerns" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "name" character varying NOT NULL,
                "description" character varying,
                "metadata" jsonb NOT NULL DEFAULT '{}',
                "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
                "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "PK_cosmetics_concerns" PRIMARY KEY ("id"),
                CONSTRAINT "UQ_cosmetics_concerns_name" UNIQUE ("name")
            )
        `);

        // Create cosmetics_ingredients table
        await queryRunner.query(`
            CREATE TABLE "cosmetics_ingredients" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "name" character varying NOT NULL,
                "description" character varying,
                "metadata" jsonb NOT NULL DEFAULT '{}',
                "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
                "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "PK_cosmetics_ingredients" PRIMARY KEY ("id"),
                CONSTRAINT "UQ_cosmetics_ingredients_name" UNIQUE ("name")
            )
        `);

        // Create cosmetics_categories table
        await queryRunner.query(`
            CREATE TABLE "cosmetics_categories" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "name" character varying NOT NULL,
                "description" character varying,
                "metadata" jsonb NOT NULL DEFAULT '{}',
                "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
                "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "PK_cosmetics_categories" PRIMARY KEY ("id"),
                CONSTRAINT "UQ_cosmetics_categories_name" UNIQUE ("name")
            )
        `);

        // Create indexes for better search performance
        await queryRunner.query(`
            CREATE INDEX "IDX_cosmetics_skin_types_name" ON "cosmetics_skin_types" ("name")
        `);

        await queryRunner.query(`
            CREATE INDEX "IDX_cosmetics_concerns_name" ON "cosmetics_concerns" ("name")
        `);

        await queryRunner.query(`
            CREATE INDEX "IDX_cosmetics_ingredients_name" ON "cosmetics_ingredients" ("name")
        `);

        await queryRunner.query(`
            CREATE INDEX "IDX_cosmetics_categories_name" ON "cosmetics_categories" ("name")
        `);

        // Insert initial seed data for common skin types
        await queryRunner.query(`
            INSERT INTO "cosmetics_skin_types" ("name", "description", "metadata")
            VALUES
                ('건성', '피부가 건조하고 당기는 느낌', '{"tags": ["dry", "dehydrated"], "displayOrder": 1}'),
                ('지성', '피지 분비가 많고 번들거리는 피부', '{"tags": ["oily", "greasy"], "displayOrder": 2}'),
                ('복합성', '부위별로 건성과 지성이 섞인 피부', '{"tags": ["combination", "mixed"], "displayOrder": 3}'),
                ('민감성', '자극에 쉽게 반응하는 피부', '{"tags": ["sensitive", "reactive"], "displayOrder": 4}'),
                ('중성', '유수분 밸런스가 적절한 피부', '{"tags": ["normal", "balanced"], "displayOrder": 5}')
        `);

        // Insert initial seed data for common concerns
        await queryRunner.query(`
            INSERT INTO "cosmetics_concerns" ("name", "description", "metadata")
            VALUES
                ('주름/탄력', '주름 개선 및 탄력 강화', '{"tags": ["anti-aging", "wrinkle"], "category": "anti-aging", "displayOrder": 1}'),
                ('미백/잡티', '피부 톤 개선 및 잡티 완화', '{"tags": ["brightening", "whitening"], "category": "brightening", "displayOrder": 2}'),
                ('수분/보습', '피부 수분 공급 및 보습', '{"tags": ["hydration", "moisture"], "category": "hydration", "displayOrder": 3}'),
                ('모공/피지', '모공 관리 및 피지 조절', '{"tags": ["pore", "sebum"], "category": "pore-care", "displayOrder": 4}'),
                ('트러블/여드름', '여드름 및 트러블 개선', '{"tags": ["acne", "trouble"], "category": "acne", "displayOrder": 5}'),
                ('진정/민감', '피부 진정 및 민감 완화', '{"tags": ["soothing", "calming"], "category": "soothing", "displayOrder": 6}')
        `);

        // Insert initial seed data for common categories
        await queryRunner.query(`
            INSERT INTO "cosmetics_categories" ("name", "description", "metadata")
            VALUES
                ('클렌징', '메이크업 및 노폐물 제거', '{"tags": ["cleanser", "cleansing"], "routineStep": 1, "displayOrder": 1}'),
                ('토너', '피부결 정돈 및 수분 공급', '{"tags": ["toner", "skin"], "routineStep": 2, "displayOrder": 2}'),
                ('에센스/세럼', '집중 케어 기능성 제품', '{"tags": ["essence", "serum"], "routineStep": 3, "displayOrder": 3}'),
                ('크림/로션', '보습 및 영양 공급', '{"tags": ["cream", "lotion", "moisturizer"], "routineStep": 4, "displayOrder": 4}'),
                ('마스크팩', '집중 케어 및 영양 공급', '{"tags": ["mask", "sheet-mask"], "routineStep": 5, "displayOrder": 5}'),
                ('선케어', '자외선 차단', '{"tags": ["sunscreen", "sun-care"], "routineStep": 6, "displayOrder": 6}')
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Drop indexes
        await queryRunner.query(`DROP INDEX "IDX_cosmetics_categories_name"`);
        await queryRunner.query(`DROP INDEX "IDX_cosmetics_ingredients_name"`);
        await queryRunner.query(`DROP INDEX "IDX_cosmetics_concerns_name"`);
        await queryRunner.query(`DROP INDEX "IDX_cosmetics_skin_types_name"`);

        // Drop tables
        await queryRunner.query(`DROP TABLE "cosmetics_categories"`);
        await queryRunner.query(`DROP TABLE "cosmetics_ingredients"`);
        await queryRunner.query(`DROP TABLE "cosmetics_concerns"`);
        await queryRunner.query(`DROP TABLE "cosmetics_skin_types"`);
    }

}

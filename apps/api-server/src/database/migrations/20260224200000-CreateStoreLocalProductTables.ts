import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * WO-STORE-LOCAL-PRODUCT-DISPLAY-V1
 *
 * StoreLocalProduct + Tablet Display Domain:
 * - store_local_products: 매장 자체 상품 (Display Domain, Commerce 아님)
 * - store_tablets: 태블릿 디바이스 등록
 * - store_tablet_displays: 태블릿 진열 구성 (supplier/local 상품 혼합)
 */
export class CreateStoreLocalProductTables20260224200000 implements MigrationInterface {
  name = 'CreateStoreLocalProductTables20260224200000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // ── store_local_products ──
    await queryRunner.query(`
      CREATE TABLE "store_local_products" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "organization_id" uuid NOT NULL,
        "name" varchar(200) NOT NULL,
        "description" text,
        "images" jsonb NOT NULL DEFAULT '[]',
        "category" varchar(100),
        "price_display" numeric(12,2),
        "is_active" boolean NOT NULL DEFAULT true,
        "sort_order" integer NOT NULL DEFAULT 0,
        "created_at" timestamp NOT NULL DEFAULT now(),
        "updated_at" timestamp NOT NULL DEFAULT now(),
        CONSTRAINT "PK_store_local_products" PRIMARY KEY ("id"),
        CONSTRAINT "FK_store_local_products_org"
          FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE
      )
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_store_local_products_org"
        ON "store_local_products" ("organization_id")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_store_local_products_org_active"
        ON "store_local_products" ("organization_id", "is_active")
    `);

    // ── store_tablets ──
    await queryRunner.query(`
      CREATE TABLE "store_tablets" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "organization_id" uuid NOT NULL,
        "name" varchar(100) NOT NULL,
        "location" varchar(100),
        "is_active" boolean NOT NULL DEFAULT true,
        "created_at" timestamp NOT NULL DEFAULT now(),
        CONSTRAINT "PK_store_tablets" PRIMARY KEY ("id"),
        CONSTRAINT "FK_store_tablets_org"
          FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE
      )
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_store_tablets_org"
        ON "store_tablets" ("organization_id")
    `);

    // ── store_tablet_displays ──
    await queryRunner.query(`
      CREATE TABLE "store_tablet_displays" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "tablet_id" uuid NOT NULL,
        "product_type" varchar(20) NOT NULL,
        "product_id" uuid NOT NULL,
        "sort_order" integer NOT NULL DEFAULT 0,
        "is_visible" boolean NOT NULL DEFAULT true,
        "created_at" timestamp NOT NULL DEFAULT now(),
        CONSTRAINT "PK_store_tablet_displays" PRIMARY KEY ("id"),
        CONSTRAINT "FK_store_tablet_displays_tablet"
          FOREIGN KEY ("tablet_id") REFERENCES "store_tablets"("id") ON DELETE CASCADE,
        CONSTRAINT "CHK_store_tablet_displays_product_type"
          CHECK ("product_type" IN ('supplier', 'local'))
      )
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_store_tablet_displays_tablet"
        ON "store_tablet_displays" ("tablet_id")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_store_tablet_displays_tablet_sort"
        ON "store_tablet_displays" ("tablet_id", "sort_order")
    `);

    console.log('[CreateStoreLocalProductTables] Tables and indexes created successfully.');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "store_tablet_displays"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "store_tablets"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "store_local_products"`);
  }
}

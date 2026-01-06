import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateMenuSystem1780000000001 implements MigrationInterface {
  name = 'CreateMenuSystem1780000000001';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create menus table
    await queryRunner.query(`
      CREATE TABLE "menus" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "name" character varying(255) NOT NULL,
        "slug" character varying(255) NOT NULL,
        "location" character varying(50),
        "description" text,
        "is_active" boolean NOT NULL DEFAULT true,
        "metadata" jsonb,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_menus_slug" UNIQUE ("slug"),
        CONSTRAINT "PK_menus" PRIMARY KEY ("id")
      )
    `);

    // Create index on slug
    await queryRunner.query(`CREATE INDEX "IDX_menus_slug" ON "menus" ("slug")`);

    // Create menu_items table with closure table support
    await queryRunner.query(`
      CREATE TYPE "public"."menu_items_type_enum" AS ENUM('page', 'custom', 'category', 'archive', 'post')
    `);
    
    await queryRunner.query(`
      CREATE TYPE "public"."menu_items_target_enum" AS ENUM('_self', '_blank', '_parent', '_top')
    `);

    await queryRunner.query(`
      CREATE TABLE "menu_items" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "menu_id" uuid NOT NULL,
        "title" character varying(255) NOT NULL,
        "url" text,
        "type" "public"."menu_items_type_enum" NOT NULL DEFAULT 'custom',
        "target" "public"."menu_items_target_enum" NOT NULL DEFAULT '_self',
        "icon" character varying(255),
        "css_class" character varying(255),
        "order_num" integer NOT NULL DEFAULT '0',
        "reference_id" uuid,
        "metadata" jsonb,
        "parentId" uuid,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_menu_items" PRIMARY KEY ("id")
      )
    `);

    // Create closure table for tree structure
    await queryRunner.query(`
      CREATE TABLE "menu_items_closure" (
        "id_ancestor" uuid NOT NULL,
        "id_descendant" uuid NOT NULL,
        CONSTRAINT "PK_menu_items_closure" PRIMARY KEY ("id_ancestor", "id_descendant")
      )
    `);

    // Create indexes
    await queryRunner.query(`CREATE INDEX "IDX_menu_items_menu_id" ON "menu_items" ("menu_id")`);
    await queryRunner.query(`CREATE INDEX "IDX_menu_items_closure_ancestor" ON "menu_items_closure" ("id_ancestor")`);
    await queryRunner.query(`CREATE INDEX "IDX_menu_items_closure_descendant" ON "menu_items_closure" ("id_descendant")`);

    // Add foreign keys
    await queryRunner.query(`
      ALTER TABLE "menu_items" 
      ADD CONSTRAINT "FK_menu_items_menu" 
      FOREIGN KEY ("menu_id") REFERENCES "menus"("id") 
      ON DELETE CASCADE ON UPDATE NO ACTION
    `);

    await queryRunner.query(`
      ALTER TABLE "menu_items" 
      ADD CONSTRAINT "FK_menu_items_parent" 
      FOREIGN KEY ("parentId") REFERENCES "menu_items"("id") 
      ON DELETE CASCADE ON UPDATE NO ACTION
    `);

    await queryRunner.query(`
      ALTER TABLE "menu_items_closure" 
      ADD CONSTRAINT "FK_menu_items_closure_ancestor" 
      FOREIGN KEY ("id_ancestor") REFERENCES "menu_items"("id") 
      ON DELETE CASCADE ON UPDATE NO ACTION
    `);

    await queryRunner.query(`
      ALTER TABLE "menu_items_closure" 
      ADD CONSTRAINT "FK_menu_items_closure_descendant" 
      FOREIGN KEY ("id_descendant") REFERENCES "menu_items"("id") 
      ON DELETE CASCADE ON UPDATE NO ACTION
    `);

    // Create menu_locations table
    await queryRunner.query(`
      CREATE TABLE "menu_locations" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "key" character varying(50) NOT NULL,
        "name" character varying(255) NOT NULL,
        "description" text,
        "is_active" boolean NOT NULL DEFAULT true,
        "order_num" integer NOT NULL DEFAULT '0',
        "metadata" jsonb,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_menu_locations_key" UNIQUE ("key"),
        CONSTRAINT "PK_menu_locations" PRIMARY KEY ("id")
      )
    `);

    // Create index on key
    await queryRunner.query(`CREATE INDEX "IDX_menu_locations_key" ON "menu_locations" ("key")`);

    // Insert default menu locations
    await queryRunner.query(`
      INSERT INTO "menu_locations" ("key", "name", "description", "order_num") VALUES
      ('primary', 'Primary Menu', 'Main navigation menu', 1),
      ('footer', 'Footer Menu', 'Footer navigation links', 2),
      ('mobile', 'Mobile Menu', 'Mobile-specific navigation', 3),
      ('sidebar', 'Sidebar Menu', 'Sidebar navigation links', 4)
    `);

    // Create sample menu for testing
    await queryRunner.query(`
      INSERT INTO "menus" ("name", "slug", "location", "description") VALUES
      ('Main Navigation', 'main-navigation', 'primary', 'Primary site navigation menu')
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop foreign keys
    await queryRunner.query(`ALTER TABLE "menu_items_closure" DROP CONSTRAINT "FK_menu_items_closure_descendant"`);
    await queryRunner.query(`ALTER TABLE "menu_items_closure" DROP CONSTRAINT "FK_menu_items_closure_ancestor"`);
    await queryRunner.query(`ALTER TABLE "menu_items" DROP CONSTRAINT "FK_menu_items_parent"`);
    await queryRunner.query(`ALTER TABLE "menu_items" DROP CONSTRAINT "FK_menu_items_menu"`);

    // Drop indexes
    await queryRunner.query(`DROP INDEX "public"."IDX_menu_locations_key"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_menu_items_closure_descendant"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_menu_items_closure_ancestor"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_menu_items_menu_id"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_menus_slug"`);

    // Drop tables
    await queryRunner.query(`DROP TABLE "menu_locations"`);
    await queryRunner.query(`DROP TABLE "menu_items_closure"`);
    await queryRunner.query(`DROP TABLE "menu_items"`);
    await queryRunner.query(`DROP TABLE "menus"`);

    // Drop enums
    await queryRunner.query(`DROP TYPE "public"."menu_items_target_enum"`);
    await queryRunner.query(`DROP TYPE "public"."menu_items_type_enum"`);
  }
}
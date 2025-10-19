"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CreateCPTEngineEntities1800000001000 = void 0;
class CreateCPTEngineEntities1800000001000 {
    constructor() {
        this.name = 'CreateCPTEngineEntities1800000001000';
    }
    async up(queryRunner) {
        // Create taxonomies table
        await queryRunner.query(`
      CREATE TABLE "taxonomies" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "name" character varying(32) NOT NULL,
        "label" character varying(255) NOT NULL,
        "description" text,
        "objectTypes" text,
        "labels" jsonb,
        "settings" jsonb,
        "hierarchical" boolean NOT NULL DEFAULT true,
        "public" boolean NOT NULL DEFAULT true,
        "showUI" boolean NOT NULL DEFAULT true,
        "showInMenu" boolean NOT NULL DEFAULT true,
        "showInNavMenus" boolean NOT NULL DEFAULT true,
        "showTagcloud" boolean NOT NULL DEFAULT true,
        "showInQuickEdit" boolean NOT NULL DEFAULT true,
        "showAdminColumn" boolean NOT NULL DEFAULT false,
        "sortOrder" integer NOT NULL DEFAULT 0,
        "createdBy" character varying NOT NULL,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_taxonomies_name" UNIQUE ("name"),
        CONSTRAINT "PK_taxonomies" PRIMARY KEY ("id")
      )
    `);
        // Create terms table with materialized path for hierarchy
        await queryRunner.query(`
      CREATE TABLE "terms" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "name" character varying(200) NOT NULL,
        "slug" character varying(200) NOT NULL,
        "description" text,
        "count" integer NOT NULL DEFAULT 0,
        "taxonomyId" uuid NOT NULL,
        "parentId" uuid,
        "mpath" character varying DEFAULT '',
        "meta" jsonb,
        "termOrder" integer NOT NULL DEFAULT 0,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_terms_slug" UNIQUE ("slug"),
        CONSTRAINT "PK_terms" PRIMARY KEY ("id")
      )
    `);
        // Create term_relationships table
        await queryRunner.query(`
      CREATE TABLE "term_relationships" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "objectId" uuid NOT NULL,
        "objectType" character varying(50) NOT NULL,
        "termId" uuid NOT NULL,
        "termOrder" integer NOT NULL DEFAULT 0,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_term_relationships" PRIMARY KEY ("id")
      )
    `);
        // Add foreign key constraints
        await queryRunner.query(`
      ALTER TABLE "taxonomies"
      ADD CONSTRAINT "FK_taxonomies_createdBy"
      FOREIGN KEY ("createdBy") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION
    `);
        await queryRunner.query(`
      ALTER TABLE "terms"
      ADD CONSTRAINT "FK_terms_taxonomy"
      FOREIGN KEY ("taxonomyId") REFERENCES "taxonomies"("id") ON DELETE CASCADE ON UPDATE NO ACTION
    `);
        await queryRunner.query(`
      ALTER TABLE "terms"
      ADD CONSTRAINT "FK_terms_parent"
      FOREIGN KEY ("parentId") REFERENCES "terms"("id") ON DELETE SET NULL ON UPDATE NO ACTION
    `);
        await queryRunner.query(`
      ALTER TABLE "term_relationships"
      ADD CONSTRAINT "FK_term_relationships_term"
      FOREIGN KEY ("termId") REFERENCES "terms"("id") ON DELETE CASCADE ON UPDATE NO ACTION
    `);
        // Create indexes for better performance
        await queryRunner.query(`CREATE INDEX "IDX_taxonomies_name" ON "taxonomies" ("name")`);
        await queryRunner.query(`CREATE INDEX "IDX_taxonomies_objectTypes" ON "taxonomies" USING GIN ("objectTypes")`);
        await queryRunner.query(`CREATE INDEX "IDX_terms_taxonomyId" ON "terms" ("taxonomyId")`);
        await queryRunner.query(`CREATE INDEX "IDX_terms_slug" ON "terms" ("slug")`);
        await queryRunner.query(`CREATE INDEX "IDX_terms_parent" ON "terms" ("parentId")`);
        await queryRunner.query(`CREATE INDEX "IDX_terms_mpath" ON "terms" ("mpath")`);
        await queryRunner.query(`CREATE INDEX "IDX_term_relationships_object" ON "term_relationships" ("objectId", "objectType")`);
        await queryRunner.query(`CREATE INDEX "IDX_term_relationships_term" ON "term_relationships" ("termId")`);
        // Insert default taxonomies
        await queryRunner.query(`
      INSERT INTO "taxonomies" ("name", "label", "description", "objectTypes", "hierarchical", "createdBy")
      VALUES
        ('category', 'Categories', 'Hierarchical taxonomy for organizing content', 'post,page', true, (SELECT id FROM users WHERE role = 'admin' LIMIT 1)),
        ('post_tag', 'Tags', 'Non-hierarchical taxonomy for tagging content', 'post', false, (SELECT id FROM users WHERE role = 'admin' LIMIT 1)),
        ('product_cat', 'Product Categories', 'Product categories for e-commerce', 'product,ds_product', true, (SELECT id FROM users WHERE role = 'admin' LIMIT 1)),
        ('product_tag', 'Product Tags', 'Product tags for e-commerce', 'product,ds_product', false, (SELECT id FROM users WHERE role = 'admin' LIMIT 1))
    `);
        // Insert some default terms
        await queryRunner.query(`
      INSERT INTO "terms" ("name", "slug", "description", "taxonomyId")
      SELECT 'Uncategorized', 'uncategorized', 'Default category', id FROM "taxonomies" WHERE name = 'category'
    `);
        await queryRunner.query(`
      INSERT INTO "terms" ("name", "slug", "description", "taxonomyId")
      SELECT 'General', 'general', 'General product category', id FROM "taxonomies" WHERE name = 'product_cat'
    `);
        // CPT Engine entities (Taxonomies, Terms, Term Relationships) created successfully
    }
    async down(queryRunner) {
        // Drop foreign key constraints first
        await queryRunner.query(`ALTER TABLE "term_relationships" DROP CONSTRAINT "FK_term_relationships_term"`);
        await queryRunner.query(`ALTER TABLE "terms" DROP CONSTRAINT "FK_terms_parent"`);
        await queryRunner.query(`ALTER TABLE "terms" DROP CONSTRAINT "FK_terms_taxonomy"`);
        await queryRunner.query(`ALTER TABLE "taxonomies" DROP CONSTRAINT "FK_taxonomies_createdBy"`);
        // Drop indexes
        await queryRunner.query(`DROP INDEX "IDX_term_relationships_term"`);
        await queryRunner.query(`DROP INDEX "IDX_term_relationships_object"`);
        await queryRunner.query(`DROP INDEX "IDX_terms_mpath"`);
        await queryRunner.query(`DROP INDEX "IDX_terms_parent"`);
        await queryRunner.query(`DROP INDEX "IDX_terms_slug"`);
        await queryRunner.query(`DROP INDEX "IDX_terms_taxonomyId"`);
        await queryRunner.query(`DROP INDEX "IDX_taxonomies_objectTypes"`);
        await queryRunner.query(`DROP INDEX "IDX_taxonomies_name"`);
        // Drop tables
        await queryRunner.query(`DROP TABLE "term_relationships"`);
        await queryRunner.query(`DROP TABLE "terms"`);
        await queryRunner.query(`DROP TABLE "taxonomies"`);
        // CPT Engine entities dropped successfully
    }
}
exports.CreateCPTEngineEntities1800000001000 = CreateCPTEngineEntities1800000001000;
//# sourceMappingURL=1800000001000-CreateCPTEngineEntities.js.map
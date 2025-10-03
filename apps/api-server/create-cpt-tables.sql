-- Create CPT Engine tables manually
-- This script creates the tables for Taxonomies, Terms, and Term Relationships

-- Create taxonomies table
CREATE TABLE IF NOT EXISTS "taxonomies" (
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
);

-- Create terms table with materialized path for hierarchy
CREATE TABLE IF NOT EXISTS "terms" (
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
);

-- Create term_relationships table
CREATE TABLE IF NOT EXISTS "term_relationships" (
  "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
  "objectId" uuid NOT NULL,
  "objectType" character varying(50) NOT NULL,
  "termId" uuid NOT NULL,
  "termOrder" integer NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
  CONSTRAINT "PK_term_relationships" PRIMARY KEY ("id")
);

-- Add foreign key constraints (only if not already exists)
DO $$
BEGIN
  -- Check if FK constraints exist and add them if they don't
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'FK_taxonomies_createdBy') THEN
    ALTER TABLE "taxonomies"
    ADD CONSTRAINT "FK_taxonomies_createdBy"
    FOREIGN KEY ("createdBy") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'FK_terms_taxonomy') THEN
    ALTER TABLE "terms"
    ADD CONSTRAINT "FK_terms_taxonomy"
    FOREIGN KEY ("taxonomyId") REFERENCES "taxonomies"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'FK_terms_parent') THEN
    ALTER TABLE "terms"
    ADD CONSTRAINT "FK_terms_parent"
    FOREIGN KEY ("parentId") REFERENCES "terms"("id") ON DELETE SET NULL ON UPDATE NO ACTION;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'FK_term_relationships_term') THEN
    ALTER TABLE "term_relationships"
    ADD CONSTRAINT "FK_term_relationships_term"
    FOREIGN KEY ("termId") REFERENCES "terms"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
  END IF;
END $$;

-- Create indexes for better performance (only if not already exists)
DO $$
BEGIN
  -- Check if indexes exist and create them if they don't
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'IDX_taxonomies_name') THEN
    CREATE INDEX "IDX_taxonomies_name" ON "taxonomies" ("name");
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'IDX_taxonomies_objectTypes') THEN
    CREATE INDEX "IDX_taxonomies_objectTypes" ON "taxonomies" USING GIN ("objectTypes");
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'IDX_terms_taxonomyId') THEN
    CREATE INDEX "IDX_terms_taxonomyId" ON "terms" ("taxonomyId");
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'IDX_terms_slug') THEN
    CREATE INDEX "IDX_terms_slug" ON "terms" ("slug");
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'IDX_terms_parent') THEN
    CREATE INDEX "IDX_terms_parent" ON "terms" ("parentId");
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'IDX_terms_mpath') THEN
    CREATE INDEX "IDX_terms_mpath" ON "terms" ("mpath");
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'IDX_term_relationships_object') THEN
    CREATE INDEX "IDX_term_relationships_object" ON "term_relationships" ("objectId", "objectType");
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'IDX_term_relationships_term') THEN
    CREATE INDEX "IDX_term_relationships_term" ON "term_relationships" ("termId");
  END IF;
END $$;

-- Insert default taxonomies (only if they don't exist)
DO $$
DECLARE
  admin_user_id uuid;
BEGIN
  -- Get an admin user ID (fallback to first user if no admin found)
  SELECT id INTO admin_user_id FROM users WHERE role = 'admin' LIMIT 1;

  IF admin_user_id IS NULL THEN
    SELECT id INTO admin_user_id FROM users LIMIT 1;
  END IF;

  IF admin_user_id IS NOT NULL THEN
    -- Insert default taxonomies if they don't exist
    INSERT INTO "taxonomies" ("name", "label", "description", "objectTypes", "hierarchical", "createdBy")
    SELECT 'category', 'Categories', 'Hierarchical taxonomy for organizing content', 'post,page', true, admin_user_id
    WHERE NOT EXISTS (SELECT 1 FROM "taxonomies" WHERE "name" = 'category');

    INSERT INTO "taxonomies" ("name", "label", "description", "objectTypes", "hierarchical", "createdBy")
    SELECT 'post_tag', 'Tags', 'Non-hierarchical taxonomy for tagging content', 'post', false, admin_user_id
    WHERE NOT EXISTS (SELECT 1 FROM "taxonomies" WHERE "name" = 'post_tag');

    INSERT INTO "taxonomies" ("name", "label", "description", "objectTypes", "hierarchical", "createdBy")
    SELECT 'product_cat', 'Product Categories', 'Product categories for e-commerce', 'product,ds_product', true, admin_user_id
    WHERE NOT EXISTS (SELECT 1 FROM "taxonomies" WHERE "name" = 'product_cat');

    INSERT INTO "taxonomies" ("name", "label", "description", "objectTypes", "hierarchical", "createdBy")
    SELECT 'product_tag', 'Product Tags', 'Product tags for e-commerce', 'product,ds_product', false, admin_user_id
    WHERE NOT EXISTS (SELECT 1 FROM "taxonomies" WHERE "name" = 'product_tag');

    -- Insert some default terms
    INSERT INTO "terms" ("name", "slug", "description", "taxonomyId")
    SELECT 'Uncategorized', 'uncategorized', 'Default category', t.id
    FROM "taxonomies" t
    WHERE t.name = 'category'
    AND NOT EXISTS (SELECT 1 FROM "terms" WHERE "slug" = 'uncategorized');

    INSERT INTO "terms" ("name", "slug", "description", "taxonomyId")
    SELECT 'General', 'general', 'General product category', t.id
    FROM "taxonomies" t
    WHERE t.name = 'product_cat'
    AND NOT EXISTS (SELECT 1 FROM "terms" WHERE "slug" = 'general');
  END IF;
END $$;

-- Update migrations table to mark this migration as executed
INSERT INTO "migrations" ("timestamp", "name")
SELECT 1800000001000, 'CreateCPTEngineEntities1800000001000'
WHERE NOT EXISTS (SELECT 1 FROM "migrations" WHERE "name" = 'CreateCPTEngineEntities1800000001000');

-- Success message
SELECT 'CPT Engine tables created successfully!' as result;
-- Production Menu System Setup Script
-- This script creates the menu system tables and initial data for production

-- Create menu system tables directly
CREATE TABLE IF NOT EXISTS "menus" (
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
);

-- Create menu types
DO $$ BEGIN
  CREATE TYPE "public"."menu_items_type_enum" AS ENUM('page', 'custom', 'category', 'archive', 'post');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "public"."menu_items_target_enum" AS ENUM('_self', '_blank', '_parent', '_top');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS "menu_items" (
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
);

-- Create foreign key constraints
ALTER TABLE "menu_items" 
ADD CONSTRAINT "FK_menu_items_menu" 
FOREIGN KEY ("menu_id") REFERENCES "menus"("id") 
ON DELETE CASCADE ON UPDATE NO ACTION;

ALTER TABLE "menu_items" 
ADD CONSTRAINT "FK_menu_items_parent" 
FOREIGN KEY ("parentId") REFERENCES "menu_items"("id") 
ON DELETE CASCADE ON UPDATE NO ACTION;

-- Insert primary menu
INSERT INTO "menus" ("name", "slug", "location", "description") 
VALUES ('Primary Menu', 'primary-menu', 'primary', 'Main site navigation menu')
ON CONFLICT ("slug") DO UPDATE SET 
  "name" = EXCLUDED."name",
  "location" = EXCLUDED."location",
  "description" = EXCLUDED."description";

-- Add menu items for primary-menu
WITH menu_data AS (
  SELECT id FROM menus WHERE slug = 'primary-menu'
)
INSERT INTO "menu_items" ("menu_id", "title", "url", "type", "target", "order_num")
SELECT 
  menu_data.id,
  item.title,
  item.url,
  'custom'::menu_items_type_enum,
  '_self'::menu_items_target_enum,
  item.order_num
FROM menu_data,
(VALUES 
  ('홈', '/', 0),
  ('소개', '/about', 1),
  ('서비스', '/services', 2),
  ('문의', '/contact', 3)
) AS item(title, url, order_num)
ON CONFLICT DO NOTHING;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS "IDX_menus_slug" ON "menus" ("slug");
CREATE INDEX IF NOT EXISTS "IDX_menu_items_menu_id" ON "menu_items" ("menu_id");
CREATE INDEX IF NOT EXISTS "IDX_menu_items_order" ON "menu_items" ("order_num");

-- Verify the setup
SELECT 'Menu Setup Verification:' as status;
SELECT m.id, m.name, m.slug, m.location, COUNT(mi.id) as item_count
FROM menus m
LEFT JOIN menu_items mi ON m.id = mi.menu_id
WHERE m.slug = 'primary-menu'
GROUP BY m.id, m.name, m.slug, m.location;
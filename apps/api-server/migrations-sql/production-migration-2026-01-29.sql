-- =============================================================================
-- O4O Platform Production Migration
-- Date: 2026-01-29
-- Description: Forum Tables + Product Images Column
-- =============================================================================
-- This file combines:
-- 1. forum-migration.sql (Forum functionality)
-- 2. product-images-migration.sql (Product images support)
-- =============================================================================

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================================================
-- PART 1: FORUM TABLES
-- =============================================================================

-- ============================================================================
-- 1. Create forum_category table
-- ============================================================================
CREATE TABLE IF NOT EXISTS forum_category (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(100) NOT NULL,
  description TEXT,
  slug VARCHAR(200) UNIQUE NOT NULL,
  color VARCHAR(50),
  "sortOrder" INTEGER DEFAULT 0,
  "isActive" BOOLEAN DEFAULT true,
  "requireApproval" BOOLEAN DEFAULT false,
  "accessLevel" VARCHAR(20) DEFAULT 'all' CHECK ("accessLevel" IN ('all', 'member', 'business', 'admin')),
  "postCount" INTEGER DEFAULT 0,
  "createdBy" UUID,
  "organizationId" UUID,
  "isOrganizationExclusive" BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now(),
  FOREIGN KEY ("createdBy") REFERENCES users(id) ON DELETE SET NULL,
  FOREIGN KEY ("organizationId") REFERENCES organization(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS "IDX_FORUM_CATEGORY_ACTIVE_SORT" ON forum_category ("isActive", "sortOrder");
CREATE INDEX IF NOT EXISTS "IDX_forum_category_organization" ON forum_category ("organizationId", "isActive");

-- ============================================================================
-- 2. Create forum_post table
-- ============================================================================
CREATE TABLE IF NOT EXISTS forum_post (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title VARCHAR(200) NOT NULL,
  slug VARCHAR(250) UNIQUE NOT NULL,
  content JSONB DEFAULT '[]'::jsonb,
  excerpt TEXT,
  type VARCHAR(20) DEFAULT 'discussion' CHECK (type IN ('discussion', 'question', 'announcement', 'poll', 'guide')),
  status VARCHAR(20) DEFAULT 'publish' CHECK (status IN ('draft', 'publish', 'pending', 'rejected', 'archived')),
  "categoryId" UUID,
  author_id UUID,
  "isPinned" BOOLEAN DEFAULT false,
  "isLocked" BOOLEAN DEFAULT false,
  "allowComments" BOOLEAN DEFAULT true,
  "viewCount" INTEGER DEFAULT 0,
  "commentCount" INTEGER DEFAULT 0,
  "likeCount" INTEGER DEFAULT 0,
  tags TEXT,
  metadata JSONB,
  published_at TIMESTAMP,
  last_comment_at TIMESTAMP,
  last_comment_by UUID,
  organization_id UUID,
  is_organization_exclusive BOOLEAN DEFAULT false,
  show_contact_on_post BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now(),
  FOREIGN KEY ("categoryId") REFERENCES forum_category(id) ON DELETE CASCADE,
  FOREIGN KEY (author_id) REFERENCES users(id),
  FOREIGN KEY (last_comment_by) REFERENCES users(id) ON DELETE SET NULL,
  FOREIGN KEY (organization_id) REFERENCES organization(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS "IDX_FORUM_POST_CATEGORY_STATUS" ON forum_post ("categoryId", status, "isPinned", created_at);
CREATE INDEX IF NOT EXISTS "IDX_forum_post_organization" ON forum_post (organization_id, status, created_at);

-- ============================================================================
-- 3. Create forum_comment table
-- ============================================================================
CREATE TABLE IF NOT EXISTS forum_comment (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  "postId" UUID NOT NULL,
  author_id UUID NOT NULL,
  content TEXT NOT NULL,
  status VARCHAR(20) DEFAULT 'publish' CHECK (status IN ('publish', 'pending', 'deleted')),
  "parentId" UUID,
  depth INTEGER DEFAULT 0,
  "likeCount" INTEGER DEFAULT 0,
  "replyCount" INTEGER DEFAULT 0,
  "isEdited" BOOLEAN DEFAULT false,
  "editedAt" TIMESTAMP,
  "deletedAt" TIMESTAMP,
  "deletedBy" UUID,
  "deletionReason" TEXT,
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now(),
  FOREIGN KEY ("postId") REFERENCES forum_post(id) ON DELETE CASCADE,
  FOREIGN KEY (author_id) REFERENCES users(id),
  FOREIGN KEY ("parentId") REFERENCES forum_comment(id) ON DELETE CASCADE,
  FOREIGN KEY ("deletedBy") REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS "IDX_FORUM_COMMENT_POST_STATUS" ON forum_comment ("postId", status);
CREATE INDEX IF NOT EXISTS "IDX_FORUM_COMMENT_PARENT" ON forum_comment ("parentId");

-- ============================================================================
-- 4. Create forum_tag table
-- ============================================================================
CREATE TABLE IF NOT EXISTS forum_tag (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(50) UNIQUE NOT NULL,
  slug VARCHAR(100) UNIQUE NOT NULL,
  description TEXT,
  color VARCHAR(50),
  "usageCount" INTEGER DEFAULT 0,
  "isActive" BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);

-- ============================================================================
-- 5. Create forum_like table
-- ============================================================================
CREATE TABLE IF NOT EXISTS forum_like (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  "userId" UUID NOT NULL,
  "targetType" VARCHAR(20) NOT NULL CHECK ("targetType" IN ('post', 'comment')),
  "targetId" UUID NOT NULL,
  created_at TIMESTAMP DEFAULT now(),
  FOREIGN KEY ("userId") REFERENCES users(id) ON DELETE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "IDX_FORUM_LIKE_USER_TARGET" ON forum_like ("userId", "targetType", "targetId");

-- ============================================================================
-- 6. Create forum_bookmark table
-- ============================================================================
CREATE TABLE IF NOT EXISTS forum_bookmark (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  "userId" UUID NOT NULL,
  "postId" UUID NOT NULL,
  notes TEXT,
  tags TEXT,
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now(),
  FOREIGN KEY ("userId") REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY ("postId") REFERENCES forum_post(id) ON DELETE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "IDX_FORUM_BOOKMARK_USER_POST" ON forum_bookmark ("userId", "postId");

-- ============================================================================
-- 7. Record Forum migration in TypeORM migrations table
-- ============================================================================
INSERT INTO migrations (timestamp, name)
VALUES (1738182000000, 'CreateForumTables1738182000000')
ON CONFLICT DO NOTHING;

SELECT 'Forum tables created successfully' AS result;

-- =============================================================================
-- PART 2: PRODUCT IMAGES COLUMN
-- =============================================================================

-- ============================================================================
-- 8. Add images column to glycopharm_products
-- ============================================================================
ALTER TABLE public.glycopharm_products
ADD COLUMN IF NOT EXISTS images JSONB;

-- Add GIN index for JSONB performance
CREATE INDEX IF NOT EXISTS "IDX_glycopharm_products_images"
ON public.glycopharm_products USING GIN (images);

-- ============================================================================
-- 9. Record Product Images migration in TypeORM migrations table
-- ============================================================================
INSERT INTO migrations (timestamp, name)
VALUES (1738181200000, 'AddImagesToGlycopharmProducts1738181200000')
ON CONFLICT DO NOTHING;

SELECT 'Glycopharm images column added successfully' AS result;

-- =============================================================================
-- MIGRATION COMPLETE
-- =============================================================================
SELECT 'All migrations completed successfully' AS final_result;

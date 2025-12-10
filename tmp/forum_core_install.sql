-- forum-core install SQL

-- Enable uuid extension if needed
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. forum_category table
CREATE TABLE IF NOT EXISTS forum_category (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(100) NOT NULL,
  description TEXT,
  slug VARCHAR(200) UNIQUE NOT NULL,
  color VARCHAR(50),
  "sortOrder" INT DEFAULT 0,
  "isActive" BOOLEAN DEFAULT true,
  "requireApproval" BOOLEAN DEFAULT false,
  "accessLevel" VARCHAR(20) DEFAULT 'all',
  "postCount" INT DEFAULT 0,
  "createdBy" UUID,
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);
CREATE INDEX IF NOT EXISTS "IDX_FORUM_CATEGORY_ACTIVE_SORT" ON forum_category ("isActive", "sortOrder");

-- 2. forum_post table
CREATE TABLE IF NOT EXISTS forum_post (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title VARCHAR(200) NOT NULL,
  slug VARCHAR(250) UNIQUE NOT NULL,
  content TEXT NOT NULL,
  excerpt TEXT,
  type VARCHAR(20) DEFAULT 'discussion',
  status VARCHAR(20) DEFAULT 'publish',
  "categoryId" UUID NOT NULL REFERENCES forum_category(id) ON DELETE CASCADE,
  author_id UUID NOT NULL,
  "isPinned" BOOLEAN DEFAULT false,
  "isLocked" BOOLEAN DEFAULT false,
  "allowComments" BOOLEAN DEFAULT true,
  "viewCount" INT DEFAULT 0,
  "commentCount" INT DEFAULT 0,
  "likeCount" INT DEFAULT 0,
  tags TEXT,
  "featuredImageUrl" VARCHAR(500),
  published_at TIMESTAMP,
  "archivedAt" TIMESTAMP,
  "lockedAt" TIMESTAMP,
  "rejectionReason" TEXT,
  "metaTitle" VARCHAR(200),
  "metaDescription" TEXT,
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);
CREATE INDEX IF NOT EXISTS "IDX_FORUM_POST_CATEGORY_STATUS" ON forum_post ("categoryId", status, "isPinned", created_at);

-- 3. forum_comment table
CREATE TABLE IF NOT EXISTS forum_comment (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  "postId" UUID NOT NULL REFERENCES forum_post(id) ON DELETE CASCADE,
  author_id UUID NOT NULL,
  content TEXT NOT NULL,
  status VARCHAR(20) DEFAULT 'publish',
  "parentId" UUID REFERENCES forum_comment(id) ON DELETE CASCADE,
  depth INT DEFAULT 0,
  "likeCount" INT DEFAULT 0,
  "replyCount" INT DEFAULT 0,
  "isEdited" BOOLEAN DEFAULT false,
  "editedAt" TIMESTAMP,
  "deletedAt" TIMESTAMP,
  "deletedBy" UUID,
  "deletionReason" TEXT,
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);
CREATE INDEX IF NOT EXISTS "IDX_FORUM_COMMENT_POST_STATUS" ON forum_comment ("postId", status);
CREATE INDEX IF NOT EXISTS "IDX_FORUM_COMMENT_PARENT" ON forum_comment ("parentId");

-- 4. forum_tag table
CREATE TABLE IF NOT EXISTS forum_tag (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(50) UNIQUE NOT NULL,
  slug VARCHAR(100) UNIQUE NOT NULL,
  description TEXT,
  color VARCHAR(50),
  "usageCount" INT DEFAULT 0,
  "isActive" BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);

-- 5. forum_like table
CREATE TABLE IF NOT EXISTS forum_like (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  "userId" UUID NOT NULL,
  "targetType" VARCHAR(20) NOT NULL,
  "targetId" UUID NOT NULL,
  created_at TIMESTAMP DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS "IDX_FORUM_LIKE_USER_TARGET" ON forum_like ("userId", "targetType", "targetId");

-- 6. forum_bookmark table
CREATE TABLE IF NOT EXISTS forum_bookmark (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  "userId" UUID NOT NULL,
  "postId" UUID NOT NULL REFERENCES forum_post(id) ON DELETE CASCADE,
  notes TEXT,
  tags TEXT,
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS "IDX_FORUM_BOOKMARK_USER_POST" ON forum_bookmark ("userId", "postId");

-- Register app
INSERT INTO app_registry ("appId", name, version, type, status, "installedAt", "updatedAt")
VALUES ('forum-core', 'Forum Core', '1.0.0', 'core', 'active', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("appId") DO UPDATE SET status = 'active', "updatedAt" = CURRENT_TIMESTAMP;

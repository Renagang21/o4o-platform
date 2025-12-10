-- forum-yaksa install SQL

-- Create enum type
DO $$ BEGIN
  CREATE TYPE community_type AS ENUM ('personal', 'branch', 'division', 'global');
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- 1. yaksa_forum_community
CREATE TABLE IF NOT EXISTS yaksa_forum_community (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(200) NOT NULL,
  description TEXT,
  type community_type DEFAULT 'personal',
  "ownerUserId" UUID,
  "organizationId" UUID,
  "requireApproval" BOOLEAN DEFAULT false,
  metadata JSONB,
  "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. yaksa_forum_community_member
CREATE TABLE IF NOT EXISTS yaksa_forum_community_member (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "communityId" UUID NOT NULL REFERENCES yaksa_forum_community(id) ON DELETE CASCADE,
  "userId" UUID NOT NULL,
  role VARCHAR(50) DEFAULT 'member',
  status VARCHAR(50) DEFAULT 'active',
  "joinedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  metadata JSONB,
  "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE("communityId", "userId")
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_yaksa_community_type_owner ON yaksa_forum_community(type, "ownerUserId");
CREATE INDEX IF NOT EXISTS idx_yaksa_community_org ON yaksa_forum_community("organizationId");
CREATE INDEX IF NOT EXISTS idx_yaksa_community_member_community ON yaksa_forum_community_member("communityId");
CREATE INDEX IF NOT EXISTS idx_yaksa_community_member_user ON yaksa_forum_community_member("userId");

-- Register app
INSERT INTO app_registry ("appId", name, version, type, status, "installedAt", "updatedAt")
VALUES ('forum-yaksa', 'Forum Extension - Yaksa Organization', '1.0.0', 'extension', 'active', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("appId") DO UPDATE SET status = 'active', "updatedAt" = CURRENT_TIMESTAMP;

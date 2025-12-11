/**
 * Forum-Yaksa Install Hook
 *
 * Called when the app is installed.
 * Creates all required tables for Forum-Yaksa extension.
 */

import type { DataSource } from 'typeorm';

export interface InstallContext {
  dataSource: DataSource;
  organizationId?: string;
  config?: Record<string, any>;
}

export async function install(context: InstallContext): Promise<void> {
  const { dataSource } = context;
  console.log('[forum-yaksa] Installing...');

  try {
    await createTables(dataSource);
    await createIndexes(dataSource);

    console.log('[forum-yaksa] Installation complete');
    console.log('[forum-yaksa] Features:');
    console.log('  - Yaksa community management');
    console.log('  - Yaksa community membership');
    console.log('  - Pharmacy-focused forum categories');
  } catch (error) {
    console.error('[forum-yaksa] Installation failed:', error);
    throw error;
  }
}

/**
 * Create Forum-Yaksa tables
 */
async function createTables(dataSource: DataSource): Promise<void> {
  // ============================================
  // 1. yaksa_forum_community table
  // ============================================
  await dataSource.query(`
    CREATE TABLE IF NOT EXISTS yaksa_forum_community (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      name VARCHAR(255) NOT NULL,
      slug VARCHAR(255) NOT NULL,
      description TEXT,
      organization_id UUID,
      require_approval BOOLEAN DEFAULT false,
      is_active BOOLEAN DEFAULT true,
      metadata JSONB,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(slug)
    );
  `);
  console.log('[forum-yaksa] Created yaksa_forum_community table');

  // ============================================
  // 2. yaksa_forum_community_member table
  // ============================================
  await dataSource.query(`
    CREATE TABLE IF NOT EXISTS yaksa_forum_community_member (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      community_id UUID NOT NULL REFERENCES yaksa_forum_community(id) ON DELETE CASCADE,
      user_id UUID NOT NULL,
      role VARCHAR(50) DEFAULT 'member',
      joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      is_approved BOOLEAN DEFAULT false,
      metadata JSONB,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(community_id, user_id)
    );
  `);
  console.log('[forum-yaksa] Created yaksa_forum_community_member table');
}

/**
 * Create indexes for Forum-Yaksa tables
 */
async function createIndexes(dataSource: DataSource): Promise<void> {
  console.log('[forum-yaksa] Creating indexes...');

  await dataSource.query(`
    -- yaksa_forum_community indexes
    CREATE INDEX IF NOT EXISTS idx_yaksa_community_org ON yaksa_forum_community(organization_id);
    CREATE INDEX IF NOT EXISTS idx_yaksa_community_slug ON yaksa_forum_community(slug);
    CREATE INDEX IF NOT EXISTS idx_yaksa_community_active ON yaksa_forum_community(is_active);

    -- yaksa_forum_community_member indexes
    CREATE INDEX IF NOT EXISTS idx_yaksa_member_community ON yaksa_forum_community_member(community_id);
    CREATE INDEX IF NOT EXISTS idx_yaksa_member_user ON yaksa_forum_community_member(user_id);
    CREATE INDEX IF NOT EXISTS idx_yaksa_member_role ON yaksa_forum_community_member(role);
  `);

  console.log('[forum-yaksa] Indexes created successfully');
}

export default install;

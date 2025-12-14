/**
 * Forum-Cosmetics Install Hook
 *
 * Called when the app is installed.
 * Creates all required tables for Forum-Cosmetics extension.
 */

import type { DataSource } from 'typeorm';

export interface InstallContext {
  dataSource: DataSource;
  organizationId?: string;
  config?: Record<string, any>;
}

export async function install(context: InstallContext): Promise<void> {
  const { dataSource } = context;
  console.log('[forum-cosmetics] Installing...');

  try {
    // Check if forum-core is installed (required dependency)
    await checkDependencies(dataSource);

    // Create tables
    await createTables(dataSource);

    // Create indexes
    await createIndexes(dataSource);

    // Register cosmetics_meta ACF group
    await registerACFGroup(dataSource);

    console.log('[forum-cosmetics] Installation complete');
    console.log('[forum-cosmetics] Features:');
    console.log('  - Cosmetics forum metadata management');
    console.log('  - Skin type filtering');
    console.log('  - Skincare concerns integration');
    console.log('  - Product and brand tracking');
    console.log('  - Rating-based sorting');
  } catch (error) {
    console.error('[forum-cosmetics] Installation failed:', error);
    throw error;
  }
}

/**
 * Check required dependencies
 */
async function checkDependencies(dataSource: DataSource): Promise<void> {
  console.log('[forum-cosmetics] Checking dependencies...');

  // Check if forum_post table exists (from forum-core)
  try {
    await dataSource.query(`SELECT 1 FROM forum_post LIMIT 1`);
    console.log('[forum-cosmetics] forum-core dependency verified');
  } catch (error) {
    console.warn('[forum-cosmetics] forum_post table not found. Forum-core may not be installed.');
    // Don't throw - allow installation to continue for table creation
  }
}

/**
 * Create Forum-Cosmetics tables
 */
async function createTables(dataSource: DataSource): Promise<void> {
  // ============================================
  // cosmetics_forum_meta table
  // ============================================
  await dataSource.query(`
    CREATE TABLE IF NOT EXISTS cosmetics_forum_meta (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      post_id UUID NOT NULL,
      skin_type VARCHAR(50),
      concerns TEXT,
      brand VARCHAR(100),
      product_id VARCHAR(100),
      product_name VARCHAR(255),
      rating DECIMAL(2, 1),
      ingredients TEXT,
      post_type VARCHAR(50) DEFAULT 'review',
      is_verified_purchase BOOLEAN DEFAULT false,
      is_featured BOOLEAN DEFAULT false,
      additional_data JSONB,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(post_id)
    );
  `);
  console.log('[forum-cosmetics] Created cosmetics_forum_meta table');
}

/**
 * Create indexes for Forum-Cosmetics tables
 */
async function createIndexes(dataSource: DataSource): Promise<void> {
  console.log('[forum-cosmetics] Creating indexes...');

  await dataSource.query(`
    -- cosmetics_forum_meta indexes
    CREATE INDEX IF NOT EXISTS idx_cosmetics_meta_post_id ON cosmetics_forum_meta(post_id);
    CREATE INDEX IF NOT EXISTS idx_cosmetics_meta_skin_type ON cosmetics_forum_meta(skin_type);
    CREATE INDEX IF NOT EXISTS idx_cosmetics_meta_brand ON cosmetics_forum_meta(brand);
    CREATE INDEX IF NOT EXISTS idx_cosmetics_meta_rating ON cosmetics_forum_meta(rating);
    CREATE INDEX IF NOT EXISTS idx_cosmetics_meta_post_type ON cosmetics_forum_meta(post_type);
    CREATE INDEX IF NOT EXISTS idx_cosmetics_meta_featured ON cosmetics_forum_meta(is_featured);
  `);

  console.log('[forum-cosmetics] Indexes created successfully');
}

/**
 * Register ACF group for cosmetics metadata
 */
async function registerACFGroup(dataSource: DataSource): Promise<void> {
  console.log('[forum-cosmetics] Registering cosmetics_meta ACF group...');

  // Check if cms_acf_group table exists
  try {
    const tableExists = await dataSource.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_schema = 'public'
        AND table_name = 'cms_acf_group'
      );
    `);

    if (tableExists[0]?.exists) {
      // Register ACF group if table exists
      await dataSource.query(`
        INSERT INTO cms_acf_group (id, group_id, name, label, description, status, metadata)
        VALUES (
          uuid_generate_v4(),
          'cosmetics_meta',
          'cosmetics_meta',
          'Cosmetics Metadata',
          'Cosmetics-specific metadata for forum posts',
          'active',
          $1::jsonb
        )
        ON CONFLICT (group_id) DO UPDATE SET
          label = EXCLUDED.label,
          description = EXCLUDED.description,
          metadata = EXCLUDED.metadata,
          updated_at = CURRENT_TIMESTAMP;
      `, [JSON.stringify({
        fields: [
          { key: 'skinType', type: 'select', label: '피부 타입', options: ['건성', '지성', '복합성', '민감성', '중성'] },
          { key: 'concerns', type: 'multiselect', label: '피부 고민', options: ['모공', '미백', '주름', '탄력', '여드름', '홍조', '각질', '잡티', '다크서클'] },
          { key: 'brand', type: 'text', label: '브랜드' },
          { key: 'productId', type: 'text', label: '제품 ID' },
          { key: 'rating', type: 'number', label: '평점', min: 1, max: 5 },
          { key: 'ingredients', type: 'multiselect', label: '주요 성분', options: ['레티놀', '비타민C', '나이아신아마이드', '히알루론산', 'AHA', 'BHA', '세라마이드', '펩타이드', '콜라겐'] },
        ],
        attachTo: 'forum_post',
      })]);
      console.log('[forum-cosmetics] cosmetics_meta ACF group registered');
    } else {
      console.log('[forum-cosmetics] cms_acf_group table not found, skipping ACF registration');
    }
  } catch (error) {
    console.warn('[forum-cosmetics] Failed to register ACF group:', error);
    // Non-fatal error - continue installation
  }
}

export default install;

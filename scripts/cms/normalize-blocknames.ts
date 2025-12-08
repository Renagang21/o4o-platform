#!/usr/bin/env npx ts-node
/**
 * CMS Block Name Normalization Script
 *
 * Normalizes all block names in Template content to the canonical `o4o/{block-name}` format.
 *
 * Usage:
 *   npx ts-node scripts/cms/normalize-blocknames.ts [--dry-run] [--verbose]
 *
 * Options:
 *   --dry-run   Preview changes without modifying database
 *   --verbose   Show detailed output for each template
 *
 * Examples:
 *   npx ts-node scripts/cms/normalize-blocknames.ts --dry-run
 *   npx ts-node scripts/cms/normalize-blocknames.ts --verbose
 *   npx ts-node scripts/cms/normalize-blocknames.ts
 */

import { DataSource } from 'typeorm';
import * as path from 'path';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../../apps/api-server/.env') });

// Block name mapping table
// Maps legacy/alternative names to canonical o4o/ format
const BLOCK_NAME_MAP: Record<string, string> = {
  // Core blocks - bare names
  'paragraph': 'o4o/paragraph',
  'heading': 'o4o/heading',
  'image': 'o4o/image',
  'list': 'o4o/list',
  'quote': 'o4o/quote',
  'code': 'o4o/code',
  'table': 'o4o/table',
  'divider': 'o4o/divider',
  'spacer': 'o4o/spacer',
  'button': 'o4o/button',
  'columns': 'o4o/columns',
  'column': 'o4o/column',
  'group': 'o4o/group',
  'cover': 'o4o/cover',
  'media-text': 'o4o/media-text',
  'gallery': 'o4o/gallery',
  'video': 'o4o/video',
  'audio': 'o4o/audio',
  'file': 'o4o/file',
  'embed': 'o4o/embed',
  'html': 'o4o/html',
  'shortcode': 'o4o/shortcode',
  'reusable': 'o4o/reusable',
  'template-part': 'o4o/template-part',
  'section': 'o4o/section',

  // Core blocks - core/ prefix
  'core/paragraph': 'o4o/paragraph',
  'core/heading': 'o4o/heading',
  'core/image': 'o4o/image',
  'core/list': 'o4o/list',
  'core/list-item': 'o4o/list-item',
  'core/quote': 'o4o/quote',
  'core/code': 'o4o/code',
  'core/table': 'o4o/table',
  'core/divider': 'o4o/divider',
  'core/spacer': 'o4o/spacer',
  'core/button': 'o4o/button',
  'core/buttons': 'o4o/buttons',
  'core/columns': 'o4o/columns',
  'core/column': 'o4o/column',
  'core/group': 'o4o/group',
  'core/cover': 'o4o/cover',
  'core/media-text': 'o4o/media-text',
  'core/gallery': 'o4o/gallery',
  'core/video': 'o4o/video',
  'core/audio': 'o4o/audio',
  'core/file': 'o4o/file',
  'core/embed': 'o4o/embed',
  'core/html': 'o4o/html',
  'core/shortcode': 'o4o/shortcode',
  'core/block': 'o4o/reusable',
  'core/template-part': 'o4o/template-part',
  'core/section': 'o4o/section',

  // Already o4o/ - no change needed (included for completeness)
  'o4o/paragraph': 'o4o/paragraph',
  'o4o/heading': 'o4o/heading',
  'o4o/image': 'o4o/image',
  'o4o/list': 'o4o/list',
  'o4o/list-item': 'o4o/list-item',
  'o4o/quote': 'o4o/quote',
  'o4o/code': 'o4o/code',
  'o4o/table': 'o4o/table',
  'o4o/divider': 'o4o/divider',
  'o4o/spacer': 'o4o/spacer',
  'o4o/button': 'o4o/button',
  'o4o/buttons': 'o4o/buttons',
  'o4o/columns': 'o4o/columns',
  'o4o/column': 'o4o/column',
  'o4o/group': 'o4o/group',
  'o4o/cover': 'o4o/cover',
  'o4o/media-text': 'o4o/media-text',
  'o4o/gallery': 'o4o/gallery',
  'o4o/video': 'o4o/video',
  'o4o/audio': 'o4o/audio',
  'o4o/file': 'o4o/file',
  'o4o/embed': 'o4o/embed',
  'o4o/html': 'o4o/html',
  'o4o/shortcode': 'o4o/shortcode',
  'o4o/reusable': 'o4o/reusable',
  'o4o/template-part': 'o4o/template-part',
  'o4o/section': 'o4o/section',
};

// CLI arguments
const args = process.argv.slice(2);
const DRY_RUN = args.includes('--dry-run');
const VERBOSE = args.includes('--verbose');

interface BlockContent {
  type?: string;
  blockName?: string;
  attrs?: Record<string, unknown>;
  content?: BlockContent[];
  [key: string]: unknown;
}

interface NormalizationResult {
  templateId: string;
  templateName: string;
  changes: Array<{
    path: string;
    from: string;
    to: string;
  }>;
}

/**
 * Normalize a single block name
 */
function normalizeBlockName(name: string): string {
  // Check if in mapping table
  if (BLOCK_NAME_MAP[name]) {
    return BLOCK_NAME_MAP[name];
  }

  // If already has o4o/ prefix, keep as is
  if (name.startsWith('o4o/')) {
    return name;
  }

  // Remove core/ prefix and add o4o/
  if (name.startsWith('core/')) {
    return `o4o/${name.replace('core/', '')}`;
  }

  // Add o4o/ prefix to bare names
  return `o4o/${name}`;
}

/**
 * Recursively normalize block names in content
 */
function normalizeContent(
  content: BlockContent | BlockContent[],
  path: string = '',
  changes: NormalizationResult['changes'] = []
): BlockContent | BlockContent[] {
  if (Array.isArray(content)) {
    return content.map((item, index) =>
      normalizeContent(item, `${path}[${index}]`, changes) as BlockContent
    );
  }

  if (typeof content !== 'object' || content === null) {
    return content;
  }

  const result: BlockContent = { ...content };

  // Normalize 'type' field
  if (typeof result.type === 'string' && result.type) {
    const normalized = normalizeBlockName(result.type);
    if (normalized !== result.type) {
      changes.push({
        path: `${path}.type`,
        from: result.type,
        to: normalized
      });
      result.type = normalized;
    }
  }

  // Normalize 'blockName' field (alternative field name)
  if (typeof result.blockName === 'string' && result.blockName) {
    const normalized = normalizeBlockName(result.blockName);
    if (normalized !== result.blockName) {
      changes.push({
        path: `${path}.blockName`,
        from: result.blockName,
        to: normalized
      });
      result.blockName = normalized;
    }
  }

  // Recursively process nested content
  if (result.content && Array.isArray(result.content)) {
    result.content = normalizeContent(
      result.content,
      `${path}.content`,
      changes
    ) as BlockContent[];
  }

  // Process innerBlocks if present
  if (result.innerBlocks && Array.isArray(result.innerBlocks)) {
    result.innerBlocks = normalizeContent(
      result.innerBlocks as BlockContent[],
      `${path}.innerBlocks`,
      changes
    ) as BlockContent[];
  }

  return result;
}

/**
 * Main execution
 */
async function main(): Promise<void> {
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('  CMS Block Name Normalization Script');
  console.log('═══════════════════════════════════════════════════════════════');
  console.log(`  Mode: ${DRY_RUN ? '🔍 DRY RUN (no changes will be made)' : '✏️ LIVE (changes will be saved)'}`);
  console.log(`  Verbose: ${VERBOSE ? 'Yes' : 'No'}`);
  console.log('═══════════════════════════════════════════════════════════════\n');

  // Create database connection
  const dataSource = new DataSource({
    type: 'postgres',
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    username: process.env.DB_USERNAME || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    database: process.env.DB_DATABASE || 'o4o_platform',
    synchronize: false,
    logging: false,
  });

  try {
    await dataSource.initialize();
    console.log('✓ Database connected\n');

    // Check if templates table exists
    const tableExists = await dataSource.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_name = 'templates'
      );
    `);

    if (!tableExists[0]?.exists) {
      console.log('⚠️ Templates table does not exist. Nothing to normalize.');
      await dataSource.destroy();
      return;
    }

    // Load all templates
    const templates = await dataSource.query(`
      SELECT id, name, content FROM templates
    `);

    console.log(`Found ${templates.length} templates to process\n`);

    const results: NormalizationResult[] = [];
    let totalChanges = 0;

    // Process each template
    for (const template of templates) {
      const changes: NormalizationResult['changes'] = [];

      let content: BlockContent | BlockContent[];
      try {
        content = typeof template.content === 'string'
          ? JSON.parse(template.content)
          : template.content;
      } catch (e) {
        console.log(`⚠️ Skipping template "${template.name}" (id: ${template.id}) - invalid JSON content`);
        continue;
      }

      if (!content) {
        continue;
      }

      const normalizedContent = normalizeContent(content, 'content', changes);

      if (changes.length > 0) {
        totalChanges += changes.length;
        results.push({
          templateId: template.id,
          templateName: template.name,
          changes
        });

        if (VERBOSE) {
          console.log(`📝 Template: "${template.name}" (id: ${template.id})`);
          changes.forEach(change => {
            console.log(`   ${change.path}: "${change.from}" → "${change.to}"`);
          });
          console.log('');
        }

        // Update database if not dry run
        if (!DRY_RUN) {
          await dataSource.query(
            `UPDATE templates SET content = $1, "updatedAt" = NOW() WHERE id = $2`,
            [JSON.stringify(normalizedContent), template.id]
          );
        }
      }
    }

    // Summary
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('  Summary');
    console.log('═══════════════════════════════════════════════════════════════');
    console.log(`  Templates processed: ${templates.length}`);
    console.log(`  Templates with changes: ${results.length}`);
    console.log(`  Total block name changes: ${totalChanges}`);
    console.log('═══════════════════════════════════════════════════════════════\n');

    if (results.length > 0 && !VERBOSE) {
      console.log('Templates modified:');
      results.forEach(result => {
        console.log(`  • "${result.templateName}" - ${result.changes.length} changes`);
      });
      console.log('');
    }

    if (DRY_RUN && totalChanges > 0) {
      console.log('💡 Run without --dry-run to apply these changes.\n');
    } else if (!DRY_RUN && totalChanges > 0) {
      console.log('✅ All changes have been applied to the database.\n');
    } else if (totalChanges === 0) {
      console.log('✓ All block names are already in canonical o4o/ format.\n');
    }

    await dataSource.destroy();

  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

main();

/**
 * Forum Full-Text Search Utilities
 *
 * Provides utilities for extracting searchable text from Block[] content
 * and building PostgreSQL full-text search vectors.
 */

import type { Block } from '@o4o/types';

/**
 * Extract plain text from a single Block
 * Handles various block types including nested blocks
 */
function extractTextFromBlock(block: Block): string {
  if (!block) return '';

  const texts: string[] = [];

  // Extract from content field
  if (block.content) {
    if (typeof block.content === 'string') {
      texts.push(block.content);
    } else if (typeof block.content === 'object') {
      // Handle structured content (e.g., { text: '...' })
      if (block.content.text) {
        texts.push(block.content.text);
      }
      // Handle content with title/description
      if (block.content.title) {
        texts.push(block.content.title);
      }
      if (block.content.description) {
        texts.push(block.content.description);
      }
      // Handle list items
      if (Array.isArray(block.content.items)) {
        texts.push(...block.content.items.filter((item: any) => typeof item === 'string'));
      }
      // Handle table rows
      if (Array.isArray(block.content.rows)) {
        block.content.rows.forEach((row: any[]) => {
          if (Array.isArray(row)) {
            row.forEach(cell => {
              if (typeof cell === 'string') texts.push(cell);
              else if (cell?.text) texts.push(cell.text);
            });
          }
        });
      }
    }
  }

  // Extract from attributes
  if (block.attributes) {
    if (block.attributes.alt) texts.push(String(block.attributes.alt));
    if (block.attributes.caption) texts.push(String(block.attributes.caption));
    if (block.attributes.label) texts.push(String(block.attributes.label));
  }

  // Handle nested blocks (children or innerBlocks)
  const nestedBlocks = block.children || block.innerBlocks || [];
  if (Array.isArray(nestedBlocks)) {
    nestedBlocks.forEach((child: Block) => {
      const childText = extractTextFromBlock(child);
      if (childText) texts.push(childText);
    });
  }

  return texts.filter(t => t && t.trim()).join(' ');
}

/**
 * Convert Block[] array to plain text for search indexing
 *
 * @param blocks - Array of Block objects
 * @returns Plain text string suitable for full-text search
 */
export function blocksToSearchText(blocks: Block[] | null | undefined): string {
  if (!Array.isArray(blocks) || blocks.length === 0) {
    return '';
  }

  const texts = blocks.map(block => extractTextFromBlock(block));
  return texts
    .filter(text => text && text.trim())
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Build search metadata text from forum post metadata
 * Extracts searchable text from metadata.extensions (cosmetics, yaksa, etc.)
 */
export function metadataToSearchText(metadata: Record<string, any> | null | undefined): string {
  if (!metadata) return '';

  const texts: string[] = [];

  // Extract SEO fields
  if (metadata.seo) {
    if (metadata.seo.title) texts.push(metadata.seo.title);
    if (metadata.seo.description) texts.push(metadata.seo.description);
    if (metadata.seo.keywords && Array.isArray(metadata.seo.keywords)) {
      texts.push(...metadata.seo.keywords);
    }
  }

  // Extract extension metadata
  const extensions = metadata.extensions || {};

  // Cosmetics (neture) extension
  const neture = extensions.neture || metadata.neture;
  if (neture) {
    if (neture.skinType) texts.push(neture.skinType);
    if (neture.concerns && Array.isArray(neture.concerns)) {
      texts.push(...neture.concerns);
    }
    if (neture.routine && Array.isArray(neture.routine)) {
      texts.push(...neture.routine);
    }
    if (neture.ingredientPreferences && Array.isArray(neture.ingredientPreferences)) {
      texts.push(...neture.ingredientPreferences);
    }
  }

  // Yaksa extension
  const yaksa = extensions.yaksa || metadata.yaksa;
  if (yaksa) {
    if (yaksa.communityId) texts.push(yaksa.communityId);
  }

  // Custom fields
  if (metadata.custom) {
    Object.values(metadata.custom).forEach(value => {
      if (typeof value === 'string') texts.push(value);
    });
  }

  return texts.filter(t => t && typeof t === 'string' && t.trim()).join(' ');
}

/**
 * Build combined search text for a forum post
 *
 * @param post - Forum post object with title, content, tags, metadata
 * @returns Combined text for search indexing
 */
export function buildPostSearchText(post: {
  title?: string;
  content?: Block[];
  excerpt?: string;
  tags?: string[];
  metadata?: Record<string, any>;
}): string {
  const parts: string[] = [];

  // Title (high priority - will be weighted separately)
  if (post.title) {
    parts.push(post.title);
  }

  // Excerpt
  if (post.excerpt) {
    parts.push(post.excerpt);
  }

  // Tags
  if (post.tags && Array.isArray(post.tags)) {
    parts.push(post.tags.join(' '));
  }

  // Content (Block[] to text)
  if (post.content) {
    const contentText = blocksToSearchText(post.content);
    if (contentText) parts.push(contentText);
  }

  // Metadata
  if (post.metadata) {
    const metaText = metadataToSearchText(post.metadata);
    if (metaText) parts.push(metaText);
  }

  return parts.filter(p => p && p.trim()).join(' ');
}

/**
 * Escape special characters for PostgreSQL tsquery
 */
export function escapeSearchQuery(query: string): string {
  if (!query) return '';

  return query
    .replace(/[&|!():*<>]/g, ' ')
    .replace(/'/g, "''")
    .trim();
}

/**
 * Convert search query to PostgreSQL tsquery format
 * Supports AND, OR operators and prefix matching
 */
export function buildTsQuery(query: string): string {
  if (!query || !query.trim()) return '';

  const escaped = escapeSearchQuery(query);
  const words = escaped.split(/\s+/).filter(w => w.length > 0);

  if (words.length === 0) return '';

  // Support prefix matching with :*
  return words.map(word => `${word}:*`).join(' & ');
}

/**
 * Korean text tokenization helper
 * PostgreSQL 'simple' config works better for Korean than 'english'
 */
export function getSearchConfig(): string {
  return 'simple';
}

export default {
  blocksToSearchText,
  metadataToSearchText,
  buildPostSearchText,
  escapeSearchQuery,
  buildTsQuery,
  getSearchConfig,
};

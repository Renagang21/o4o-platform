/**
 * Block Parser Utilities
 * Parse and transform block data from various formats
 */

import { Block, WordPressBlock } from '../types/block.types';

/**
 * Extract text content from a block
 */
export function extractTextContent(block: Block | WordPressBlock): string {
  const blockData = (block as any).data || (block as any).attributes;

  // Check data.content first
  if (blockData?.content) {
    return blockData.content;
  }

  // Check attributes.content
  if ('attributes' in block && block.attributes?.content) {
    return block.attributes.content;
  }

  // Check data.text
  if (blockData?.text) {
    return blockData.text;
  }

  // Check innerHTML
  if ('innerHTML' in block && block.innerHTML) {
    return block.innerHTML;
  }

  // Check innerContent array
  if ('innerContent' in block && Array.isArray(block.innerContent)) {
    return block.innerContent
      .filter((content): content is string => typeof content === 'string')
      .join('');
  }

  return '';
}

/**
 * Normalize block structure
 * Ensures block has consistent structure regardless of source
 */
export function normalizeBlock(block: any): Block {
  return {
    id: block.id || block.clientId,
    type: block.type || block.name,
    data: block.data || block.attributes || {},
    attributes: block.attributes,
    content: block.content,
    innerBlocks: block.innerBlocks?.map(normalizeBlock) || [],
  };
}

/**
 * Parse blocks from string or object
 */
export function parseBlocks(content: any): Block[] {
  // Already an array of blocks
  if (Array.isArray(content)) {
    return content.map(normalizeBlock);
  }

  // Single block object
  if (content && typeof content === 'object' && (content.type || content.name)) {
    return [normalizeBlock(content)];
  }

  // JSON string
  if (typeof content === 'string') {
    try {
      const parsed = JSON.parse(content);
      return parseBlocks(parsed);
    } catch (e) {
      console.error('[BlockParser] Failed to parse content:', e);
      return [];
    }
  }

  return [];
}

/**
 * Get block data with fallbacks
 */
export function getBlockData(block: Block, key: string, fallback?: any): any {
  return block.data?.[key] || block.attributes?.[key] || fallback;
}

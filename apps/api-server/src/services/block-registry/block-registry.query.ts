/**
 * Block Registry — Query & search operations
 *
 * WO-O4O-BLOCK-REGISTRY-SERVICE-SPLIT-V1
 * Extracted from block-registry.service.ts
 */

import type {
  BlockInfo,
  BlockCategory,
  BlockAIReference,
  BlockRegistryResponse,
} from '../../types/block.types.js';
import { AppDataSource } from '../../database/connection.js';
import { AIReference } from '../../entities/AIReference.js';
import logger from '../../utils/logger.js';

/**
 * AI를 위한 포맷된 참조 데이터 생성 (V2: Database-driven)
 *
 * Tries to load from database first, falls back to built-in blocks
 */
export async function getAIReference(
  blocks: Map<string, BlockInfo>,
  categories: Map<string, BlockCategory>,
  schemaVersion: string,
  lastUpdated: Date
): Promise<BlockRegistryResponse> {
  try {
    // Try to load from database
    if (AppDataSource.isInitialized) {
      const repository = AppDataSource.getRepository(AIReference);
      const dbReference = await repository.findOne({
        where: { type: 'blocks', status: 'active' },
        order: { updatedAt: 'DESC' }
      });

      if (dbReference && dbReference.content) {
        logger.info('✅ Block reference loaded from database');

        // Return markdown reference directly for AI consumption
        return {
          total: 0, // Not applicable for markdown format
          categories: Array.from(categories.values()).sort((a, b) => a.priority - b.priority),
          blocks: [], // Not applicable for markdown format
          schemaVersion: dbReference.schemaVersion || schemaVersion,
          lastUpdated: dbReference.updatedAt.toISOString(),
          // NEW: Include raw markdown content for AI
          markdownContent: dbReference.content,
          format: 'markdown',
          version: dbReference.version || '1.0.0'
        };
      }
    }
  } catch (error) {
    logger.warn('⚠️  Failed to load blocks from database, using built-in fallback:', error);
  }

  // Fallback to built-in blocks
  logger.info('Using built-in block registry (fallback)');
  const allBlocks = Array.from(blocks.values());
  const sortedCategories = Array.from(categories.values())
    .sort((a, b) => a.priority - b.priority);

  const aiBlocks: BlockAIReference[] = allBlocks.map(block => ({
    name: block.name,
    title: block.title,
    description: block.description,
    category: block.category,
    attributes: block.attributes,
    example: block.example,
    version: block.version,
    tags: block.tags,
    aiPrompts: block.aiPrompts || [],
    deprecated: block.deprecated,
    replacedBy: block.replacedBy
  }));

  return {
    total: allBlocks.length,
    categories: sortedCategories,
    blocks: aiBlocks,
    schemaVersion,
    lastUpdated: lastUpdated.toISOString(),
    format: 'structured'
  };
}

/**
 * 검색
 */
export function searchBlocks(blocks: Map<string, BlockInfo>, query: string): BlockInfo[] {
  const lowercaseQuery = query.toLowerCase();
  return Array.from(blocks.values()).filter(block =>
    block.name.toLowerCase().includes(lowercaseQuery) ||
    block.title.toLowerCase().includes(lowercaseQuery) ||
    block.description.toLowerCase().includes(lowercaseQuery) ||
    block.tags.some(tag => tag.toLowerCase().includes(lowercaseQuery)) ||
    block.aiPrompts?.some(prompt => prompt.toLowerCase().includes(lowercaseQuery))
  );
}

/**
 * 통계 정보
 */
export function getBlockStats(
  blocks: Map<string, BlockInfo>,
  categories: Map<string, BlockCategory>,
  schemaVersion: string,
  lastUpdated: Date
) {
  const allBlocks = Array.from(blocks.values());
  const categoryStats = Array.from(categories.keys()).map(categoryName => ({
    category: categoryName,
    count: allBlocks.filter(block => block.category === categoryName).length
  }));

  return {
    total: allBlocks.length,
    categories: categories.size,
    categoryStats,
    schemaVersion,
    lastUpdated: lastUpdated.toISOString()
  };
}

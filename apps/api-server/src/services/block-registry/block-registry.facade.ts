/**
 * Block Registry — Facade (class + singleton)
 *
 * WO-O4O-BLOCK-REGISTRY-SERVICE-SPLIT-V1
 * Preserves original BlockRegistryService public API.
 */

import type {
  BlockInfo,
  BlockCategory,
  BlockRegistryResponse,
} from '../../types/block.types.js';
import logger from '../../utils/logger.js';
import {
  getDefaultCategories,
  metadataToInfo,
  blockMetadata,
} from './block-registry.categories.js';
import {
  registerDeprecatedBlocks,
} from './block-registry.deprecated-blocks.js';
import {
  getAIReference,
  searchBlocks,
  getBlockStats,
} from './block-registry.query.js';

/**
 * Block Registry Service
 * AI 페이지 생성을 위한 블록 관리 시스템 (SSOT)
 *
 * V3 (Phase P0-C): Uses @o4o/block-renderer metadata as SSOT
 * - Reads from ai_references table (type='blocks')
 * - Fallback to metadata from @o4o/block-renderer package
 * - Returns markdown reference directly to AI
 */
class BlockRegistryService {
  private static instance: BlockRegistryService;
  private blocks: Map<string, BlockInfo> = new Map();
  private categories: Map<string, BlockCategory> = new Map();
  private lastUpdated: Date = new Date();
  private schemaVersion = '1.0.0';

  private constructor() {
    this.initializeDefaultCategories();
    this.registerBuiltinBlocks();
  }

  static getInstance(): BlockRegistryService {
    if (!BlockRegistryService.instance) {
      BlockRegistryService.instance = new BlockRegistryService();
    }
    return BlockRegistryService.instance;
  }

  /**
   * 기본 카테고리 초기화
   */
  private initializeDefaultCategories() {
    const defaultCategories = getDefaultCategories();
    defaultCategories.forEach(category => {
      this.categories.set(category.name, category);
    });
  }

  /**
   * Phase P0-C: Register blocks from @o4o/block-renderer metadata (SSOT)
   */
  private registerBuiltinBlocks() {
    // Load from @o4o/block-renderer metadata package
    for (const meta of blockMetadata) {
      const info = metadataToInfo(meta);
      this.register(meta.name, info);
    }

    logger.info(`✅ ${this.blocks.size} blocks registered from @o4o/block-renderer metadata (o4o/* naming)`);
  }

  /**
   * DEPRECATED: Old hardcoded registration (kept for reference)
   * Phase P0-C: This method is no longer used
   */
  private registerBuiltinBlocks_DEPRECATED() {
    registerDeprecatedBlocks((name, info) => this.register(name, info));
    logger.info(`✅ ${this.blocks.size} blocks registered successfully (o4o/* naming)`);
  }

  /**
   * 블록 등록
   */
  public register(name: string, info: BlockInfo): void {
    this.blocks.set(name, info);
    this.lastUpdated = new Date();

    logger.info(`📦 Block registered: ${name} in category "${info.category}"`);
  }

  /**
   * 블록 제거
   */
  public unregister(name: string): boolean {
    const removed = this.blocks.delete(name);
    if (removed) {
      this.lastUpdated = new Date();
      logger.info(`🗑️ Block unregistered: ${name}`);
    }
    return removed;
  }

  /**
   * 모든 블록 조회
   */
  public getAll(): BlockInfo[] {
    return Array.from(this.blocks.values());
  }

  /**
   * 카테고리별 블록 조회
   */
  public getByCategory(categoryName: string): BlockInfo[] {
    return this.getAll().filter(block => block.category === categoryName);
  }

  /**
   * 단일 블록 조회
   */
  public get(name: string): BlockInfo | undefined {
    return this.blocks.get(name);
  }

  /**
   * AI를 위한 포맷된 참조 데이터 생성 (V2: Database-driven)
   */
  public async getAIReference(): Promise<BlockRegistryResponse> {
    return getAIReference(this.blocks, this.categories, this.schemaVersion, this.lastUpdated);
  }

  /**
   * 검색
   */
  public search(query: string): BlockInfo[] {
    return searchBlocks(this.blocks, query);
  }

  /**
   * 통계 정보
   */
  public getStats() {
    return getBlockStats(this.blocks, this.categories, this.schemaVersion, this.lastUpdated);
  }
}

export const blockRegistry = BlockRegistryService.getInstance();

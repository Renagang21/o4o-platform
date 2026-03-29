/**
 * CategoryMappingService
 *
 * keyword → category 자동 추천 서비스
 * - in-memory 캐시 (5분 TTL)
 * - priority 기반 매칭 (동일 priority면 긴 keyword 우선)
 *
 * WO-NETURE-CATEGORY-MAPPING-RULE-SYSTEM-V1
 */

import { Repository } from 'typeorm';
import { CategoryMappingRule } from '../entities/CategoryMappingRule.entity.js';
import { AppDataSource } from '../../../database/connection.js';
import logger from '../../../utils/logger.js';

interface CachedRule {
  keyword: string;
  categoryId: string;
  categoryName: string;
  priority: number;
}

export interface CategorySuggestion {
  categoryId: string | null;
  categoryName: string | null;
  matchedKeyword: string | null;
  confidence: 'high' | 'low' | 'none';
}

const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

export class CategoryMappingService {
  private _ruleRepo?: Repository<CategoryMappingRule>;
  private get ruleRepo(): Repository<CategoryMappingRule> {
    if (!this._ruleRepo) {
      this._ruleRepo = AppDataSource.getRepository(CategoryMappingRule);
    }
    return this._ruleRepo;
  }

  // ── Cache ──
  private static cachedRules: CachedRule[] | null = null;
  private static cacheExpiry = 0;

  private async loadRules(): Promise<CachedRule[]> {
    const now = Date.now();
    if (CategoryMappingService.cachedRules && now < CategoryMappingService.cacheExpiry) {
      return CategoryMappingService.cachedRules;
    }

    const rows: Array<{ keyword: string; category_id: string; category_name: string; priority: number }> =
      await AppDataSource.query(`
        SELECT r.keyword, r.category_id, c.name AS category_name, r.priority
        FROM category_mapping_rules r
        JOIN product_categories c ON c.id = r.category_id
        WHERE r.is_active = true
        ORDER BY r.priority DESC
      `);

    CategoryMappingService.cachedRules = rows.map((r) => ({
      keyword: r.keyword.toLowerCase(),
      categoryId: r.category_id,
      categoryName: r.category_name,
      priority: r.priority,
    }));
    CategoryMappingService.cacheExpiry = now + CACHE_TTL_MS;

    return CategoryMappingService.cachedRules;
  }

  private invalidateCache(): void {
    CategoryMappingService.cachedRules = null;
    CategoryMappingService.cacheExpiry = 0;
  }

  // ── Suggestion ──

  async suggestCategory(productName: string): Promise<CategorySuggestion> {
    try {
      const rules = await this.loadRules();
      const nameLower = productName.toLowerCase();

      let best: CachedRule | null = null;

      for (const rule of rules) {
        if (!nameLower.includes(rule.keyword)) continue;

        if (
          !best ||
          rule.priority > best.priority ||
          (rule.priority === best.priority && rule.keyword.length > best.keyword.length)
        ) {
          best = rule;
        }
      }

      if (!best) {
        return { categoryId: null, categoryName: null, matchedKeyword: null, confidence: 'none' };
      }

      return {
        categoryId: best.categoryId,
        categoryName: best.categoryName,
        matchedKeyword: best.keyword,
        confidence: best.priority >= 8 ? 'high' : 'low',
      };
    } catch (error) {
      logger.warn('[CategoryMapping] suggestCategory failed:', error);
      return { categoryId: null, categoryName: null, matchedKeyword: null, confidence: 'none' };
    }
  }

  // ── CRUD ──

  async listRules(): Promise<CategoryMappingRule[]> {
    return this.ruleRepo.find({
      relations: ['category'],
      order: { priority: 'DESC', keyword: 'ASC' },
    });
  }

  async createRule(data: {
    keyword: string;
    categoryId: string;
    priority?: number;
  }): Promise<CategoryMappingRule> {
    const keyword = data.keyword.trim().toLowerCase();
    if (!keyword) throw new Error('KEYWORD_REQUIRED');

    const rule = this.ruleRepo.create({
      keyword,
      categoryId: data.categoryId,
      priority: data.priority ?? 0,
      isActive: true,
    });

    const saved = await this.ruleRepo.save(rule);
    this.invalidateCache();
    return saved;
  }

  async updateRule(
    id: string,
    data: Partial<{ keyword: string; categoryId: string; priority: number; isActive: boolean }>,
  ): Promise<CategoryMappingRule> {
    const rule = await this.ruleRepo.findOne({ where: { id } });
    if (!rule) throw new Error('RULE_NOT_FOUND');

    if (data.keyword !== undefined) rule.keyword = data.keyword.trim().toLowerCase();
    if (data.categoryId !== undefined) rule.categoryId = data.categoryId;
    if (data.priority !== undefined) rule.priority = data.priority;
    if (data.isActive !== undefined) rule.isActive = data.isActive;

    const saved = await this.ruleRepo.save(rule);
    this.invalidateCache();
    return saved;
  }

  async deleteRule(id: string): Promise<void> {
    const result = await this.ruleRepo.delete(id);
    if (result.affected === 0) throw new Error('RULE_NOT_FOUND');
    this.invalidateCache();
  }
}

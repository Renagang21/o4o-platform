import type { DataSource, Repository } from 'typeorm';
import { execute } from '@o4o/ai-core';
import { PRODUCT_TAGGING_SYSTEM } from '@o4o/ai-prompts/store';
import { ProductAiTag } from '../entities/product-ai-tag.entity.js';
import { ProductMaster } from '../../neture/entities/ProductMaster.entity.js';
import { buildConfigResolver } from '../../../utils/ai-config-resolver.js';

/**
 * ProductAiTaggingService — WO-O4O-PRODUCT-AI-TAGGING-V1
 *
 * 상품 마스터 정보를 기반으로 LLM이 검색용 태그를 자동 생성.
 *
 * 핵심 원칙:
 * - LLM = 태그 추천 (자동 상품 변경 금지)
 * - fire-and-forget: 실패해도 상품 데이터에 영향 없음
 * - product_ai_tags 저장 + product_masters.tags 동기화
 * - execute() 내부 retry (2회, 2초 delay)
 */

interface LlmTagResponse {
  tags: Array<{ tag: string; confidence: number }>;
}

export interface ProductTagInput {
  id: string;
  regulatoryName: string;
  marketingName: string;
  specification?: string | null;
  categoryName?: string | null;
  brandName?: string | null;
  manufacturerName: string;
  /** WO-NETURE-SUPPLIER-TAG-AI-B2C-ALIGNMENT-V1: B2C 소비자 상세 설명 */
  consumerDetailDescription?: string | null;
  /** V2: 규제 유형 (DRUG, HEALTH_FUNCTIONAL, etc.) */
  regulatoryType?: string | null;
  /** V2: B2C 소비자 간단 소개 */
  consumerShortDescription?: string | null;
  /** 기존 태그 목록 (중복 방지용) */
  existingTags?: string[];
}

export class ProductAiTaggingService {
  private tagRepo: Repository<ProductAiTag>;
  private masterRepo: Repository<ProductMaster>;
  private configResolver: () => Promise<import('@o4o/ai-core').AIProviderConfig>;

  constructor(private dataSource: DataSource) {
    this.tagRepo = dataSource.getRepository(ProductAiTag);
    this.masterRepo = dataSource.getRepository(ProductMaster);
    this.configResolver = buildConfigResolver(dataSource, 'store', { maxTokens: 1024 });
  }

  /**
   * Fire-and-forget: generate AI tags for a product and sync to product_masters.tags.
   */
  async generateTags(product: ProductTagInput): Promise<void> {
    try {
      const userPrompt = this.buildUserPrompt(product);

      const result = await execute({
        systemPrompt: PRODUCT_TAGGING_SYSTEM,
        userPrompt,
        config: this.configResolver,
        meta: { service: 'store', callerName: 'ProductAiTaggingService' },
      });
      const parsed = JSON.parse(result.content) as LlmTagResponse;

      if (!parsed.tags || !Array.isArray(parsed.tags) || parsed.tags.length === 0) {
        console.error('[ProductAiTag] Invalid LLM response: missing tags', {
          productId: product.id,
          content: result.content.slice(0, 200),
        });
        return;
      }

      // 기존 AI 태그 삭제
      await this.tagRepo.delete({ productId: product.id, source: 'ai' });

      // 새 AI 태그 저장
      const newTags = parsed.tags.slice(0, 8).map((t) =>
        this.tagRepo.create({
          productId: product.id,
          tag: t.tag,
          confidence: Math.min(1, Math.max(0, t.confidence)),
          source: 'ai',
          model: result.model,
        }),
      );
      await this.tagRepo.save(newTags);

      // product_masters.tags 동기화
      await this.syncMasterTags(product.id);
    } catch (error) {
      // Quiet fail: LLM 실패가 상품 데이터에 영향 없음
      console.error('[ProductAiTag] unexpected error:', error);
    }
  }

  /**
   * WO-NETURE-SUPPLIER-TAG-AI-B2C-ALIGNMENT-V1
   * Non-destructive: LLM에서 태그 추천만 받고, DB에 저장하지 않음.
   * 기존 태그와 중복되지 않는 새 태그만 반환.
   */
  async suggestTags(product: ProductTagInput): Promise<Array<{ tag: string; confidence: number }>> {
    try {
      const userPrompt = this.buildUserPrompt(product);

      const result = await execute({
        systemPrompt: PRODUCT_TAGGING_SYSTEM,
        userPrompt,
        config: this.configResolver,
        meta: { service: 'store', callerName: 'ProductAiTaggingService.suggestTags' },
      });
      const parsed = JSON.parse(result.content) as LlmTagResponse;

      if (!parsed.tags || !Array.isArray(parsed.tags) || parsed.tags.length === 0) {
        return [];
      }

      // Filter out existing tags
      const existingSet = new Set((product.existingTags || []).map((t) => t.toLowerCase()));
      return parsed.tags
        .slice(0, 8)
        .filter((t) => !existingSet.has(t.tag.toLowerCase()))
        .map((t) => ({
          tag: t.tag,
          confidence: Math.min(1, Math.max(0, t.confidence)),
        }));
    } catch (error) {
      console.error('[ProductAiTag] suggestTags error:', error);
      return [];
    }
  }

  /**
   * Get all tags for a product, split by source.
   */
  async getTagsByProduct(productId: string): Promise<{ aiTags: ProductAiTag[]; manualTags: ProductAiTag[] }> {
    const all = await this.tagRepo.find({
      where: { productId },
      order: { confidence: 'DESC', createdAt: 'DESC' },
    });

    return {
      aiTags: all.filter((t) => t.source === 'ai'),
      manualTags: all.filter((t) => t.source === 'manual'),
    };
  }

  /**
   * Add a manual tag. V2: case-insensitive dedup.
   */
  async addManualTag(productId: string, tag: string): Promise<ProductAiTag> {
    const trimmed = tag.trim();

    // V2: dedup — prevent duplicate tags (case-insensitive)
    const existing = await this.tagRepo
      .createQueryBuilder('t')
      .where('t.productId = :productId', { productId })
      .andWhere('LOWER(t.tag) = LOWER(:tag)', { tag: trimmed })
      .getOne();
    if (existing) return existing;

    const newTag = this.tagRepo.create({
      productId,
      tag: trimmed,
      confidence: 1.0,
      source: 'manual',
      model: null,
    });
    const saved = await this.tagRepo.save(newTag);
    await this.syncMasterTags(productId);
    return saved;
  }

  /**
   * V2: Batch add multiple manual tags (for AI suggestion multi-select).
   * Deduplicates against existing tags, single syncMasterTags call.
   */
  async addManualTagsBatch(productId: string, tags: string[]): Promise<ProductAiTag[]> {
    if (!tags.length) return [];

    const existing = await this.tagRepo.find({ where: { productId } });
    const existingSet = new Set(existing.map((t) => t.tag.toLowerCase()));

    const newTags: ProductAiTag[] = [];
    for (const tag of tags) {
      const trimmed = tag.trim();
      if (!trimmed || existingSet.has(trimmed.toLowerCase())) continue;
      newTags.push(
        this.tagRepo.create({
          productId,
          tag: trimmed,
          confidence: 1.0,
          source: 'manual',
          model: null,
        }),
      );
      existingSet.add(trimmed.toLowerCase());
    }

    if (newTags.length === 0) return [];
    const saved = await this.tagRepo.save(newTags);
    await this.syncMasterTags(productId);
    return saved;
  }

  /**
   * Delete a tag by ID.
   */
  async deleteTag(tagId: string, productId: string): Promise<void> {
    await this.tagRepo.delete({ id: tagId, productId });
    await this.syncMasterTags(productId);
  }

  /**
   * Sync product_ai_tags → product_masters.tags (AI high-confidence + manual).
   */
  private async syncMasterTags(productId: string): Promise<void> {
    try {
      const allTags = await this.tagRepo.find({ where: { productId } });
      const aiTags = allTags
        .filter((t) => t.source === 'ai' && Number(t.confidence) >= 0.7)
        .map((t) => t.tag);
      const manualTags = allTags
        .filter((t) => t.source === 'manual')
        .map((t) => t.tag);

      const merged = [...new Set([...aiTags, ...manualTags])];

      await this.masterRepo.update(productId, { tags: merged });
    } catch (err) {
      console.error('[ProductAiTag] Failed to sync master tags:', err);
    }
  }

  private buildUserPrompt(product: ProductTagInput): string {
    const parts: string[] = [];

    // WO-NETURE-SUPPLIER-TAG-AI-B2C-ALIGNMENT-V1: B2C 설명 최우선
    if (product.consumerDetailDescription) {
      parts.push(`[소비자 상세 설명]`);
      parts.push(product.consumerDetailDescription);
      parts.push('');
    }

    // V2: B2C 간단 소개 (보조)
    if (product.consumerShortDescription) {
      parts.push(`[소비자 간단 소개]`);
      parts.push(product.consumerShortDescription);
      parts.push('');
    }

    parts.push(`[상품 정보]`);
    parts.push(`- 식약처명: ${product.regulatoryName}`);
    parts.push(`- 마케팅명: ${product.marketingName}`);
    if (product.specification) parts.push(`- 규격: ${product.specification}`);
    if (product.categoryName) parts.push(`- 카테고리: ${product.categoryName}`);
    if (product.brandName) parts.push(`- 브랜드: ${product.brandName}`);
    parts.push(`- 제조사: ${product.manufacturerName}`);
    // V2: 규제 유형 (건강기능식품, 의약품, 의약외품 등)
    if (product.regulatoryType && product.regulatoryType !== 'GENERAL') {
      parts.push(`- 규제 유형: ${product.regulatoryType}`);
    }

    if (product.existingTags?.length) {
      parts.push('');
      parts.push(`[기존 태그 (중복 제외)]`);
      parts.push(product.existingTags.join(', '));
    }

    return parts.join('\n');
  }
}

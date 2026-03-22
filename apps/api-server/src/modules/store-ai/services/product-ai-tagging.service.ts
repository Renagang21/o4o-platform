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
   * Add a manual tag.
   */
  async addManualTag(productId: string, tag: string): Promise<ProductAiTag> {
    const newTag = this.tagRepo.create({
      productId,
      tag,
      confidence: 1.0,
      source: 'manual',
      model: null,
    });
    const saved = await this.tagRepo.save(newTag);
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
    parts.push(`[상품 정보]`);
    parts.push(`- 식약처명: ${product.regulatoryName}`);
    parts.push(`- 마케팅명: ${product.marketingName}`);
    if (product.specification) parts.push(`- 규격: ${product.specification}`);
    if (product.categoryName) parts.push(`- 카테고리: ${product.categoryName}`);
    if (product.brandName) parts.push(`- 브랜드: ${product.brandName}`);
    parts.push(`- 제조사: ${product.manufacturerName}`);
    return parts.join('\n');
  }
}

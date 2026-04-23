import type { DataSource, Repository } from 'typeorm';
import { PRODUCT_CONTENT_PROMPTS } from '@o4o/ai-prompts/store';
import type { ProductContentInput } from '@o4o/ai-prompts/store';
import { ProductAiContent } from '../entities/product-ai-content.entity.js';
import type { ProductAiContentType } from '../entities/product-ai-content.entity.js';
import { createPolicyExecutor } from '../../ai-policy/ai-policy-factory.js';
import type { AiPolicyExecutorService } from '../../ai-policy/ai-policy-executor.service.js';

/**
 * ProductAiContentService — WO-O4O-PRODUCT-AI-CONTENT-PIPELINE-V1
 *
 * Product Master + AI Tags + OCR Text 기반 AI 콘텐츠 생성.
 * content_type별 전용 프롬프트로 LLM 호출 → product_ai_contents 저장.
 *
 * 핵심 원칙:
 * - fire-and-forget: 실패해도 상품 데이터에 영향 없음
 * - retry: AiPolicyExecutorService 정책 위임 (PRODUCT_CONTENT scope, fallback retryMax: 2)
 * - OCR 텍스트가 있으면 프롬프트에 포함하여 더 정확한 콘텐츠 생성
 */

// Re-export ProductContentInput for backward compatibility
export type { ProductContentInput } from '@o4o/ai-prompts/store';

interface LlmContentResponse {
  content: string;
}

export class ProductAiContentService {
  private contentRepo: Repository<ProductAiContent>;
  private aiPolicyExecutor: AiPolicyExecutorService;

  constructor(private dataSource: DataSource) {
    this.contentRepo = dataSource.getRepository(ProductAiContent);
    this.aiPolicyExecutor = createPolicyExecutor(dataSource);
  }

  /**
   * 특정 content_type의 AI 콘텐츠 생성 (fire-and-forget).
   */
  async generateContent(
    product: ProductContentInput,
    contentType: ProductAiContentType,
  ): Promise<ProductAiContent | null> {
    try {
      const prompt = PRODUCT_CONTENT_PROMPTS[contentType];
      if (!prompt) {
        console.error(`[ProductAiContent] Unknown content type: ${contentType}`);
        return null;
      }

      const userPrompt = prompt.user(product);

      // LLM 호출: AiPolicyExecutorService가 retry / key 해석 / usage logging 담당
      const result = await this.aiPolicyExecutor.execute('PRODUCT_CONTENT', prompt.system, userPrompt);

      const parsed = JSON.parse(result.content) as LlmContentResponse;
      if (!parsed.content || typeof parsed.content !== 'string') {
        console.error('[ProductAiContent] Invalid LLM response: missing content', {
          productId: product.id,
          contentType,
          raw: result.content.slice(0, 200),
        });
        return null;
      }

      // upsert: 같은 product + content_type이면 교체
      const existing = await this.contentRepo.findOne({
        where: { productId: product.id, contentType },
      });

      if (existing) {
        existing.content = parsed.content;
        existing.model = result.model;
        return await this.contentRepo.save(existing);
      }

      const entity = this.contentRepo.create({
        productId: product.id,
        contentType,
        content: parsed.content,
        model: result.model,
      });
      return await this.contentRepo.save(entity);
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      console.error('[ProductAiContent] generation failed:', {
        productId: product.id,
        contentType,
        error: msg,
      });
      return null;
    }
  }

  /**
   * 모든 content_type의 AI 콘텐츠를 일괄 생성.
   */
  async generateAllContents(product: ProductContentInput): Promise<ProductAiContent[]> {
    const types: ProductAiContentType[] = [
      'product_description',
      'pop_short',
      'pop_long',
      'qr_description',
      'signage_text',
    ];

    const results: ProductAiContent[] = [];
    for (const contentType of types) {
      const result = await this.generateContent(product, contentType);
      if (result) results.push(result);
    }
    return results;
  }

  /**
   * 특정 상품의 모든 AI 콘텐츠 조회.
   */
  async getContentsByProduct(productId: string): Promise<ProductAiContent[]> {
    return this.contentRepo.find({
      where: { productId },
      order: { contentType: 'ASC', updatedAt: 'DESC' },
    });
  }

  /**
   * 특정 상품 + content_type 조회.
   */
  async getContent(productId: string, contentType: ProductAiContentType): Promise<ProductAiContent | null> {
    return this.contentRepo.findOne({
      where: { productId, contentType },
    });
  }

  /**
   * AI 콘텐츠 삭제.
   */
  async deleteContent(id: string, productId: string): Promise<void> {
    await this.contentRepo.delete({ id, productId });
  }

}

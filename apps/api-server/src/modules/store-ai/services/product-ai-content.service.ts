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

      // upsert: 같은 product + content_type이면 교체 (전역 단일 행 계약)
      return await this.upsertContent(product.id, contentType, parsed.content, result.model);
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
   * AI 콘텐츠 수동 저장 (upsert) — WO-O4O-AI-CONTENT-AUTO-CHANNEL-SAVE-V1
   *
   * AiContentModal 등 외부에서 생성한 콘텐츠를 product_ai_contents에 저장.
   */
  async saveContent(
    productId: string,
    contentType: ProductAiContentType,
    content: string,
    model?: string,
  ): Promise<ProductAiContent> {
    return this.upsertContent(productId, contentType, content, model ?? null);
  }

  /**
   * (product_id, content_type) 전역 단일 행 upsert.
   *
   * WO-O4O-PRODUCT-AI-CONTENT-GLOBAL-CONTRACT-AND-ACCESS-FIX-V1 §13:
   *   UNIQUE(product_id, content_type) 적용 후, find→insert 사이의 동시 요청은 23505 를 유발한다.
   *   경합에서 진 쪽은 상대가 만든 행을 다시 읽어 update 로 수렴시킨다 (최신 1개 계약 유지).
   */
  private async upsertContent(
    productId: string,
    contentType: ProductAiContentType,
    content: string,
    model: string | null,
  ): Promise<ProductAiContent> {
    const apply = (row: ProductAiContent) => {
      row.content = content;
      if (model) row.model = model;
      return this.contentRepo.save(row);
    };

    const existing = await this.contentRepo.findOne({ where: { productId, contentType } });
    if (existing) return await apply(existing);

    try {
      return await this.contentRepo.save(
        this.contentRepo.create({ productId, contentType, content, model }),
      );
    } catch (error) {
      const code = (error as { code?: string })?.code;
      if (code !== '23505') throw error;
      const winner = await this.contentRepo.findOne({ where: { productId, contentType } });
      if (!winner) throw error;
      return await apply(winner);
    }
  }

  /**
   * AI 콘텐츠 삭제.
   */
  async deleteContent(id: string, productId: string): Promise<void> {
    await this.contentRepo.delete({ id, productId });
  }

}

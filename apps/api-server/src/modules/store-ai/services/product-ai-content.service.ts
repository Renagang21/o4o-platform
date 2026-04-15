import type { DataSource, Repository } from 'typeorm';
import { GeminiProvider } from '@o4o/ai-core';
import type { AIProviderConfig } from '@o4o/ai-core';
import { PRODUCT_CONTENT_PROMPTS } from '@o4o/ai-prompts/store';
import type { ProductContentInput } from '@o4o/ai-prompts/store';
import { ProductAiContent } from '../entities/product-ai-content.entity.js';
import type { ProductAiContentType } from '../entities/product-ai-content.entity.js';
// AiModelSetting removed — WO-O4O-GLYCOPHARM-CARE-REMOVAL-V1

/**
 * ProductAiContentService — WO-O4O-PRODUCT-AI-CONTENT-PIPELINE-V1
 *
 * Product Master + AI Tags + OCR Text 기반 AI 콘텐츠 생성.
 * content_type별 전용 프롬프트로 LLM 호출 → product_ai_contents 저장.
 *
 * 핵심 원칙:
 * - fire-and-forget: 실패해도 상품 데이터에 영향 없음
 * - 1회 retry (2초 delay) — Store AI 패턴
 * - Gemini 3.0 Flash primary, 환경변수/DB에서 API key 조회
 * - OCR 텍스트가 있으면 프롬프트에 포함하여 더 정확한 콘텐츠 생성
 */

const RETRY_DELAY_MS = 2_000;
const MAX_ATTEMPTS = 2;

// Re-export ProductContentInput for backward compatibility
export type { ProductContentInput } from '@o4o/ai-prompts/store';

interface LlmContentResponse {
  content: string;
}

export class ProductAiContentService {
  private contentRepo: Repository<ProductAiContent>;
  private gemini: GeminiProvider;

  constructor(private dataSource: DataSource) {
    this.contentRepo = dataSource.getRepository(ProductAiContent);
    this.gemini = new GeminiProvider();
  }

  /**
   * 특정 content_type의 AI 콘텐츠 생성 (fire-and-forget).
   */
  async generateContent(
    product: ProductContentInput,
    contentType: ProductAiContentType,
  ): Promise<ProductAiContent | null> {
    try {
      const config = await this.buildProviderConfig();
      if (!config.apiKey) {
        console.warn('[ProductAiContent] No API key configured, skipping');
        return null;
      }

      const prompt = PRODUCT_CONTENT_PROMPTS[contentType];
      if (!prompt) {
        console.error(`[ProductAiContent] Unknown content type: ${contentType}`);
        return null;
      }

      const userPrompt = prompt.user(product);

      let lastError: unknown = null;
      for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
        try {
          const response = await this.gemini.complete(prompt.system, userPrompt, config);
          const parsed = JSON.parse(response.content) as LlmContentResponse;

          if (!parsed.content || typeof parsed.content !== 'string') {
            console.error('[ProductAiContent] Invalid LLM response: missing content', {
              productId: product.id,
              contentType,
              raw: response.content.slice(0, 200),
            });
            return null;
          }

          // upsert: 같은 product + content_type이면 교체
          const existing = await this.contentRepo.findOne({
            where: { productId: product.id, contentType },
          });

          if (existing) {
            existing.content = parsed.content;
            existing.model = response.model;
            return await this.contentRepo.save(existing);
          }

          const entity = this.contentRepo.create({
            productId: product.id,
            contentType,
            content: parsed.content,
            model: response.model,
          });
          return await this.contentRepo.save(entity);
        } catch (err) {
          lastError = err;
          const msg = err instanceof Error ? err.message : String(err);

          if (msg.includes('not configured') || msg.includes('INVALID_ARGUMENT')) {
            console.error('[ProductAiContent] non-retryable error:', { productId: product.id, error: msg });
            return null;
          }

          if (attempt < MAX_ATTEMPTS) {
            console.warn(`[ProductAiContent] attempt ${attempt} failed, retrying in ${RETRY_DELAY_MS}ms:`, msg);
            await new Promise((r) => setTimeout(r, RETRY_DELAY_MS));
          }
        }
      }

      const errMsg = lastError instanceof Error ? lastError.message : String(lastError);
      console.error('[ProductAiContent] generation failed after all attempts:', {
        productId: product.id,
        contentType,
        lastError: errMsg,
      });
      return null;
    } catch (error) {
      console.error('[ProductAiContent] unexpected error:', error);
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

  private async buildProviderConfig(): Promise<AIProviderConfig> {
    const model = 'gemini-3.0-flash';
    const temperature = 0.3;
    const maxTokens = 2048;

    let apiKey = '';
    try {
      const rows = await this.dataSource.query(
        `SELECT apikey FROM ai_settings WHERE provider = 'gemini' AND isactive = true LIMIT 1`,
      );
      if (rows[0]?.apikey) {
        apiKey = rows[0].apikey;
      }
    } catch {
      // DB read failed, fall through to env
    }

    if (!apiKey) {
      apiKey = process.env.GEMINI_API_KEY || '';
    }

    return { apiKey, model, temperature, maxTokens };
  }
}

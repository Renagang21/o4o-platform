import type { DataSource, Repository } from 'typeorm';
import { GeminiProvider } from '@o4o/ai-core';
import type { AIProviderConfig } from '@o4o/ai-core';
import { ProductAiContent } from '../entities/product-ai-content.entity.js';
import type { ProductAiContentType } from '../entities/product-ai-content.entity.js';
import { AiModelSetting } from '../../care/entities/ai-model-setting.entity.js';

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

export interface ProductContentInput {
  id: string;
  regulatoryName: string;
  marketingName: string;
  specification?: string | null;
  categoryName?: string | null;
  brandName?: string | null;
  manufacturerName: string;
  tags?: string[];
  ocrText?: string | null;
}

// ─── Prompt Templates ──────────────────────────────────────────────

const PROMPTS: Record<ProductAiContentType, { system: string; user: (p: ProductContentInput) => string }> = {
  product_description: {
    system: `당신은 약국/건강기능식품 전문 상품 설명 작성 전문가입니다.

역할:
- 상품 정보를 기반으로 소비자 대상 상품 설명을 작성합니다.
- 약국 매장에서 사용할 수 있는 자연스럽고 신뢰감 있는 설명입니다.

출력 형식 (반드시 아래 JSON만 출력):
{
  "content": "생성된 상품 설명 텍스트"
}

규칙:
- 반드시 위 JSON 형식만 출력하세요.
- 100자~300자 사이로 작성하세요.
- 건강기능식품 광고 심의 기준을 준수하세요 (과대 광고 금지).
- 소비자가 이해하기 쉬운 한국어로 작성하세요.
- 핵심 효능, 성분, 복용 대상을 포함하세요.`,
    user: (p) => buildUserPrompt(p, '상품 설명'),
  },

  pop_short: {
    system: `당신은 약국 매장 POP(Point of Purchase) 문구 전문가입니다.

역할:
- 매장 진열대에 부착할 짧은 POP 문구를 작성합니다.
- 고객의 시선을 끄는 간결하고 임팩트 있는 문구입니다.

출력 형식 (반드시 아래 JSON만 출력):
{
  "content": "POP 짧은 문구"
}

규칙:
- 반드시 위 JSON 형식만 출력하세요.
- 10자~25자 사이로 작성하세요.
- 핵심 효능 또는 특징 1가지를 강조하세요.
- 소비자가 즉시 이해할 수 있는 표현을 사용하세요.
- 건강기능식품일 경우 기능 중심으로 작성하세요.`,
    user: (p) => buildUserPrompt(p, 'POP 짧은 문구'),
  },

  pop_long: {
    system: `당신은 약국 매장 POP(Point of Purchase) 문구 전문가입니다.

역할:
- 매장 진열대에 부착할 상세 POP 문구를 작성합니다.
- 짧은 문구보다 상세하게 효능과 특징을 설명합니다.

출력 형식 (반드시 아래 JSON만 출력):
{
  "content": "POP 상세 문구"
}

규칙:
- 반드시 위 JSON 형식만 출력하세요.
- 30자~80자 사이로 작성하세요.
- 핵심 효능, 성분, 복용 방법을 포함하세요.
- 건강기능식품 광고 심의 기준을 준수하세요.
- 소비자 친화적 한국어로 작성하세요.`,
    user: (p) => buildUserPrompt(p, 'POP 상세 문구'),
  },

  qr_description: {
    system: `당신은 QR 랜딩 페이지 상품 설명 전문가입니다.

역할:
- QR 코드 스캔 후 표시되는 상품 설명을 작성합니다.
- 모바일 화면에 최적화된 간결한 설명입니다.

출력 형식 (반드시 아래 JSON만 출력):
{
  "content": "QR 랜딩 설명 텍스트"
}

규칙:
- 반드시 위 JSON 형식만 출력하세요.
- 50자~150자 사이로 작성하세요.
- 모바일에서 읽기 쉽게 짧은 문장으로 구성하세요.
- 핵심 효능과 특징을 먼저 배치하세요.
- 관심 요청(구매 의향)을 유도하는 표현을 포함하세요.`,
    user: (p) => buildUserPrompt(p, 'QR 랜딩 설명'),
  },

  signage_text: {
    system: `당신은 디지털 사이니지 콘텐츠 전문가입니다.

역할:
- 매장 디지털 디스플레이에 표시할 상품 문구를 작성합니다.
- 멀리서도 읽을 수 있는 큰 글씨 기준 짧은 문구입니다.

출력 형식 (반드시 아래 JSON만 출력):
{
  "content": "사이니지 표시 문구"
}

규칙:
- 반드시 위 JSON 형식만 출력하세요.
- 15자~40자 사이로 작성하세요.
- 핵심 메시지 1가지를 강조하세요.
- 시각적으로 임팩트 있는 표현을 사용하세요.
- 한국어만 사용하세요.`,
    user: (p) => buildUserPrompt(p, '사이니지 문구'),
  },
};

function buildUserPrompt(product: ProductContentInput, purpose: string): string {
  const parts: string[] = [];
  parts.push(`[${purpose} 생성 요청]`);
  parts.push('');
  parts.push(`[상품 정보]`);
  parts.push(`- 식약처명: ${product.regulatoryName}`);
  parts.push(`- 마케팅명: ${product.marketingName}`);
  if (product.specification) parts.push(`- 규격: ${product.specification}`);
  if (product.categoryName) parts.push(`- 카테고리: ${product.categoryName}`);
  if (product.brandName) parts.push(`- 브랜드: ${product.brandName}`);
  parts.push(`- 제조사: ${product.manufacturerName}`);
  if (product.tags && product.tags.length > 0) {
    parts.push(`- 태그: ${product.tags.join(', ')}`);
  }
  if (product.ocrText && product.ocrText.trim().length > 0) {
    parts.push('');
    parts.push(`[OCR 텍스트 (제품 이미지에서 추출)]`);
    parts.push(product.ocrText.trim().slice(0, 500));
  }
  return parts.join('\n');
}

// ─── Service ────────────────────────────────────────────────────────

interface LlmContentResponse {
  content: string;
}

export class ProductAiContentService {
  private contentRepo: Repository<ProductAiContent>;
  private settingRepo: Repository<AiModelSetting>;
  private gemini: GeminiProvider;

  constructor(private dataSource: DataSource) {
    this.contentRepo = dataSource.getRepository(ProductAiContent);
    this.settingRepo = dataSource.getRepository(AiModelSetting);
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

      const prompt = PROMPTS[contentType];
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
    const setting = await this.settingRepo.findOne({ where: { service: 'store' } });
    const model = setting?.model || 'gemini-3.0-flash';
    const temperature = setting ? Number(setting.temperature) : 0.3;
    const maxTokens = setting?.maxTokens || 2048;

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

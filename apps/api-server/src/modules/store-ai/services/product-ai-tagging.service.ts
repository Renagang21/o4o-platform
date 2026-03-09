import type { DataSource, Repository } from 'typeorm';
import { GeminiProvider } from '@o4o/ai-core';
import type { AIProviderConfig } from '@o4o/ai-core';
import { ProductAiTag } from '../entities/product-ai-tag.entity.js';
import { AiModelSetting } from '../../care/entities/ai-model-setting.entity.js';
import { ProductMaster } from '../../neture/entities/ProductMaster.entity.js';

/**
 * ProductAiTaggingService — WO-O4O-PRODUCT-AI-TAGGING-V1
 *
 * 상품 마스터 정보를 기반으로 LLM이 검색용 태그를 자동 생성.
 *
 * 핵심 원칙:
 * - LLM = 태그 추천 (자동 상품 변경 금지)
 * - fire-and-forget: 실패해도 상품 데이터에 영향 없음
 * - product_ai_tags 저장 + product_masters.tags 동기화
 * - 1회 retry (2초 delay) — Store AI 패턴
 */

const RETRY_DELAY_MS = 2_000;
const MAX_ATTEMPTS = 2;

const SYSTEM_PROMPT = `당신은 건강기능식품 및 의약품 상품 태그 생성 전문가입니다.

역할:
- 상품 정보(이름, 규격, 카테고리, 브랜드, 제조사)를 분석하여 검색용 태그를 생성합니다.
- 태그는 효능, 성분, 용도, 대상, 형태를 중심으로 생성합니다.
- 자동으로 상품을 수정하거나 가격을 변경하지 않습니다. 태그 추천만 합니다.

출력 형식 (반드시 아래 JSON만 출력):
{
  "tags": [
    { "tag": "태그명", "confidence": 0.92 }
  ]
}

규칙:
- 반드시 위 JSON 형식만 출력하세요. JSON 외의 텍스트를 포함하지 마세요.
- 태그 3~8개를 생성하세요.
- confidence는 0.0~1.0 사이 값 (해당 태그가 상품에 적합한 정도).
- 한국어 태그만 생성하세요.
- 다음 카테고리의 태그를 고려하세요:
  - 효능/기능: 혈당관리, 면역력, 장건강, 피로회복, 뼈건강 등
  - 성분: 비타민D, 유산균, 오메가3, 프로바이오틱스 등
  - 용도/대상: 성인, 어린이, 노년, 다이어트, 운동 등
  - 형태: 정제, 캡슐, 분말, 액상, 젤리 등
  - 브랜드/제조사 특성: 해당되면 포함`;

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
  private settingRepo: Repository<AiModelSetting>;
  private gemini: GeminiProvider;

  constructor(private dataSource: DataSource) {
    this.tagRepo = dataSource.getRepository(ProductAiTag);
    this.masterRepo = dataSource.getRepository(ProductMaster);
    this.settingRepo = dataSource.getRepository(AiModelSetting);
    this.gemini = new GeminiProvider();
  }

  /**
   * Fire-and-forget: generate AI tags for a product and sync to product_masters.tags.
   */
  async generateTags(product: ProductTagInput): Promise<void> {
    try {
      const config = await this.buildProviderConfig();

      if (!config.apiKey) {
        console.warn('[ProductAiTag] No API key configured, skipping tag generation');
        return;
      }

      const userPrompt = this.buildUserPrompt(product);

      // Retry loop
      let lastError: unknown = null;
      for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
        try {
          const response = await this.gemini.complete(SYSTEM_PROMPT, userPrompt, config);
          const parsed = JSON.parse(response.content) as LlmTagResponse;

          if (!parsed.tags || !Array.isArray(parsed.tags) || parsed.tags.length === 0) {
            console.error('[ProductAiTag] Invalid LLM response: missing tags', {
              productId: product.id,
              content: response.content.slice(0, 200),
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
              model: response.model,
            }),
          );
          await this.tagRepo.save(newTags);

          // product_masters.tags 동기화
          await this.syncMasterTags(product.id);

          return; // success
        } catch (err) {
          lastError = err;
          const msg = err instanceof Error ? err.message : String(err);

          // Non-retryable
          if (msg.includes('not configured') || msg.includes('INVALID_ARGUMENT')) {
            console.error('[ProductAiTag] non-retryable error:', { productId: product.id, error: msg });
            return;
          }

          // Retryable
          if (attempt < MAX_ATTEMPTS) {
            console.warn(`[ProductAiTag] attempt ${attempt} failed, retrying in ${RETRY_DELAY_MS}ms:`, msg);
            await new Promise((r) => setTimeout(r, RETRY_DELAY_MS));
          }
        }
      }

      const errMsg = lastError instanceof Error ? lastError.message : String(lastError);
      console.error('[ProductAiTag] generation failed after all attempts:', {
        productId: product.id,
        attempts: MAX_ATTEMPTS,
        lastError: errMsg,
      });
    } catch (error) {
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

  private async buildProviderConfig(): Promise<AIProviderConfig> {
    const setting = await this.settingRepo.findOne({ where: { service: 'store' } });
    const model = setting?.model || 'gemini-2.0-flash';
    const temperature = setting ? Number(setting.temperature) : 0.3;
    const maxTokens = setting?.maxTokens || 1024;

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

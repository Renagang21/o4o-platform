import type { DataSource, Repository } from 'typeorm';
import { ProductOcrText } from '../entities/product-ocr-text.entity.js';
import logger from '../../../utils/logger.js';

/**
 * ProductOcrService — WO-O4O-PRODUCT-AI-CONTENT-PIPELINE-V1
 *
 * Product Image → Google Vision API (REST) → OCR Text 추출 → product_ocr_texts 저장.
 *
 * 핵심 원칙:
 * - fire-and-forget: 실패해도 상품 데이터에 영향 없음
 * - Cloud Run ADC (Application Default Credentials) 사용
 * - 대표 이미지(is_primary) 제외, sort_order > 0인 이미지 대상
 * - GCS URL에서 직접 Vision API 호출 (imageUri)
 */

const VISION_API_URL = 'https://vision.googleapis.com/v1/images:annotate';
const REQUEST_TIMEOUT_MS = 15_000;

export class ProductOcrService {
  private ocrRepo: Repository<ProductOcrText>;

  constructor(private dataSource: DataSource) {
    this.ocrRepo = dataSource.getRepository(ProductOcrText);
  }

  /**
   * 특정 이미지에 대해 OCR 수행 후 결과 저장.
   * GCS public URL 또는 gs:// 경로 모두 지원.
   */
  async extractAndSave(
    productId: string,
    imageId: string,
    imageUrl: string,
  ): Promise<ProductOcrText | null> {
    try {
      const accessToken = await this.getAccessToken();
      if (!accessToken) {
        logger.warn('[ProductOcr] No access token available, skipping OCR');
        return null;
      }

      const ocrResult = await this.callVisionApi(imageUrl, accessToken);
      if (!ocrResult) {
        logger.info(`[ProductOcr] No text detected in image ${imageId}`);
        return null;
      }

      // upsert: 같은 image_id면 교체
      const existing = await this.ocrRepo.findOne({ where: { imageId } });
      if (existing) {
        existing.ocrText = ocrResult.text;
        existing.confidence = ocrResult.confidence;
        return await this.ocrRepo.save(existing);
      }

      const entity = this.ocrRepo.create({
        productId,
        imageId,
        ocrText: ocrResult.text,
        confidence: ocrResult.confidence,
      });
      return await this.ocrRepo.save(entity);
    } catch (error) {
      logger.error('[ProductOcr] OCR extraction failed:', error);
      return null;
    }
  }

  /**
   * 특정 상품의 모든 비대표 이미지에 대해 OCR 수행.
   */
  async extractAllForProduct(productId: string): Promise<ProductOcrText[]> {
    try {
      const images = await this.dataSource.query(
        `SELECT id, image_url
         FROM product_images
         WHERE master_id = $1
           AND is_primary = false
         ORDER BY sort_order ASC`,
        [productId],
      );

      const results: ProductOcrText[] = [];
      for (const img of images) {
        const result = await this.extractAndSave(productId, img.id, img.image_url);
        if (result) results.push(result);
      }
      return results;
    } catch (error) {
      logger.error('[ProductOcr] extractAllForProduct failed:', error);
      return [];
    }
  }

  /**
   * 특정 상품의 OCR 텍스트 전체 조회.
   */
  async getOcrTextsByProduct(productId: string): Promise<ProductOcrText[]> {
    return this.ocrRepo.find({
      where: { productId },
      order: { createdAt: 'ASC' },
    });
  }

  /**
   * 특정 상품의 OCR 텍스트를 연결된 문자열로 반환 (AI 프롬프트용).
   */
  async getCombinedOcrText(productId: string): Promise<string> {
    const texts = await this.ocrRepo.find({
      where: { productId },
      order: { createdAt: 'ASC' },
    });

    return texts
      .filter((t) => t.ocrText && t.ocrText.trim().length > 0)
      .map((t) => t.ocrText!.trim())
      .join('\n');
  }

  // ─── Google Vision API ─────────────────────────────────────────

  private async callVisionApi(
    imageUrl: string,
    accessToken: string,
  ): Promise<{ text: string; confidence: number } | null> {
    const body = {
      requests: [{
        image: { source: { imageUri: imageUrl } },
        features: [{ type: 'TEXT_DETECTION', maxResults: 1 }],
      }],
    };

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    try {
      const response = await fetch(VISION_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      });

      if (!response.ok) {
        const errText = await response.text().catch(() => '');
        logger.error(`[ProductOcr] Vision API error ${response.status}: ${errText.slice(0, 300)}`);
        return null;
      }

      const data = await response.json() as VisionApiResponse;
      const annotation = data.responses?.[0]?.fullTextAnnotation;
      if (!annotation?.text) {
        return null;
      }

      // 전체 텍스트의 confidence (페이지 레벨 평균)
      const pages = annotation.pages || [];
      let totalConfidence = 0;
      let blockCount = 0;
      for (const page of pages) {
        for (const block of page.blocks || []) {
          if (block.confidence != null) {
            totalConfidence += block.confidence;
            blockCount++;
          }
        }
      }
      const avgConfidence = blockCount > 0 ? totalConfidence / blockCount : 0;

      return {
        text: annotation.text,
        confidence: Math.round(avgConfidence * 100) / 100,
      };
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        logger.error(`[ProductOcr] Vision API timeout after ${REQUEST_TIMEOUT_MS}ms`);
      } else {
        logger.error('[ProductOcr] Vision API call failed:', error);
      }
      return null;
    } finally {
      clearTimeout(timeout);
    }
  }

  /**
   * Cloud Run ADC로 access token 획득.
   * 로컬: GOOGLE_APPLICATION_CREDENTIALS 또는 gcloud auth.
   * Cloud Run: metadata server에서 자동 획득.
   */
  private async getAccessToken(): Promise<string | null> {
    // 1. 환경변수에서 직접 설정 (테스트용)
    const envToken = process.env.GOOGLE_VISION_ACCESS_TOKEN;
    if (envToken) return envToken;

    // 2. Cloud Run metadata server (ADC)
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 3_000);

      const response = await fetch(
        'http://metadata.google.internal/computeMetadata/v1/instance/service-accounts/default/token',
        {
          headers: { 'Metadata-Flavor': 'Google' },
          signal: controller.signal,
        },
      );

      clearTimeout(timeout);

      if (response.ok) {
        const data = await response.json() as { access_token: string };
        return data.access_token;
      }
    } catch {
      // Not on Cloud Run, try next method
    }

    // 3. gcloud CLI (로컬 개발)
    try {
      const { execSync } = await import('child_process');
      const token = execSync('gcloud auth print-access-token', { encoding: 'utf-8' }).trim();
      if (token) return token;
    } catch {
      // gcloud not available
    }

    logger.warn('[ProductOcr] No access token method available');
    return null;
  }
}

// ─── Vision API Response Types ──────────────────────────────────

interface VisionApiResponse {
  responses?: Array<{
    fullTextAnnotation?: {
      text: string;
      pages?: Array<{
        blocks?: Array<{
          confidence?: number;
        }>;
      }>;
    };
  }>;
}
